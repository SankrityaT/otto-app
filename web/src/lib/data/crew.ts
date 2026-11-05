import { matchBuddies, type StepHistory } from "../buddies";
import { db, newId, now } from "../db";
import { RUNS_TO_FADE } from "../help";
import { daysPractised, ringFill, startOfWeek, stepsOnOwn, type StepLog } from "../week";

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
    days: number;
    /** The task they're doing right now, if they started one in the last few hours. */
    now: { title: string; done: number; total: number } | null;
    /** They asked the raft for help in the last day. */
    asking: boolean;
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
  asksForMe: { id: string; fromName: string; stepText: string }[];
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

const DAY_MS = 24 * 60 * 60 * 1000;
/** A task started longer ago than this counts as put down, not "doing it now". */
const NOW_MS = 3 * 60 * 60 * 1000;

/** The task a student is in the middle of right now, if any. */
function workingOn(studentId: string): { title: string; done: number; total: number } | null {
  return (
    (db
      .prepare(
        `SELECT rt.title,
                (SELECT COUNT(*) FROM step_logs l WHERE l.run_id = r.id) AS done,
                (SELECT COUNT(*) FROM steps s WHERE s.routine_id = r.routine_id) AS total
         FROM runs r JOIN routines rt ON rt.id = r.routine_id
         WHERE r.student_id = ? AND r.finished_at IS NULL AND r.started_at >= ?
         ORDER BY r.started_at DESC LIMIT 1`,
      )
      .get(studentId, new Date(Date.now() - NOW_MS).toISOString()) as { title: string; done: number; total: number } | undefined) ?? null
  );
}

export function listStudents(): Student[] {
  return db
    .prepare("SELECT id, name, crew_id AS crewId, fur_hue AS furHue FROM students ORDER BY name")
    .all() as unknown as Student[];
}

export function getStudent(id: string): Student | null {
  return (
    (db.prepare("SELECT id, name, crew_id AS crewId, fur_hue AS furHue FROM students WHERE id = ?").get(id) as
      | Student
      | undefined) ?? null
  );
}

/** Change the colour of a student's otter. */
export function setFurHue(studentId: string, furHue: number): boolean {
  const hue = Math.round(furHue);
  if (!Number.isFinite(hue) || hue < 0 || hue > 359) return false;
  return db.prepare("UPDATE students SET fur_hue = ? WHERE id = ?").run(hue, studentId).changes > 0;
}

export function crewView(studentId: string): CrewView | null {
  const student = getStudent(studentId);
  if (!student?.crewId) return null;

  const crew = db.prepare("SELECT name, weekly_goal AS weeklyGoal, cheers FROM crews WHERE id = ?").get(student.crewId) as {
    name: string;
    weeklyGoal: number;
    cheers: string;
  };
  const members = db
    .prepare("SELECT id, name, fur_hue AS furHue, weekly_target AS weeklyTarget FROM students WHERE crew_id = ? ORDER BY name")
    .all(student.crewId) as { id: string; name: string; furHue: number; weeklyTarget: number }[];

  const weekStart = startOfWeek(new Date()).toISOString();
  const logs = db
    .prepare(
      `SELECT l.student_id AS studentId, l.help_level AS helpLevel, l.done_at AS doneAt
       FROM step_logs l JOIN students s ON s.id = l.student_id
       WHERE s.crew_id = ? AND l.done_at >= ?`,
    )
    .all(student.crewId, weekStart) as unknown as StepLog[];

  const wins = db
    .prepare(
      `SELECT r.id AS runId, s.id AS studentId, s.name, s.fur_hue AS furHue, rt.title, r.finished_at AS finishedAt,
              SUM(l.help_level = 0) AS onOwn, COUNT(l.id) AS total,
              EXISTS (SELECT 1 FROM cheers c WHERE c.run_id = r.id AND c.from_id = ?) AS cheered
       FROM runs r
       JOIN students s ON s.id = r.student_id
       JOIN routines rt ON rt.id = r.routine_id
       JOIN step_logs l ON l.run_id = r.id
       WHERE s.crew_id = ? AND r.finished_at >= ?
       GROUP BY r.id ORDER BY r.finished_at DESC LIMIT 8`,
    )
    .all(studentId, student.crewId, weekStart) as unknown as CrewView["wins"];

  const asksForMe = db
    .prepare(
      `SELECT a.id, f.name AS fromName, st.text AS stepText
       FROM asks a JOIN students f ON f.id = a.from_id JOIN steps st ON st.id = a.step_id
       WHERE a.to_id = ? AND a.created_at >= ? ORDER BY a.created_at DESC`,
    )
    .all(studentId, weekStart) as unknown as CrewView["asksForMe"];

  const memberStats = members.map((member) => {
    const onOwn = stepsOnOwn(logs, member.id);
    return {
      id: member.id,
      name: member.name,
      furHue: member.furHue,
      onOwn,
      ring: ringFill(onOwn, member.weeklyTarget),
      days: daysPractised(logs, member.id),
      now: workingOn(member.id),
      asking: Boolean(
        db
          .prepare("SELECT 1 FROM posts WHERE author_id = ? AND kind = 'ask' AND created_at >= ?")
          .get(member.id, new Date(Date.now() - DAY_MS).toISOString()),
      ),
    };
  });

  return {
    name: crew.name,
    weeklyGoal: crew.weeklyGoal,
    onOwnTogether: memberStats.reduce((sum, member) => sum + member.onOwn, 0),
    cheers: JSON.parse(crew.cheers) as string[],
    members: memberStats,
    wins: wins.map((win) => ({ ...win, cheered: Boolean(win.cheered), cheers: cheersFor(win.runId), stepHelp: stepHelp(win.runId) })),
    asksForMe,
    buddy: findBuddy(studentId, members),
    invites: db
      .prepare(
        `SELECT i.id, i.from_id AS fromId, f.name AS fromName, t.name AS toName, i.about, i.status,
                i.from_run_id AS fromRunId, i.to_run_id AS toRunId
         FROM invites i JOIN students f ON f.id = i.from_id JOIN students t ON t.id = i.to_id
         WHERE (i.from_id = ? OR i.to_id = ?) AND i.created_at >= ? ORDER BY i.created_at DESC`,
      )
      .all(studentId, studentId, new Date(Date.now() - DAY_MS).toISOString()) as unknown as CrewView["invites"],
  };
}

/** Cheer a crewmate's finished task. Only the crew's preset phrases are allowed. */
export function addCheer(fromId: string, runId: string, phrase: string): boolean {
  const view = crewView(fromId);
  const win = view?.wins.find((w) => w.runId === runId);
  if (!view || !win || win.studentId === fromId || !view.cheers.includes(phrase)) return false;
  db.prepare("INSERT INTO cheers (id, from_id, to_id, run_id, phrase, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
    newId(),
    fromId,
    win.studentId,
    runId,
    phrase,
    now(),
  );
  return true;
}

/**
 * Find the crewmate who has done this step on their own most often, and let them know
 * someone would like help. Returns their name, or null if nobody has done it yet.
 */
export function askCrewmate(fromId: string, stepId: string): string | null {
  const student = getStudent(fromId);
  if (!student?.crewId) return null;
  const helper = db
    .prepare(
      `SELECT s.id, s.name, COUNT(*) AS times
       FROM step_logs l JOIN students s ON s.id = l.student_id
       WHERE l.step_id = ? AND l.help_level = 0 AND s.crew_id = ? AND s.id != ?
       GROUP BY s.id ORDER BY times DESC LIMIT 1`,
    )
    .get(stepId, student.crewId, fromId) as { id: string; name: string } | undefined;
  if (!helper) return null;
  db.prepare("INSERT INTO asks (id, from_id, to_id, step_id, created_at) VALUES (?, ?, ?, ?, ?)").run(
    newId(),
    fromId,
    helper.id,
    stepId,
    now(),
  );
  return helper.name;
}

/** Pair the crew into practice buddies and return this student's buddy. */
function findBuddy(studentId: string, members: { id: string; name: string; furHue: number }[]): CrewView["buddy"] {
  const rows = db
    .prepare(
      `SELECT student_id AS studentId, step_id AS stepId, help_level AS level
       FROM step_logs WHERE student_id IN (${members.map(() => "?").join(", ")})
       ORDER BY done_at DESC`,
    )
    .all(...members.map((m) => m.id)) as { studentId: string; stepId: string; level: number }[];

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
  const stepText = (id: string) =>
    (db.prepare("SELECT text FROM steps WHERE id = ?").get(id) as { text: string } | undefined)?.text ?? "";
  const buddy = members.find((m) => m.id === buddyId);
  return {
    id: buddyId,
    name: buddy?.name ?? "",
    furHue: buddy?.furHue ?? 0,
    theyCanShowYou: (isA ? pairing.bCanShowA : pairing.aCanShowB).map(stepText),
    youCanShowThem: (isA ? pairing.aCanShowB : pairing.bCanShowA).map(stepText),
  };
}

function cheersFor(runId: string): { fromName: string; phrase: string }[] {
  return db
    .prepare(
      `SELECT s.name AS fromName, c.phrase FROM cheers c JOIN students s ON s.id = c.from_id
       WHERE c.run_id = ? ORDER BY c.created_at`,
    )
    .all(runId) as { fromName: string; phrase: string }[];
}

function stepHelp(runId: string): number[] {
  const rows = db
    .prepare(
      `SELECT l.help_level AS level FROM step_logs l JOIN steps s ON s.id = l.step_id
       WHERE l.run_id = ? ORDER BY s.position`,
    )
    .all(runId) as { level: number }[];
  return rows.map((row) => row.level);
}
