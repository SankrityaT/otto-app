import { db, newId, now } from "../db";
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

function recentHelpLevels(studentId: string, stepId: string): number[] {
  const rows = db
    .prepare(
      `SELECT help_level AS level FROM step_logs
       WHERE student_id = ? AND step_id = ? ORDER BY done_at DESC LIMIT ?`,
    )
    .all(studentId, stepId, RUNS_TO_FADE) as { level: number }[];
  return rows.map((row) => row.level);
}

export function startRun(routineId: string, studentId: string): string | null {
  if (!getRoutine(routineId)) return null;
  const runId = newId();
  db.prepare("INSERT INTO runs (id, routine_id, student_id, started_at) VALUES (?, ?, ?, ?)").run(
    runId,
    routineId,
    studentId,
    now(),
  );
  return runId;
}

export function getRun(runId: string): Run | null {
  const run = db
    .prepare(
      `SELECT r.id, r.routine_id AS routineId, r.student_id AS studentId, s.fur_hue AS furHue
       FROM runs r JOIN students s ON s.id = r.student_id WHERE r.id = ?`,
    )
    .get(runId) as { id: string; routineId: string; studentId: string; furHue: number } | undefined;
  if (!run) return null;
  const routine = getRoutine(run.routineId)!;
  const done = db.prepare("SELECT step_id AS stepId FROM step_logs WHERE run_id = ?").all(runId) as { stepId: string }[];
  return {
    id: run.id,
    routineId: run.routineId,
    studentId: run.studentId,
    furHue: run.furHue,
    title: routine.title,
    steps: routine.steps.map((step) => ({
      ...step,
      showPictureFirst: showPictureFirst(recentHelpLevels(run.studentId, step.id)),
    })),
    doneStepIds: done.map((row) => row.stepId),
    stage: stageFor(pastResults(run.studentId, run.routineId, run.id)),
  };
}

/** How the student's earlier finished runs of this task went, newest first. */
function pastResults(studentId: string, routineId: string, currentRunId: string): RunResult[] {
  return db
    .prepare(
      `SELECT COUNT(l.id) AS total, COALESCE(SUM(l.help_level = 0), 0) AS onOwn, MAX(l.help_level) AS mostHelp
       FROM runs r JOIN step_logs l ON l.run_id = r.id
       WHERE r.student_id = ? AND r.routine_id = ? AND r.finished_at IS NOT NULL AND r.id != ?
       GROUP BY r.id ORDER BY r.finished_at DESC LIMIT 5`,
    )
    .all(studentId, routineId, currentRunId) as unknown as RunResult[];
}

/** "On my own": the whole task was checked at the end, so every step counts as done alone. */
export function logWholeRun(run: Run): void {
  for (const step of run.steps) logStep({ ...run, doneStepIds: [...run.doneStepIds] }, step.id, 0);
  db.prepare("UPDATE runs SET finished_at = ? WHERE id = ?").run(now(), run.id);
}

/** Record a finished step. Finishing the last step finishes the run. */
export function logStep(run: Run, stepId: string, helpLevel: HelpLevel): void {
  if (run.doneStepIds.includes(stepId)) return;
  db.prepare(
    "INSERT INTO step_logs (id, run_id, step_id, student_id, help_level, done_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(newId(), run.id, stepId, run.studentId, helpLevel, now());
  if (run.doneStepIds.length + 1 === run.steps.length) {
    db.prepare("UPDATE runs SET finished_at = ? WHERE id = ?").run(now(), run.id);
  }
}

/** "5 of 6 steps on your own." */
export function runSummary(runId: string): { total: number; onOwn: number } {
  return db
    .prepare(
      `SELECT COUNT(*) AS total, COALESCE(SUM(help_level = 0), 0) AS onOwn
       FROM step_logs WHERE run_id = ?`,
    )
    .get(runId) as { total: number; onOwn: number };
}

/** Tasks this student finished this week, newest first: they fill the basket by the pond. */
export function doneThisWeek(studentId: string): { runId: string; title: string; onOwn: number; total: number }[] {
  return db
    .prepare(
      `SELECT r.id AS runId, rt.title, COALESCE(SUM(l.help_level = 0), 0) AS onOwn, COUNT(l.id) AS total
       FROM runs r JOIN routines rt ON rt.id = r.routine_id JOIN step_logs l ON l.run_id = r.id
       WHERE r.student_id = ? AND r.finished_at >= ?
       GROUP BY r.id ORDER BY r.finished_at DESC`,
    )
    .all(studentId, startOfWeek(new Date()).toISOString()) as { runId: string; title: string; onOwn: number; total: number }[];
}

/** Tasks this student started this week and hasn't finished yet, newest first. */
export function inProgress(studentId: string): { runId: string; title: string; done: number; total: number }[] {
  return db
    .prepare(
      `SELECT r.id AS runId, rt.title,
              (SELECT COUNT(*) FROM step_logs l WHERE l.run_id = r.id) AS done,
              (SELECT COUNT(*) FROM steps s WHERE s.routine_id = r.routine_id) AS total
       FROM runs r JOIN routines rt ON rt.id = r.routine_id
       WHERE r.student_id = ? AND r.finished_at IS NULL AND r.started_at >= ?
         AND EXISTS (SELECT 1 FROM step_logs l WHERE l.run_id = r.id)
       ORDER BY r.started_at DESC LIMIT 3`,
    )
    .all(studentId, startOfWeek(new Date()).toISOString()) as { runId: string; title: string; done: number; total: number }[];
}
