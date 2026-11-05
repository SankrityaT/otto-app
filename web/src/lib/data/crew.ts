import { matchBuddies, type StepHistory } from "../buddies";
import { all, newId, now, one, run } from "../db";
import { RUNS_TO_FADE } from "../help";
import { ringFill, startOfWeek, stepsOnOwn, type StepLog } from "../week";

// The crew: a few students from one work site, set up by staff. Students see it as their
// "raft", the name for a group of otters floating together. A shared goal instead
// of a ranking, weekly rings instead of streaks, and preset words instead of free chat.

export interface Student {
  id: string;
  name: string;
  crewId: string | null;
  /** The student's own otter colour, as a hue shift in degrees (0 is the painted brown). */
  furHue: number;
}

export type InviteStatus = "waiting" | "yes" | "not-today";

export interface CrewView {
  name: string;
  weeklyGoal: number;
  onOwnTogether: number;
  cheers: string[];
  members: {
    id: string;
    name: string;
    furHue: number;
    ring: number;
    onOwn: number;
    /** Steps on their own that fill their ring this week. */
    target: number;
    /** The task they're doing right now, if they started one in the last few hours. */
    now: { routineId: string; title: string; done: number; total: number } | null;
    /** Their open question to the raft from the last day, if nobody has helped yet. */
    asking: { postId: string; body: string } | null;
    /** A task they finished in the last hour, to celebrate. */
    justFinished: string | null;
  }[];
  wins: {
    runId: string;
    studentId: string;
    name: string;
    furHue: number;
    title: string;
    onOwn: number;
    total: number;
    finishedAt: string;
    cheered: boolean;
    cheers: { fromName: string; phrase: string }[];
    /** Help each step took, in step order: 0 means on their own. */
    stepHelp: number[];
  }[];
  /** This student's practice buddy, or null if nobody in the crew can swap help with them yet. */
  buddy: { id: string; name: string; furHue: number; theyCanShowYou: string[]; youCanShowThem: string[] } | null;
  /** "Do it together" invites today, to or from this student, with each side's run once started. */
  invites: {
    id: string;
    fromId: string;
    fromName: string;
    toName: string;
    about: string;
    status: InviteStatus;
    fromRunId: string | null;
    toRunId: string | null;
  }[];
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
/** A task started longer ago than this counts as put down, not "doing it now". */
const NOW_MS = 3 * HOUR_MS;

type Member = CrewView["members"][number];

/** The task a student is in the middle of right now, if any. */
function workingOn(studentId: string): Promise<Member["now"]> {
  return one(
    `SELECT rt.id AS "routineId", rt.title,
            (SELECT COUNT(*) FROM step_logs l WHERE l.run_id = r.id) AS done,
            (SELECT COUNT(*) FROM steps s WHERE s.routine_id = r.routine_id) AS total
     FROM runs r JOIN routines rt ON rt.id = r.routine_id
     WHERE r.student_id = ? AND r.finished_at IS NULL AND r.started_at >= ?
     ORDER BY r.started_at DESC LIMIT 1`,
    studentId,
    new Date(Date.now() - NOW_MS).toISOString(),
  );
}

/** Their open question to the raft from the last day, if nobody has helped yet. */
function openAsk(studentId: string): Promise<Member["asking"]> {
  return one(
    `SELECT p.id AS "postId", p.body FROM posts p
     WHERE p.author_id = ? AND p.kind = 'ask' AND p.status = 'shown' AND p.created_at >= ?
       AND NOT EXISTS (SELECT 1 FROM replies r WHERE r.post_id = p.id AND r.helped = 1)
     ORDER BY p.created_at DESC LIMIT 1`,
    studentId,
    new Date(Date.now() - DAY_MS).toISOString(),
  );
}

/** A task they finished in the last hour. */
async function finishedJustNow(studentId: string): Promise<string | null> {
  const row = await one<{ title: string }>(
    `SELECT rt.title FROM runs r JOIN routines rt ON rt.id = r.routine_id
     WHERE r.student_id = ? AND r.finished_at >= ? ORDER BY r.finished_at DESC LIMIT 1`,
    studentId,
    new Date(Date.now() - HOUR_MS).toISOString(),
  );
  return row?.title ?? null;
}

const STUDENT = `SELECT id, name, crew_id AS "crewId", fur_hue AS "furHue" FROM students`;

/** Everyone in the raft a code belongs to, so a returning student can tap their own otter. */
export function raftByCode(code: string): Promise<Student[]> {
  return all(`${STUDENT} WHERE crew_id = (SELECT id FROM crews WHERE join_code = ?) ORDER BY name`, normalCode(code));
}

export function getStudent(id: string): Promise<Student | null> {
  return one(`${STUDENT} WHERE id = ?`, id);
}

/** Steps on their own that fill a new student's ring each week. */
const NEW_STUDENT_TARGET = 8;

/** Codes ignore case and spaces. */
function normalCode(code: string): string {
  return code.replace(/\s/g, "").toUpperCase();
}

/** A new student, from the welcome screen, in the raft they joined (or none yet). */
export async function addStudent(name: string, furHue: number, crewId: string | null): Promise<Student> {
  const id = newId();
  await run(
    "INSERT INTO students (id, name, crew_id, weekly_target, fur_hue) VALUES (?, ?, ?, ?, ?)",
    id,
    name,
    crewId,
    NEW_STUDENT_TARGET,
    Math.round(furHue),
  );
  return { id, name, crewId, furHue: Math.round(furHue) };
}

/** The raft a code from staff belongs to. */
export async function crewForCode(code: string): Promise<string | null> {
  const crew = await one<{ id: string }>("SELECT id FROM crews WHERE join_code = ?", normalCode(code));
  return crew?.id ?? null;
}

/** Put a student who isn't in a raft yet into one. */
export async function joinCrew(studentId: string, crewId: string): Promise<boolean> {
  return (await run("UPDATE students SET crew_id = ? WHERE id = ? AND crew_id IS NULL", crewId, studentId)) > 0;
}

/** Change the colour of a student's otter. */
export async function setFurHue(studentId: string, furHue: number): Promise<boolean> {
  const hue = Math.round(furHue);
  if (!Number.isFinite(hue) || hue < 0 || hue > 359) return false;
  return (await run("UPDATE students SET fur_hue = ? WHERE id = ?", hue, studentId)) > 0;
}

export async function crewView(studentId: string): Promise<CrewView | null> {
  const student = await getStudent(studentId);
  if (!student?.crewId) return null;
  const crewId = student.crewId;
  const weekStart = startOfWeek(new Date()).toISOString();

  const [crew, members, logs, wins, invites] = await Promise.all([
    one<{ name: string; weeklyGoal: number; cheers: string }>(
      `SELECT name, weekly_goal AS "weeklyGoal", cheers FROM crews WHERE id = ?`,
      crewId,
    ),
    all<{ id: string; name: string; furHue: number; weeklyTarget: number }>(
      `SELECT id, name, fur_hue AS "furHue", weekly_target AS "weeklyTarget" FROM students WHERE crew_id = ? ORDER BY name`,
      crewId,
    ),
    all<StepLog>(
      `SELECT l.student_id AS "studentId", l.help_level AS "helpLevel", l.done_at AS "doneAt"
       FROM step_logs l JOIN students s ON s.id = l.student_id
       WHERE s.crew_id = ? AND l.done_at >= ?`,
      crewId,
      weekStart,
    ),
    all<Omit<CrewView["wins"][number], "cheers" | "stepHelp">>(
      `SELECT r.id AS "runId", s.id AS "studentId", s.name, s.fur_hue AS "furHue", rt.title, r.finished_at AS "finishedAt",
              COUNT(*) FILTER (WHERE l.help_level = 0) AS "onOwn", COUNT(l.id) AS total,
              EXISTS (SELECT 1 FROM cheers c WHERE c.run_id = r.id AND c.from_id = ?) AS cheered
       FROM runs r
       JOIN students s ON s.id = r.student_id
       JOIN routines rt ON rt.id = r.routine_id
       JOIN step_logs l ON l.run_id = r.id
       WHERE s.crew_id = ? AND r.finished_at >= ?
       GROUP BY r.id, s.id, rt.id ORDER BY r.finished_at DESC LIMIT 8`,
      studentId,
      crewId,
      weekStart,
    ),
    all<CrewView["invites"][number]>(
      `SELECT i.id, i.from_id AS "fromId", f.name AS "fromName", t.name AS "toName", i.about, i.status,
              i.from_run_id AS "fromRunId", i.to_run_id AS "toRunId"
       FROM invites i JOIN students f ON f.id = i.from_id JOIN students t ON t.id = i.to_id
       WHERE (i.from_id = ? OR i.to_id = ?) AND i.created_at >= ? ORDER BY i.created_at DESC`,
      studentId,
      studentId,
      new Date(Date.now() - DAY_MS).toISOString(),
    ),
  ]);

  const memberStats = await Promise.all(
    members.map(async (member) => {
      const onOwn = stepsOnOwn(logs, member.id);
      const [doing, asking, justFinished] = await Promise.all([workingOn(member.id), openAsk(member.id), finishedJustNow(member.id)]);
      return {
        id: member.id,
        name: member.name,
        furHue: member.furHue,
        onOwn,
        ring: ringFill(onOwn, member.weeklyTarget),
        target: member.weeklyTarget,
        now: doing,
        asking,
        justFinished,
      };
    }),
  );

  return {
    name: crew!.name,
    weeklyGoal: crew!.weeklyGoal,
    onOwnTogether: memberStats.reduce((sum, member) => sum + member.onOwn, 0),
    cheers: JSON.parse(crew!.cheers) as string[],
    members: memberStats,
    wins: await Promise.all(
      wins.map(async (win) => ({ ...win, cheers: await cheersFor(win.runId), stepHelp: await stepHelp(win.runId) })),
    ),
    buddy: await findBuddy(studentId, members),
    invites,
  };
}

/** Cheer a crewmate's finished task. Only the crew's preset phrases are allowed. */
export async function addCheer(fromId: string, runId: string, phrase: string): Promise<boolean> {
  const view = await crewView(fromId);
  const win = view?.wins.find((w) => w.runId === runId);
  if (!view || !win || win.studentId === fromId || !view.cheers.includes(phrase)) return false;
  await run(
    "INSERT INTO cheers (id, from_id, to_id, run_id, phrase, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    newId(),
    fromId,
    win.studentId,
    runId,
    phrase,
    now(),
  );
  return true;
}

/** The crewmate who has done this step on their own most often, or null if nobody has yet. */
export async function helperFor(fromId: string, stepId: string): Promise<string | null> {
  const student = await getStudent(fromId);
  if (!student?.crewId) return null;
  const helper = await one<{ name: string }>(
    `SELECT s.name, COUNT(*) AS times
     FROM step_logs l JOIN students s ON s.id = l.student_id
     WHERE l.step_id = ? AND l.help_level = 0 AND s.crew_id = ? AND s.id != ?
     GROUP BY s.id ORDER BY times DESC LIMIT 1`,
    stepId,
    student.crewId,
    fromId,
  );
  return helper?.name ?? null;
}

/** Pair the crew into practice buddies and return this student's buddy. */
async function findBuddy(studentId: string, members: { id: string; name: string; furHue: number }[]): Promise<CrewView["buddy"]> {
  const rows = await all<{ studentId: string; stepId: string; level: number }>(
    `SELECT student_id AS "studentId", step_id AS "stepId", help_level AS level
     FROM step_logs WHERE student_id IN (${members.map(() => "?").join(", ")})
     ORDER BY done_at DESC`,
    ...members.map((m) => m.id),
  );

  // Newest-first help levels per student and step, enough runs to tell mastery.
  const byKey = new Map<string, StepHistory>();
  for (const row of rows) {
    const key = `${row.studentId}:${row.stepId}`;
    const entry = byKey.get(key) ?? { studentId: row.studentId, stepId: row.stepId, levels: [] };
    if (entry.levels.length < RUNS_TO_FADE) entry.levels.push(row.level);
    byKey.set(key, entry);
  }

  const pairing = matchBuddies(
    members.map((m) => m.id),
    [...byKey.values()],
  ).find((p) => p.a === studentId || p.b === studentId);
  if (!pairing) return null;

  const isA = pairing.a === studentId;
  const buddyId = isA ? pairing.b : pairing.a;
  const stepText = async (id: string) => (await one<{ text: string }>("SELECT text FROM steps WHERE id = ?", id))?.text ?? "";
  const buddy = members.find((m) => m.id === buddyId);
  return {
    id: buddyId,
    name: buddy?.name ?? "",
    furHue: buddy?.furHue ?? 0,
    theyCanShowYou: await Promise.all((isA ? pairing.bCanShowA : pairing.aCanShowB).map(stepText)),
    youCanShowThem: await Promise.all((isA ? pairing.aCanShowB : pairing.bCanShowA).map(stepText)),
  };
}

function cheersFor(runId: string): Promise<{ fromName: string; phrase: string }[]> {
  return all(
    `SELECT s.name AS "fromName", c.phrase FROM cheers c JOIN students s ON s.id = c.from_id
     WHERE c.run_id = ? ORDER BY c.created_at`,
    runId,
  );
}

async function stepHelp(runId: string): Promise<number[]> {
  const rows = await all<{ level: number }>(
    `SELECT l.help_level AS level FROM step_logs l JOIN steps s ON s.id = l.step_id
     WHERE l.run_id = ? ORDER BY s.position`,
    runId,
  );
  return rows.map((row) => row.level);
}
