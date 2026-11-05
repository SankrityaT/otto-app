import { db, newId, now } from "../db";
import { getStudent } from "./crew";
import { hiddenFrom } from "./raft";
import { getRoutine } from "./routines";
import { startRun } from "./runs";

// "Do it together", like body doubling on Focusmate but made for our students: two raftmates
// do the same task at the same time, each in their own step coach, and see each other's otter
// move as real steps get done. No video, no free chat: progress and preset cheers only.

export interface Together {
  status: "waiting" | "joined" | "not-today";
  partner: { id: string; name: string; furHue: number };
  partnerRunId: string | null;
  done: number;
  total: number;
  /** The step the partner finished most recently. */
  lastStep: { id: string; text: string } | null;
  finished: boolean;
  /** Cheers the partner sent to this student during the task, newest last. */
  cheers: { id: string; phrase: string }[];
  /** The raft's preset cheers this student can send back. */
  phrases: string[];
}

interface InviteRow {
  id: string;
  fromId: string;
  toId: string;
  routineId: string;
  status: "waiting" | "yes" | "not-today";
  fromRunId: string;
  toRunId: string | null;
}

const INVITE = `SELECT id, from_id AS fromId, to_id AS toId, routine_id AS routineId, status,
                       from_run_id AS fromRunId, to_run_id AS toRunId FROM invites`;

/** Two students can work together if they're in the same raft and neither has blocked the other. */
function canPair(fromId: string, toId: string): boolean {
  const from = getStudent(fromId);
  const to = getStudent(toId);
  return Boolean(from?.crewId && from.crewId === to?.crewId && fromId !== toId && !hiddenFrom(fromId).has(toId));
}

/** Invite a raftmate to do a task together. Starts the inviter's run straight away; returns its id. */
export function inviteTogether(fromId: string, toId: string, routineId: string): string | null {
  const routine = getRoutine(routineId);
  if (!routine || !canPair(fromId, toId)) return null;
  const runId = startRun(routineId, fromId);
  if (!runId) return null;
  db.prepare(
    `INSERT INTO invites (id, from_id, to_id, about, status, created_at, routine_id, from_run_id)
     VALUES (?, ?, ?, ?, 'waiting', ?, ?, ?)`,
  ).run(newId(), fromId, toId, routine.title, now(), routineId, runId);
  return runId;
}

/** Answer an invite. "yes" starts the same task for the raftmate and returns their run's id. */
export function answerTogether(inviteId: string, studentId: string, answer: "yes" | "not-today"): string | null | false {
  const invite = db.prepare(`${INVITE} WHERE id = ?`).get(inviteId) as InviteRow | undefined;
  if (!invite || invite.toId !== studentId || invite.status !== "waiting" || !invite.routineId) return false;
  if (answer === "not-today") {
    db.prepare("UPDATE invites SET status = 'not-today' WHERE id = ?").run(inviteId);
    return null;
  }
  const runId = startRun(invite.routineId, studentId);
  if (!runId) return false;
  db.prepare("UPDATE invites SET status = 'yes', to_run_id = ? WHERE id = ?").run(runId, inviteId);
  return runId;
}

function inviteFor(runId: string): InviteRow | undefined {
  return db.prepare(`${INVITE} WHERE from_run_id = ? OR to_run_id = ?`).get(runId, runId) as InviteRow | undefined;
}

/** What the partner on a shared task is up to, seen from one student's run. Null if it isn't shared. */
export function togetherFor(runId: string): Together | null {
  const invite = inviteFor(runId);
  if (!invite) return null;
  const mine = invite.fromRunId === runId;
  const partner = getStudent(mine ? invite.toId : invite.fromId);
  if (!partner?.crewId) return null;
  const partnerRunId = mine ? invite.toRunId : invite.fromRunId;

  const progress = partnerRunId
    ? (db
        .prepare(
          `SELECT (SELECT COUNT(*) FROM step_logs WHERE run_id = r.id) AS done,
                  (SELECT COUNT(*) FROM steps WHERE routine_id = r.routine_id) AS total,
                  r.finished_at IS NOT NULL AS finished
           FROM runs r WHERE r.id = ?`,
        )
        .get(partnerRunId) as { done: number; total: number; finished: number })
    : null;
  const lastStep = partnerRunId
    ? ((db
        .prepare(
          `SELECT s.id, s.text FROM step_logs l JOIN steps s ON s.id = l.step_id
           WHERE l.run_id = ? ORDER BY l.done_at DESC LIMIT 1`,
        )
        .get(partnerRunId) as { id: string; text: string } | undefined) ?? null)
    : null;
  const crew = db.prepare("SELECT cheers FROM crews WHERE id = ?").get(partner.crewId) as { cheers: string };

  return {
    status: invite.status === "yes" ? "joined" : invite.status,
    partner: { id: partner.id, name: partner.name, furHue: partner.furHue },
    partnerRunId,
    done: progress?.done ?? 0,
    total: progress?.total ?? 0,
    lastStep,
    finished: Boolean(progress?.finished),
    cheers: db
      .prepare("SELECT id, phrase FROM cheers WHERE run_id = ? AND from_id = ? ORDER BY created_at DESC LIMIT 3")
      .all(runId, partner.id)
      .reverse() as unknown as Together["cheers"],
    phrases: JSON.parse(crew.cheers) as string[],
  };
}

/** Send one of the raft's preset cheers to the partner on a shared task. */
export function cheerPartner(runId: string, phrase: string): boolean {
  const run = db.prepare("SELECT student_id AS studentId FROM runs WHERE id = ?").get(runId) as { studentId: string } | undefined;
  const together = togetherFor(runId);
  if (!run || !together?.partnerRunId || !together.phrases.includes(phrase)) return false;
  db.prepare("INSERT INTO cheers (id, from_id, to_id, run_id, phrase, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
    newId(),
    run.studentId,
    together.partner.id,
    together.partnerRunId,
    phrase,
    now(),
  );
  return true;
}
