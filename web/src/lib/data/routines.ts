import type { StepPlan } from "../ai/steps";
import { all, newId, now, one, run } from "../db";

// A routine is a task that has been broken into steps once and can be practised again.
// Keeping the same steps across runs is what lets help fade step by step.

export interface Step {
  id: string;
  position: number;
  text: string;
  detail: string;
  /** Seconds the step takes, only when the step itself has a set time. */
  seconds: number | null;
  hasPicture: boolean;
}

export interface Routine {
  id: string;
  title: string;
  steps: Step[];
}

export function listRoutines(): Promise<{ id: string; title: string; stepCount: number }[]> {
  return all(
    `SELECT r.id, r.title, COUNT(s.id) AS "stepCount"
     FROM routines r JOIN steps s ON s.routine_id = r.id
     GROUP BY r.id ORDER BY r.created_at DESC`,
  );
}

export async function createRoutine(plan: StepPlan): Promise<Routine> {
  const routineId = newId();
  await run("INSERT INTO routines (id, title, created_at) VALUES (?, ?, ?)", routineId, plan.title, now());
  for (const [index, step] of plan.steps.entries()) {
    await run(
      "INSERT INTO steps (id, routine_id, position, text, detail, seconds) VALUES (?, ?, ?, ?, ?, ?)",
      newId(),
      routineId,
      index,
      step.text,
      step.detail,
      step.seconds ?? null,
    );
  }
  return (await getRoutine(routineId))!;
}

export async function getRoutine(id: string): Promise<Routine | null> {
  const routine = await one<{ id: string; title: string }>("SELECT id, title FROM routines WHERE id = ?", id);
  if (!routine) return null;
  const steps = await all<Step>(
    `SELECT id, position, text, detail, seconds, picture_svg IS NOT NULL AS "hasPicture"
     FROM steps WHERE routine_id = ? ORDER BY position`,
    id,
  );
  return { ...routine, steps };
}

export function getStep(id: string) {
  return one<{ id: string; text: string; detail: string; pictureSvg: string | null; sceneJson: string | null; routineTitle: string }>(
    `SELECT s.id, s.text, s.detail, s.picture_svg AS "pictureSvg", s.scene_json AS "sceneJson", r.title AS "routineTitle"
     FROM steps s JOIN routines r ON r.id = s.routine_id WHERE s.id = ?`,
    id,
  );
}

export async function savePicture(stepId: string, svg: string): Promise<void> {
  await run("UPDATE steps SET picture_svg = ? WHERE id = ?", svg, stepId);
}

export async function saveScene(stepId: string, sceneJson: string): Promise<void> {
  await run("UPDATE steps SET scene_json = ? WHERE id = ?", sceneJson, stepId);
}

/**
 * Replace one step with smaller ones, in the same place. The first smaller step keeps the
 * old step's id, so anything already logged against it still points somewhere sensible.
 */
export async function replaceStep(stepId: string, smaller: StepPlan["steps"]): Promise<void> {
  const step = await one<{ routineId: string; position: number }>(
    `SELECT routine_id AS "routineId", position FROM steps WHERE id = ?`,
    stepId,
  );
  if (!step || smaller.length === 0) return;
  await run("UPDATE steps SET position = position + ? WHERE routine_id = ? AND position > ?", smaller.length - 1, step.routineId, step.position);
  const [first, ...rest] = smaller;
  await run(
    "UPDATE steps SET text = ?, detail = ?, seconds = ?, picture_svg = NULL, scene_json = NULL WHERE id = ?",
    first.text,
    first.detail,
    first.seconds ?? null,
    stepId,
  );
  for (const [i, s] of rest.entries()) {
    await run(
      "INSERT INTO steps (id, routine_id, position, text, detail, seconds) VALUES (?, ?, ?, ?, ?, ?)",
      newId(),
      step.routineId,
      step.position + 1 + i,
      s.text,
      s.detail,
      s.seconds ?? null,
    );
  }
}
