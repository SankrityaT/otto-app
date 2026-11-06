import { all, newId, now, one, run } from "../db";
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

const INVITE = `SELECT id, from_id AS "fromId", to_id AS "toId", routine_id AS "routineId", status,
                       from_run_id AS "fromRunId", to_run_id AS "toRunId" FROM invites`;

/** Two students can work together if they're in the same raft and neither has blocked the other. */
async function canPair(fromId: string, toId: string): Promise<boolean> {
  const [from, to, hidden] = await Promise.all([getStudent(fromId), getStudent(toId), hiddenFrom(fromId)]);
  return Boolean(from?.crewId && from.crewId === to?.crewId && fromId !== toId && !hidden.has(toId));
}

/** Invite a raftmate to do a task together. Starts the inviter's run straight away; returns its id. */
export async function inviteTogether(fromId: string, toId: string, routineId: string): Promise<string | null> {
  const routine = await getRoutine(routineId);
  if (!routine || !(await canPair(fromId, toId))) return null;
  const runId = await startRun(routineId, fromId);
  if (!runId) return null;
  await run(
    `INSERT INTO invites (id, from_id, to_id, about, status, created_at, routine_id, from_run_id)
     VALUES (?, ?, ?, ?, 'waiting', ?, ?, ?)`,
    newId(),
    fromId,
    toId,
    routine.title,
    now(),
    routineId,
    runId,
  );
  return runId;
}

/** Answer an invite. "yes" starts the same task for the raftmate and returns their run's id. */
export async function answerTogether(inviteId: string, studentId: string, answer: "yes" | "not-today"): Promise<string | null | false> {
  const invite = await one<InviteRow>(`${INVITE} WHERE id = ?`, inviteId);
  if (!invite || invite.toId !== studentId || invite.status !== "waiting" || !invite.routineId) return false;
  if (answer === "not-today") {
    await run("UPDATE invites SET status = 'not-today' WHERE id = ?", inviteId);
    return null;
  }
  const runId = await startRun(invite.routineId, studentId);
  if (!runId) return false;
  await run("UPDATE invites SET status = 'yes', to_run_id = ? WHERE id = ?", runId, inviteId);
  return runId;
}

/** What the partner on a shared task is up to, seen from one student's run. Null if it isn't shared. */
export async function togetherFor(runId: string): Promise<Together | null> {
  const invite = await one<InviteRow>(`${INVITE} WHERE from_run_id = ? OR to_run_id = ?`, runId, runId);
  if (!invite) return null;
  const mine = invite.fromRunId === runId;
  const partner = await getStudent(mine ? invite.toId : invite.fromId);
  if (!partner?.crewId) return null;
  const partnerRunId = mine ? invite.toRunId : invite.fromRunId;

  const [progress, lastStep, crew, cheers] = await Promise.all([
    partnerRunId
      ? one<{ done: number; total: number; finished: boolean }>(
          `SELECT (SELECT COUNT(*) FROM step_logs WHERE run_id = r.id) AS done,
                  (SELECT COUNT(*) FROM steps WHERE routine_id = r.routine_id) AS total,
                  r.finished_at IS NOT NULL AS finished
           FROM runs r WHERE r.id = ?`,
          partnerRunId,
        )
      : null,
    partnerRunId
      ? one<{ id: string; text: string }>(
          `SELECT s.id, s.text FROM step_logs l JOIN steps s ON s.id = l.step_id
           WHERE l.run_id = ? ORDER BY l.done_at DESC LIMIT 1`,
          partnerRunId,
        )
      : null,
    one<{ cheers: string }>("SELECT cheers FROM crews WHERE id = ?", partner.crewId),
    all<Together["cheers"][number]>(
      "SELECT id, phrase FROM cheers WHERE run_id = ? AND from_id = ? ORDER BY created_at DESC LIMIT 3",
      runId,
      partner.id,
    ),
  ]);

  return {
    status: invite.status === "yes" ? "joined" : invite.status,
    partner: { id: partner.id, name: partner.name, furHue: partner.furHue },
    partnerRunId,
    done: progress?.done ?? 0,
    total: progress?.total ?? 0,
    lastStep,
    finished: progress?.finished ?? false,
    cheers: cheers.reverse(),
    phrases: JSON.parse(crew!.cheers) as string[],
  };
}

/** Send one of the raft's preset cheers to the partner on a shared task. */
export async function cheerPartner(runId: string, phrase: string): Promise<boolean> {
  const [sender, together] = await Promise.all([
    one<{ studentId: string }>(`SELECT student_id AS "studentId" FROM runs WHERE id = ?`, runId),
    togetherFor(runId),
  ]);
  if (!sender || !together?.partnerRunId || !together.phrases.includes(phrase)) return false;
  await run(
    "INSERT INTO cheers (id, from_id, to_id, run_id, phrase, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    newId(),
    sender.studentId,
    together.partner.id,
    together.partnerRunId,
    phrase,
    now(),
  );
  return true;
}
