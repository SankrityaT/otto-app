import { all, newId, now, one, run } from "../db";
import { RUNS_TO_FADE } from "../help";
import { REACTIONS, WORK_STYLES, type Reaction } from "../raftWords";
import { getStudent } from "./crew";

// The raft's social side: posts (wins and help asks), replies, reactions and profiles.
// Everything stays inside one raft. Posts and replies are checked by Ayin before they are
// saved (see lib/ai/moderate.ts), and anyone can report a post for staff to look at.

export { WORK_STYLES, type Reaction } from "../raftWords";
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
  helped: boolean;
};

const POST_SELECT = `
  SELECT p.id, p.crew_id AS "crewId", p.kind, p.author_id AS "authorId", s.name, s.fur_hue AS "furHue", p.body, p.photo,
         p.step_id AS "stepId", st.text AS "stepText", p.task_title AS "taskTitle", p.created_at AS "createdAt",
         (SELECT COUNT(*) FROM replies r WHERE r.post_id = p.id AND r.status = 'shown') AS "replyCount",
         EXISTS (SELECT 1 FROM replies r WHERE r.post_id = p.id AND r.helped = 1) AS helped
  FROM posts p JOIN students s ON s.id = p.author_id LEFT JOIN steps st ON st.id = p.step_id`;

/** Students hidden from this viewer: people they blocked, and people who blocked them. */
export async function hiddenFrom(viewerId: string): Promise<Set<string>> {
  const rows = await all<{ id: string }>(
    `SELECT blocked_id AS id FROM blocks WHERE blocker_id = ?
     UNION SELECT blocker_id AS id FROM blocks WHERE blocked_id = ?`,
    viewerId,
    viewerId,
  );
  return new Set(rows.map((r) => r.id));
}

export async function setBlocked(blockerId: string, blockedId: string, blocked: boolean): Promise<boolean> {
  if (blockerId === blockedId || !(await getStudent(blockerId)) || !(await getStudent(blockedId))) return false;
  if (blocked) {
    await run("INSERT INTO blocks (blocker_id, blocked_id, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING", blockerId, blockedId, now());
  } else {
    await run("DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?", blockerId, blockedId);
  }
  return true;
}

/** Times a student has done a step with no help. */
async function timesOnOwn(studentId: string, stepId: string): Promise<number> {
  const row = await one<{ n: number }>(
    "SELECT COUNT(*) AS n FROM step_logs WHERE student_id = ? AND step_id = ? AND help_level = 0",
    studentId,
    stepId,
  );
  return row?.n ?? 0;
}

async function toPost(row: PostRow, viewerId: string): Promise<Post> {
  const reactions = await all<{ kind: Reaction; name: string; fromId: string }>(
    `SELECT x.kind, s.name, x.from_id AS "fromId" FROM reactions x JOIN students s ON s.id = x.from_id
     WHERE x.post_id = ? ORDER BY x.created_at`,
    row.id,
  );
  const canHelp =
    row.kind === "ask" && row.stepId !== null && row.authorId !== viewerId && (await timesOnOwn(viewerId, row.stepId)) >= RUNS_TO_FADE;
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
    youKnowThis: canHelp,
    helped: row.helped,
  };
}

/** The raft's posts, newest first. Only shown posts, only this student's raft. */
export async function feed(viewerId: string, kind: PostKind | null): Promise<Post[]> {
  const viewer = await getStudent(viewerId);
  if (!viewer?.crewId) return [];
  const [rows, hidden] = await Promise.all([
    all<PostRow>(
      `${POST_SELECT} WHERE p.crew_id = ? AND p.status = 'shown' ${kind ? "AND p.kind = ?" : ""}
       ORDER BY p.created_at DESC LIMIT 50`,
      ...(kind ? [viewer.crewId, kind] : [viewer.crewId]),
    ),
    hiddenFrom(viewerId),
  ]);
  return Promise.all(rows.filter((row) => !hidden.has(row.authorId)).map((row) => toPost(row, viewerId)));
}

export async function getPost(postId: string, viewerId: string): Promise<{ post: Post; replies: Reply[] } | null> {
  const [viewer, row, hidden] = await Promise.all([
    getStudent(viewerId),
    one<PostRow>(`${POST_SELECT} WHERE p.id = ? AND p.status = 'shown'`, postId),
    hiddenFrom(viewerId),
  ]);
  if (!row || !viewer || row.crewId !== viewer.crewId || hidden.has(row.authorId)) return null;
  const replies = await all<{
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
  }>(
    `SELECT r.id, r.author_id AS "authorId", s.name, s.fur_hue AS "furHue", r.body, r.photo, r.helped, r.created_at AS "createdAt",
            r.scene_step_id AS "sceneStepId", st.text AS "sceneStepText"
     FROM replies r JOIN students s ON s.id = r.author_id LEFT JOIN steps st ON st.id = r.scene_step_id
     WHERE r.post_id = ? AND r.status = 'shown' ORDER BY r.created_at`,
    postId,
  );
  return {
    post: await toPost(row, viewerId),
    replies: await Promise.all(
      replies
        .filter((r) => !hidden.has(r.authorId))
        .map(async (r) => ({
          id: r.id,
          author: { id: r.authorId, name: r.name, furHue: r.furHue },
          body: r.body,
          photo: r.photo,
          sceneStep: r.sceneStepId ? { id: r.sceneStepId, text: r.sceneStepText ?? "" } : null,
          helped: Boolean(r.helped),
          timesOnOwn: row.stepId ? await timesOnOwn(r.authorId, row.stepId) : 0,
          createdAt: r.createdAt,
        })),
    ),
  };
}

export async function createPost(input: {
  authorId: string;
  kind: PostKind;
  body: string;
  photo: string | null;
  stepId: string | null;
}): Promise<string | null> {
  const author = await getStudent(input.authorId);
  if (!author?.crewId) return null;
  const step = input.stepId
    ? await one<{ id: string; title: string }>(
        "SELECT s.id, r.title FROM steps s JOIN routines r ON r.id = s.routine_id WHERE s.id = ?",
        input.stepId,
      )
    : null;
  const id = newId();
  await run(
    `INSERT INTO posts (id, crew_id, author_id, kind, body, photo, step_id, task_title, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'shown', ?)`,
    id,
    author.crewId,
    author.id,
    input.kind,
    input.body,
    input.photo,
    step?.id ?? null,
    step?.title ?? null,
    now(),
  );
  return id;
}

export async function addReply(
  postId: string,
  authorId: string,
  body: string,
  extras: { photo?: string | null; sceneStepId?: string | null } = {},
): Promise<boolean> {
  // getPost is null when the post is gone, in another raft, or either person blocked the other.
  if (!(await getPost(postId, authorId))) return false;
  await run(
    `INSERT INTO replies (id, post_id, author_id, body, photo, scene_step_id, helped, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, 'shown', ?)`,
    newId(),
    postId,
    authorId,
    body,
    extras.photo ?? null,
    extras.sceneStepId ?? null,
    now(),
  );
  return true;
}

/** Only the person who asked can say an answer helped. */
export async function markHelped(replyId: string, studentId: string): Promise<boolean> {
  const changed = await run(
    `UPDATE replies SET helped = 1 WHERE id = ?
     AND post_id IN (SELECT id FROM posts WHERE author_id = ? AND kind = 'ask')`,
    replyId,
    studentId,
  );
  return changed > 0;
}

/** Add or take back a reaction. */
export async function toggleReaction(postId: string, studentId: string, kind: Reaction): Promise<boolean> {
  if (!REACTIONS.includes(kind) || !(await getPost(postId, studentId))) return false;
  const removed = await run("DELETE FROM reactions WHERE post_id = ? AND from_id = ? AND kind = ?", postId, studentId, kind);
  if (removed === 0) {
    await run("INSERT INTO reactions (post_id, from_id, kind, created_at) VALUES (?, ?, ?, ?)", postId, studentId, kind, now());
  }
  return true;
}

/** A report hides the post right away and leaves it for staff to review. */
export async function reportPost(postId: string, studentId: string): Promise<boolean> {
  if (!(await getPost(postId, studentId))) return false;
  await run("UPDATE posts SET status = 'reported' WHERE id = ?", postId);
  await run("INSERT INTO reports (id, post_id, from_id, created_at) VALUES (?, ?, ?, ?)", newId(), postId, studentId, now());
  return true;
}

export async function profile(studentId: string, viewerId = ""): Promise<Profile | null> {
  const row = await one<{
    id: string;
    name: string;
    furHue: number;
    goal: string | null;
    workStyle: string | null;
    raftName: string | null;
    goalTask: string | null;
  }>(
    `SELECT s.id, s.name, s.fur_hue AS "furHue", s.goal, s.work_style AS "workStyle", c.name AS "raftName",
            r.title AS "goalTask"
     FROM students s LEFT JOIN crews c ON c.id = s.crew_id LEFT JOIN routines r ON r.id = s.goal_routine_id
     WHERE s.id = ?`,
    studentId,
  );
  if (!row) return null;

  const [tasks, helped, blocked] = await Promise.all([
    // Tasks done fully on their own in recent runs are things they can help with; the rest they're learning.
    all<{ title: string; aloneRuns: number; runs: number }>(
      `SELECT rt.title,
              COUNT(*) FILTER (WHERE x.on_own = x.total) AS "aloneRuns", COUNT(*) AS runs
       FROM (SELECT r.routine_id, COUNT(l.id) AS total, COUNT(*) FILTER (WHERE l.help_level = 0) AS on_own
             FROM runs r JOIN step_logs l ON l.run_id = r.id
             WHERE r.student_id = ? AND r.finished_at IS NOT NULL GROUP BY r.id) x
       JOIN routines rt ON rt.id = x.routine_id GROUP BY rt.id ORDER BY rt.title`,
      studentId,
    ),
    one<{ n: number }>(
      "SELECT COUNT(*) AS n FROM replies r WHERE r.author_id = ? AND r.helped = 1 AND r.created_at >= ?",
      studentId,
      new Date(Date.now() - 30 * 86_400_000).toISOString(),
    ),
    one("SELECT 1 FROM blocks WHERE blocker_id = ? AND blocked_id = ?", viewerId, studentId),
  ]);

  return {
    id: row.id,
    name: row.name,
    furHue: row.furHue,
    raftName: row.raftName,
    goal: row.goal ? { text: row.goal, taskTitle: row.goalTask } : null,
    workStyle: row.workStyle ? (JSON.parse(row.workStyle) as string[]) : [],
    canHelpWith: tasks.filter((t) => t.aloneRuns >= 1).map((t) => t.title),
    learning: tasks.filter((t) => t.aloneRuns === 0).map((t) => ({ title: t.title, stage: Math.min(t.runs + 1, 4) })),
    helpedCount: helped?.n ?? 0,
    blockedByViewer: blocked !== null,
  };
}

/** Students set their own goal and how they work best. Only listed phrases are allowed. */
export async function updateProfile(
  studentId: string,
  change: { goal?: string | null; goalRoutineId?: string | null; workStyle?: string[] },
): Promise<boolean> {
  if (!(await getStudent(studentId))) return false;
  if (change.goal !== undefined) {
    const goal = change.goal?.trim().slice(0, 120) || null;
    await run("UPDATE students SET goal = ?, goal_routine_id = ? WHERE id = ?", goal, change.goalRoutineId ?? null, studentId);
  }
  if (change.workStyle) {
    const allowed = change.workStyle.filter((w) => (WORK_STYLES as readonly string[]).includes(w));
    await run("UPDATE students SET work_style = ? WHERE id = ?", JSON.stringify(allowed), studentId);
  }
  return true;
}
