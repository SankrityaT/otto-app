import { db, newId, now } from "../db";
import { RUNS_TO_FADE } from "../help";
import { REACTIONS, WORK_STYLES, type Reaction } from "../raftWords";
import { getStudent } from "./crew";

// The raft's social side: posts (wins and help asks), replies, reactions and profiles.
// Everything stays inside one raft. Posts and replies are checked by Ayin before they are
// saved (see lib/ai/moderate.ts), and anyone can report a post for staff to look at.

export { REACTIONS, WORK_STYLES, type Reaction } from "../raftWords";
export type PostKind = "win" | "ask";

export interface Post {
  id: string;
  kind: PostKind;
  author: { id: string; name: string; furHue: number };
  body: string;
  photo: string | null;
  step: { id: string; text: string } | null;
  taskTitle: string | null;
  createdAt: string;
  reactions: { kind: Reaction; names: string[]; mine: boolean }[];
  replyCount: number;
  /** For help asks: this student has done the step on their own enough to help. */
  youKnowThis: boolean;
  /** For help asks: someone's answer was marked "This helped". */
  helped: boolean;
}

export interface Reply {
  id: string;
  author: { id: string; name: string; furHue: number };
  body: string;
  photo: string | null;
  /** A step whose 3D model the helper shared, so both can turn it. */
  sceneStep: { id: string; text: string } | null;
  helped: boolean;
  /** How many times the author has done the asked-about step on their own. */
  timesOnOwn: number;
  createdAt: string;
}

export interface Profile {
  id: string;
  name: string;
  furHue: number;
  raftName: string | null;
  goal: { text: string; taskTitle: string | null } | null;
  workStyle: string[];
  canHelpWith: string[];
  learning: { title: string; stage: number }[];
  helpedCount: number;
  /** True if the person looking has blocked this student. */
  blockedByViewer: boolean;
}

type PostRow = {
  id: string;
  crewId: string;
  kind: PostKind;
  authorId: string;
  name: string;
  furHue: number;
  body: string;
  photo: string | null;
  stepId: string | null;
  stepText: string | null;
  taskTitle: string | null;
  createdAt: string;
  replyCount: number;
  helped: number;
};

const POST_SELECT = `
  SELECT p.id, p.crew_id AS crewId, p.kind, p.author_id AS authorId, s.name, s.fur_hue AS furHue, p.body, p.photo,
         p.step_id AS stepId, st.text AS stepText, p.task_title AS taskTitle, p.created_at AS createdAt,
         (SELECT COUNT(*) FROM replies r WHERE r.post_id = p.id AND r.status = 'shown') AS replyCount,
         EXISTS (SELECT 1 FROM replies r WHERE r.post_id = p.id AND r.helped = 1) AS helped
  FROM posts p JOIN students s ON s.id = p.author_id LEFT JOIN steps st ON st.id = p.step_id`;

/** Students hidden from this viewer: people they blocked, and people who blocked them. */
export function hiddenFrom(viewerId: string): Set<string> {
  const rows = db
    .prepare(
      `SELECT blocked_id AS id FROM blocks WHERE blocker_id = ?
       UNION SELECT blocker_id AS id FROM blocks WHERE blocked_id = ?`,
    )
    .all(viewerId, viewerId) as { id: string }[];
  return new Set(rows.map((r) => r.id));
}

export function setBlocked(blockerId: string, blockedId: string, blocked: boolean): boolean {
  if (blockerId === blockedId || !getStudent(blockerId) || !getStudent(blockedId)) return false;
  if (blocked) {
    db.prepare("INSERT OR IGNORE INTO blocks (blocker_id, blocked_id, created_at) VALUES (?, ?, ?)").run(blockerId, blockedId, now());
  } else {
    db.prepare("DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?").run(blockerId, blockedId);
  }
  return true;
}

/** Times a student has done a step with no help. */
function timesOnOwn(studentId: string, stepId: string): number {
  const row = db
    .prepare("SELECT COUNT(*) AS n FROM step_logs WHERE student_id = ? AND step_id = ? AND help_level = 0")
    .get(studentId, stepId) as { n: number };
  return row.n;
}

function toPost(row: PostRow, viewerId: string): Post {
  const reactions = db
    .prepare(
      `SELECT x.kind, s.name, x.from_id AS fromId FROM reactions x JOIN students s ON s.id = x.from_id
       WHERE x.post_id = ? ORDER BY x.created_at`,
    )
    .all(row.id) as { kind: Reaction; name: string; fromId: string }[];
  return {
    id: row.id,
    kind: row.kind,
    author: { id: row.authorId, name: row.name, furHue: row.furHue },
    body: row.body,
    photo: row.photo,
    step: row.stepId ? { id: row.stepId, text: row.stepText ?? "" } : null,
    taskTitle: row.taskTitle,
    createdAt: row.createdAt,
    reactions: REACTIONS.map((kind) => {
      const of = reactions.filter((r) => r.kind === kind);
      return { kind, names: of.map((r) => r.name), mine: of.some((r) => r.fromId === viewerId) };
    }).filter((r) => r.names.length > 0),
    replyCount: row.replyCount,
    youKnowThis:
      row.kind === "ask" && row.stepId !== null && row.authorId !== viewerId && timesOnOwn(viewerId, row.stepId) >= RUNS_TO_FADE,
    helped: Boolean(row.helped),
  };
}

/** The raft's posts, newest first. Only shown posts, only this student's raft. */
export function feed(viewerId: string, kind: PostKind | null): Post[] {
  const viewer = getStudent(viewerId);
  if (!viewer?.crewId) return [];
  const rows = db
    .prepare(
      `${POST_SELECT} WHERE p.crew_id = ? AND p.status = 'shown' ${kind ? "AND p.kind = ?" : ""}
       ORDER BY p.created_at DESC LIMIT 50`,
    )
    .all(...(kind ? [viewer.crewId, kind] : [viewer.crewId])) as unknown as PostRow[];
  const hidden = hiddenFrom(viewerId);
  return rows.filter((row) => !hidden.has(row.authorId)).map((row) => toPost(row, viewerId));
}

export function getPost(postId: string, viewerId: string): { post: Post; replies: Reply[] } | null {
  const viewer = getStudent(viewerId);
  const row = db.prepare(`${POST_SELECT} WHERE p.id = ? AND p.status = 'shown'`).get(postId) as unknown as
    | PostRow
    | undefined;
  const hidden = hiddenFrom(viewerId);
  if (!row || !viewer || row.crewId !== viewer.crewId || hidden.has(row.authorId)) return null;
  const replies = db
    .prepare(
      `SELECT r.id, r.author_id AS authorId, s.name, s.fur_hue AS furHue, r.body, r.photo, r.helped, r.created_at AS createdAt,
              r.scene_step_id AS sceneStepId, st.text AS sceneStepText
       FROM replies r JOIN students s ON s.id = r.author_id LEFT JOIN steps st ON st.id = r.scene_step_id
       WHERE r.post_id = ? AND r.status = 'shown' ORDER BY r.created_at`,
    )
    .all(postId) as {
    id: string;
    authorId: string;
    name: string;
    furHue: number;
    body: string;
    photo: string | null;
    helped: number;
    createdAt: string;
    sceneStepId: string | null;
    sceneStepText: string | null;
  }[];
  return {
    post: toPost(row, viewerId),
    replies: replies.filter((r) => !hidden.has(r.authorId)).map((r) => ({
      id: r.id,
      author: { id: r.authorId, name: r.name, furHue: r.furHue },
      body: r.body,
      photo: r.photo,
      sceneStep: r.sceneStepId ? { id: r.sceneStepId, text: r.sceneStepText ?? "" } : null,
      helped: Boolean(r.helped),
      timesOnOwn: row.stepId ? timesOnOwn(r.authorId, row.stepId) : 0,
      createdAt: r.createdAt,
    })),
  };
}

export function createPost(input: {
  authorId: string;
  kind: PostKind;
  body: string;
  photo: string | null;
  stepId: string | null;
}): string | null {
  const author = getStudent(input.authorId);
  if (!author?.crewId) return null;
  const step = input.stepId
    ? (db
        .prepare("SELECT s.id, r.title FROM steps s JOIN routines r ON r.id = s.routine_id WHERE s.id = ?")
        .get(input.stepId) as { id: string; title: string } | undefined)
    : undefined;
  const id = newId();
  db.prepare(
    `INSERT INTO posts (id, crew_id, author_id, kind, body, photo, step_id, task_title, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'shown', ?)`,
  ).run(id, author.crewId, author.id, input.kind, input.body, input.photo, step?.id ?? null, step?.title ?? null, now());
  return id;
}

export function addReply(
  postId: string,
  authorId: string,
  body: string,
  extras: { photo?: string | null; sceneStepId?: string | null } = {},
): boolean {
  // getPost is null when the post is gone, in another raft, or either person blocked the other.
  if (!getPost(postId, authorId)) return false;
  db.prepare(
    `INSERT INTO replies (id, post_id, author_id, body, photo, scene_step_id, helped, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, 'shown', ?)`,
  ).run(newId(), postId, authorId, body, extras.photo ?? null, extras.sceneStepId ?? null, now());
  return true;
}

/** Only the person who asked can say an answer helped. */
export function markHelped(replyId: string, studentId: string): boolean {
  return (
    db
      .prepare(
        `UPDATE replies SET helped = 1 WHERE id = ?
         AND post_id IN (SELECT id FROM posts WHERE author_id = ? AND kind = 'ask')`,
      )
      .run(replyId, studentId).changes > 0
  );
}

/** Add or take back a reaction. */
export function toggleReaction(postId: string, studentId: string, kind: Reaction): boolean {
  if (!REACTIONS.includes(kind) || !getPost(postId, studentId)) return false;
  const removed = db.prepare("DELETE FROM reactions WHERE post_id = ? AND from_id = ? AND kind = ?").run(postId, studentId, kind);
  if (removed.changes === 0) {
    db.prepare("INSERT INTO reactions (post_id, from_id, kind, created_at) VALUES (?, ?, ?, ?)").run(postId, studentId, kind, now());
  }
  return true;
}

/** A report hides the post right away and leaves it for staff to review. */
export function reportPost(postId: string, studentId: string): boolean {
  if (!getPost(postId, studentId)) return false;
  db.prepare("UPDATE posts SET status = 'reported' WHERE id = ?").run(postId);
  db.prepare("INSERT INTO reports (id, post_id, from_id, created_at) VALUES (?, ?, ?, ?)").run(newId(), postId, studentId, now());
  return true;
}

export function profile(studentId: string, viewerId = ""): Profile | null {
  const row = db
    .prepare(
      `SELECT s.id, s.name, s.fur_hue AS furHue, s.goal, s.work_style AS workStyle, c.name AS raftName,
              r.title AS goalTask
       FROM students s LEFT JOIN crews c ON c.id = s.crew_id LEFT JOIN routines r ON r.id = s.goal_routine_id
       WHERE s.id = ?`,
    )
    .get(studentId) as
    | { id: string; name: string; furHue: number; goal: string | null; workStyle: string | null; raftName: string | null; goalTask: string | null }
    | undefined;
  if (!row) return null;

  // Tasks done fully on their own in recent runs are things they can help with; the rest they're learning.
  const tasks = db
    .prepare(
      `SELECT rt.title,
              SUM(CASE WHEN x.onOwn = x.total THEN 1 ELSE 0 END) AS aloneRuns, COUNT(*) AS runs
       FROM (SELECT r.routine_id, COUNT(l.id) AS total, SUM(l.help_level = 0) AS onOwn
             FROM runs r JOIN step_logs l ON l.run_id = r.id
             WHERE r.student_id = ? AND r.finished_at IS NOT NULL GROUP BY r.id) x
       JOIN routines rt ON rt.id = x.routine_id GROUP BY rt.id ORDER BY rt.title`,
    )
    .all(studentId) as { title: string; aloneRuns: number; runs: number }[];

  const helped = db
    .prepare(
      `SELECT COUNT(*) AS n FROM replies r WHERE r.author_id = ? AND r.helped = 1 AND r.created_at >= ?`,
    )
    .get(studentId, new Date(Date.now() - 30 * 86_400_000).toISOString()) as { n: number };

  return {
    id: row.id,
    name: row.name,
    furHue: row.furHue,
    raftName: row.raftName,
    goal: row.goal ? { text: row.goal, taskTitle: row.goalTask } : null,
    workStyle: row.workStyle ? (JSON.parse(row.workStyle) as string[]) : [],
    canHelpWith: tasks.filter((t) => t.aloneRuns >= 1).map((t) => t.title),
    learning: tasks.filter((t) => t.aloneRuns === 0).map((t) => ({ title: t.title, stage: Math.min(t.runs + 1, 4) })),
    helpedCount: helped.n,
    blockedByViewer: Boolean(
      db.prepare("SELECT 1 FROM blocks WHERE blocker_id = ? AND blocked_id = ?").get(viewerId, studentId),
    ),
  };
}

/** Students set their own goal and how they work best. Only listed phrases are allowed. */
export function updateProfile(studentId: string, change: { goal?: string | null; goalRoutineId?: string | null; workStyle?: string[] }): boolean {
  if (!getStudent(studentId)) return false;
  if (change.goal !== undefined) {
    const goal = change.goal?.trim().slice(0, 120) || null;
    db.prepare("UPDATE students SET goal = ?, goal_routine_id = ? WHERE id = ?").run(goal, change.goalRoutineId ?? null, studentId);
  }
  if (change.workStyle) {
    const allowed = change.workStyle.filter((w) => (WORK_STYLES as readonly string[]).includes(w));
    db.prepare("UPDATE students SET work_style = ? WHERE id = ?").run(JSON.stringify(allowed), studentId);
  }
  return true;
}
