import { all, newId, now, one, run } from "../db";
import { RUNS_TO_FADE, showPictureFirst, type HelpLevel } from "../help";
import { stageFor, type RunResult, type Stage } from "../stages";
import { startOfWeek } from "../week";
import { getRoutine, type Step } from "./routines";

// A run is one go at a routine by one student. Every finished step is logged with the
// most help it took, so the student (and later their teacher) can see help going down.

export interface RunStep extends Step {
  showPictureFirst: boolean;
}

export interface Run {
  id: string;
  routineId: string;
  studentId: string;
  /** The student's own otter colour. */
  furHue: number;
  title: string;
  steps: RunStep[];
  doneStepIds: string[];
  /** Where the student is on First Place's five-stage path for this task. */
  stage: Stage;
}

async function recentHelpLevels(studentId: string, stepId: string): Promise<number[]> {
  const rows = await all<{ level: number }>(
    `SELECT help_level AS level FROM step_logs
     WHERE student_id = ? AND step_id = ? ORDER BY done_at DESC LIMIT ?`,
    studentId,
    stepId,
    RUNS_TO_FADE,
  );
  return rows.map((row) => row.level);
}

export async function startRun(routineId: string, studentId: string): Promise<string | null> {
  if (!(await getRoutine(routineId))) return null;
  const runId = newId();
  await run("INSERT INTO runs (id, routine_id, student_id, started_at) VALUES (?, ?, ?, ?)", runId, routineId, studentId, now());
  return runId;
}

export async function getRun(runId: string): Promise<Run | null> {
  const found = await one<{ id: string; routineId: string; studentId: string; furHue: number }>(
    `SELECT r.id, r.routine_id AS "routineId", r.student_id AS "studentId", s.fur_hue AS "furHue"
     FROM runs r JOIN students s ON s.id = r.student_id WHERE r.id = ?`,
    runId,
  );
  if (!found) return null;
  const [routine, done, past] = await Promise.all([
    getRoutine(found.routineId),
    all<{ stepId: string }>(`SELECT step_id AS "stepId" FROM step_logs WHERE run_id = ?`, runId),
    pastResults(found.studentId, found.routineId, found.id),
  ]);
  const steps = await Promise.all(
    routine!.steps.map(async (step) => ({
      ...step,
      showPictureFirst: showPictureFirst(await recentHelpLevels(found.studentId, step.id)),
    })),
  );
  return {
    id: found.id,
    routineId: found.routineId,
    studentId: found.studentId,
    furHue: found.furHue,
    title: routine!.title,
    steps,
    doneStepIds: done.map((row) => row.stepId),
    stage: stageFor(past),
  };
}

/** How the student's earlier finished runs of this task went, newest first. */
function pastResults(studentId: string, routineId: string, currentRunId: string): Promise<RunResult[]> {
  return all(
    `SELECT COUNT(l.id) AS total, COUNT(*) FILTER (WHERE l.help_level = 0) AS "onOwn", MAX(l.help_level) AS "mostHelp"
     FROM runs r JOIN step_logs l ON l.run_id = r.id
     WHERE r.student_id = ? AND r.routine_id = ? AND r.finished_at IS NOT NULL AND r.id != ?
     GROUP BY r.id ORDER BY r.finished_at DESC LIMIT 5`,
    studentId,
    routineId,
    currentRunId,
  );
}

/** "On my own": the whole task was checked at the end, so every step counts as done alone. */
export async function logWholeRun(found: Run): Promise<void> {
  for (const step of found.steps) {
    if (!found.doneStepIds.includes(step.id)) await insertLog(found, step.id, 0);
  }
  await run("UPDATE runs SET finished_at = ? WHERE id = ?", now(), found.id);
}

/** Record a finished step. Finishing the last step finishes the run. */
export async function logStep(found: Run, stepId: string, helpLevel: HelpLevel): Promise<void> {
  if (found.doneStepIds.includes(stepId)) return;
  await insertLog(found, stepId, helpLevel);
  if (found.doneStepIds.length + 1 === found.steps.length) {
    await run("UPDATE runs SET finished_at = ? WHERE id = ?", now(), found.id);
  }
}

function insertLog(found: Run, stepId: string, helpLevel: HelpLevel): Promise<number> {
  return run(
    "INSERT INTO step_logs (id, run_id, step_id, student_id, help_level, done_at) VALUES (?, ?, ?, ?, ?, ?)",
    newId(),
    found.id,
    stepId,
    found.studentId,
    helpLevel,
    now(),
  );
}

/** "5 of 6 steps on your own." */
export async function runSummary(runId: string): Promise<{ total: number; onOwn: number }> {
  return (await one<{ total: number; onOwn: number }>(
    `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE help_level = 0) AS "onOwn" FROM step_logs WHERE run_id = ?`,
    runId,
  ))!;
}

/** Tasks this student finished this week, newest first. */
export function doneThisWeek(studentId: string): Promise<{ runId: string; title: string; onOwn: number; total: number }[]> {
  return all(
    `SELECT r.id AS "runId", rt.title, COUNT(*) FILTER (WHERE l.help_level = 0) AS "onOwn", COUNT(l.id) AS total
     FROM runs r JOIN routines rt ON rt.id = r.routine_id JOIN step_logs l ON l.run_id = r.id
     WHERE r.student_id = ? AND r.finished_at >= ?
     GROUP BY r.id, rt.id ORDER BY r.finished_at DESC`,
    studentId,
    startOfWeek(new Date()).toISOString(),
  );
}

/** Tasks this student started this week and hasn't finished yet, newest first. */
export function inProgress(studentId: string): Promise<{ runId: string; title: string; done: number; total: number }[]> {
  return all(
    `SELECT r.id AS "runId", rt.title,
            (SELECT COUNT(*) FROM step_logs l WHERE l.run_id = r.id) AS done,
            (SELECT COUNT(*) FROM steps s WHERE s.routine_id = r.routine_id) AS total
     FROM runs r JOIN routines rt ON rt.id = r.routine_id
     WHERE r.student_id = ? AND r.finished_at IS NULL AND r.started_at >= ?
       AND EXISTS (SELECT 1 FROM step_logs l WHERE l.run_id = r.id)
     ORDER BY r.started_at DESC LIMIT 3`,
    studentId,
    startOfWeek(new Date()).toISOString(),
  );
}
