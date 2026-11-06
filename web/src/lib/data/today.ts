import { hasBlockedWords } from "../cleanWords";
import { all, newId, now, one, run } from "../db";
import {
  evidenceFor,
  latestOfEachTask,
  onOwnLine,
  openThings,
  type DoneThing,
  type FinishedRun,
  type Hold,
  type Later,
  type Memory,
  type Today,
} from "../today";
import { canUse, listRoutines } from "./routines";
import { finishedRuns, inProgress } from "./runs";

// The Today screen's data: what's open now, what's done today, and what Otto remembers.
// All of it belongs to one student; nothing here is shared with the raft.

/** The longest reminder or memory Otto keeps. */
const MAX_WORDS = 120;
/** How many memories Today can show. */
const MAX_MEMORIES = 12;

type Note = { id: string; text: string; createdAt: string };

function openReminders(studentId: string): Promise<Note[]> {
  return all(
    `SELECT id, text, created_at AS "createdAt" FROM reminders
     WHERE student_id = ? AND done_at IS NULL ORDER BY created_at DESC`,
    studentId,
  );
}

function toldMemories(studentId: string): Promise<Note[]> {
  return all(
    `SELECT id, text, created_at AS "createdAt" FROM memories
     WHERE student_id = ? ORDER BY created_at DESC LIMIT ?`,
    studentId,
    MAX_MEMORIES,
  );
}

function memoriesFrom(told: Note[], runs: FinishedRun[]): Memory[] {
  const fromStudent: Memory[] = told.map((note) => ({
    id: note.id,
    title: note.text,
    detail: null,
    evidence: { kind: "said", detail: "You said this" },
    at: note.createdAt,
    canForget: true,
  }));
  const fromWork: Memory[] = latestOfEachTask(runs).map((r) => ({
    id: r.runId,
    title: r.title,
    detail: onOwnLine(r),
    evidence: evidenceFor(r),
    at: r.finishedAt,
    canForget: false,
  }));
  return [...fromStudent, ...fromWork].sort((a, b) => b.at.localeCompare(a.at)).slice(0, MAX_MEMORIES);
}

/** Everything on Today. `since` is the start of the student's own day: the server may be elsewhere. */
export async function todayFor(studentId: string, since: string): Promise<Today> {
  const [routines, started, reminders, holds, runs, told, doneReminders] = await Promise.all([
    listRoutines(studentId),
    inProgress(studentId),
    openReminders(studentId),
    all<Hold>(
      `SELECT item_id AS "itemId", later_until AS "laterUntil", later_moment AS "laterMoment", let_go_at AS "letGoAt"
       FROM now_holds WHERE student_id = ?`,
      studentId,
    ),
    finishedRuns(studentId),
    toldMemories(studentId),
    all<{ id: string; text: string; doneAt: string }>(
      `SELECT id, text, done_at AS "doneAt" FROM reminders WHERE student_id = ? AND done_at >= ?`,
      studentId,
      since,
    ),
  ]);

  const runsToday = runs.filter((r) => r.finishedAt >= since);
  const done: DoneThing[] = [
    ...runsToday.map((r) => ({
      id: r.runId,
      thingId: r.routineId,
      routineId: r.routineId,
      title: r.title,
      at: r.finishedAt,
      line: onOwnLine(r),
    })),
    ...doneReminders.map((r) => ({ id: r.id, thingId: r.id, routineId: null, title: r.text, at: r.doneAt, line: null })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return {
    open: openThings({
      routines,
      started,
      reminders,
      holds,
      finishedToday: new Set(runsToday.map((r) => r.routineId)),
      now: now(),
    }),
    done,
    memories: memoriesFrom(told, runs),
  };
}

/** True if this task or reminder is one this student has. */
export async function hasThing(studentId: string, itemId: string): Promise<boolean> {
  if (await one("SELECT 1 FROM reminders WHERE id = ? AND student_id = ?", itemId, studentId)) return true;
  return canUse(itemId, studentId);
}

function hold(studentId: string, itemId: string, laterUntil: string | null, laterMoment: string | null, letGoAt: string | null) {
  return run(
    `INSERT INTO now_holds (student_id, item_id, later_until, later_moment, let_go_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (student_id, item_id) DO UPDATE
     SET later_until = EXCLUDED.later_until, later_moment = EXCLUDED.later_moment, let_go_at = EXCLUDED.let_go_at`,
    studentId,
    itemId,
    laterUntil,
    laterMoment,
    letGoAt,
  );
}

export function putOff(studentId: string, itemId: string, later: Later) {
  return hold(studentId, itemId, later.until, later.moment, null);
}

export function letGo(studentId: string, itemId: string) {
  return hold(studentId, itemId, null, null, now());
}

/** Undo "let go" or "later": the thing is back in its usual place. */
export function bringBack(studentId: string, itemId: string) {
  return run("DELETE FROM now_holds WHERE student_id = ? AND item_id = ?", studentId, itemId);
}

/** Mark a reminder done. Returns false for a task: tasks finish in the step coach. */
export async function finishReminder(studentId: string, reminderId: string): Promise<boolean> {
  const changed = await run(
    "UPDATE reminders SET done_at = ? WHERE id = ? AND student_id = ? AND done_at IS NULL",
    now(),
    reminderId,
    studentId,
  );
  return changed > 0 || (await one("SELECT 1 FROM reminders WHERE id = ? AND student_id = ?", reminderId, studentId)) !== null;
}

export function forgetMemory(studentId: string, memoryId: string) {
  return run("DELETE FROM memories WHERE id = ? AND student_id = ?", memoryId, studentId);
}

/** What Otto already holds for this student, so it can answer from it when they talk. */
export async function whatOttoHolds(studentId: string): Promise<{ reminders: string[]; memories: string[] }> {
  const [reminders, memories] = await Promise.all([openReminders(studentId), toldMemories(studentId)]);
  return { reminders: reminders.map((r) => r.text), memories: memories.map((m) => m.text) };
}

/** The words worth keeping, or null if there's nothing new or they aren't clean. */
function worthKeeping(text: string | null, already: string[]): string | null {
  const words = text?.trim().slice(0, MAX_WORDS);
  if (!words || hasBlockedWords(words)) return null;
  return already.some((old) => old.toLowerCase() === words.toLowerCase()) ? null : words;
}

/** Save what the student asked Otto to keep. Returns true if anything was saved. */
export async function keep(
  studentId: string,
  asked: { remember: string | null; remind: string | null },
  holding: { reminders: string[]; memories: string[] },
): Promise<boolean> {
  const memory = worthKeeping(asked.remember, holding.memories);
  const reminder = worthKeeping(asked.remind, holding.reminders);
  if (memory) await run("INSERT INTO memories (id, student_id, text, created_at) VALUES (?, ?, ?, ?)", newId(), studentId, memory, now());
  if (reminder) await run("INSERT INTO reminders (id, student_id, text, created_at) VALUES (?, ?, ?, ?)", newId(), studentId, reminder, now());
  return Boolean(memory || reminder);
}
