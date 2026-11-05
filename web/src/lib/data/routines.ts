import type { StepPlan } from "../ai/steps";
import { parseScene, type Scene } from "../ai/scene";
import { db, newId, now } from "../db";

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

export function listRoutines(): { id: string; title: string; stepCount: number }[] {
  return db
    .prepare(
      `SELECT r.id, r.title, COUNT(s.id) AS stepCount
       FROM routines r JOIN steps s ON s.routine_id = r.id
       GROUP BY r.id ORDER BY r.created_at DESC`,
    )
    .all() as { id: string; title: string; stepCount: number }[];
}

/**
 * Every task as a station in the raft's work-site room, with a small 3D model of it: the
 * first step's "show me" model, if Ayin has built one.
 */
export function listStations(): { routineId: string; title: string; scene: Scene | null }[] {
  const rows = db
    .prepare(
      `SELECT r.id AS routineId, r.title,
              (SELECT s.scene_json FROM steps s WHERE s.routine_id = r.id AND s.scene_json IS NOT NULL
               ORDER BY s.position LIMIT 1) AS sceneJson
       FROM routines r ORDER BY r.created_at`,
    )
    .all() as { routineId: string; title: string; sceneJson: string | null }[];
  return rows.map((row) => ({ routineId: row.routineId, title: row.title, scene: row.sceneJson ? parseScene(row.sceneJson) : null }));
}

export function createRoutine(plan: StepPlan): Routine {
  const routineId = newId();
  db.prepare("INSERT INTO routines (id, title, created_at) VALUES (?, ?, ?)").run(routineId, plan.title, now());
  const insertStep = db.prepare(
    "INSERT INTO steps (id, routine_id, position, text, detail, seconds) VALUES (?, ?, ?, ?, ?, ?)",
  );
  plan.steps.forEach((step, index) =>
    insertStep.run(newId(), routineId, index, step.text, step.detail, step.seconds ?? null),
  );
  return getRoutine(routineId)!;
}

export function getRoutine(id: string): Routine | null {
  const routine = db.prepare("SELECT id, title FROM routines WHERE id = ?").get(id) as
    | { id: string; title: string }
    | undefined;
  if (!routine) return null;
  const rows = db
    .prepare(
      `SELECT id, position, text, detail, seconds, picture_svg IS NOT NULL AS hasPicture
       FROM steps WHERE routine_id = ? ORDER BY position`,
    )
    .all(id) as { id: string; position: number; text: string; detail: string; seconds: number | null; hasPicture: number }[];
  return { ...routine, steps: rows.map((row) => ({ ...row, hasPicture: Boolean(row.hasPicture) })) };
}

export function getStep(id: string) {
  return db
    .prepare(
      `SELECT s.id, s.text, s.detail, s.picture_svg AS pictureSvg, s.scene_json AS sceneJson, r.title AS routineTitle
       FROM steps s JOIN routines r ON r.id = s.routine_id WHERE s.id = ?`,
    )
    .get(id) as
    | { id: string; text: string; detail: string; pictureSvg: string | null; sceneJson: string | null; routineTitle: string }
    | undefined;
}

export function savePicture(stepId: string, svg: string): void {
  db.prepare("UPDATE steps SET picture_svg = ? WHERE id = ?").run(svg, stepId);
}

export function saveScene(stepId: string, sceneJson: string): void {
  db.prepare("UPDATE steps SET scene_json = ? WHERE id = ?").run(sceneJson, stepId);
}

/**
 * Replace one step with smaller ones, in the same place. The first smaller step keeps the
 * old step's id, so anything already logged against it still points somewhere sensible.
 */
export function replaceStep(stepId: string, smaller: StepPlan["steps"]): void {
  const step = db.prepare("SELECT routine_id AS routineId, position FROM steps WHERE id = ?").get(stepId) as
    | { routineId: string; position: number }
    | undefined;
  if (!step || smaller.length === 0) return;
  const extra = smaller.length - 1;
  db.prepare("UPDATE steps SET position = position + ? WHERE routine_id = ? AND position > ?").run(
    extra,
    step.routineId,
    step.position,
  );
  const [first, ...rest] = smaller;
  db.prepare("UPDATE steps SET text = ?, detail = ?, seconds = ?, picture_svg = NULL, scene_json = NULL WHERE id = ?").run(
    first.text,
    first.detail,
    first.seconds ?? null,
    stepId,
  );
  const insert = db.prepare(
    "INSERT INTO steps (id, routine_id, position, text, detail, seconds) VALUES (?, ?, ?, ?, ?, ?)",
  );
  rest.forEach((s, i) => insert.run(newId(), step.routineId, step.position + 1 + i, s.text, s.detail, s.seconds ?? null));
}
