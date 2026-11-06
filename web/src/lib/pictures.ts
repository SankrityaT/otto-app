import { drawStep } from "./ai/picture";
import { getStep, savePicture } from "./data/routines";

// Each step's flat diagram, drawn by Claude once and saved. A new task's diagrams are all drawn
// as soon as it's created (see /api/routines), so they're ready by the time a student needs them.

/** Drawings in progress on this server, so a step asked for twice is only drawn once. */
const drawing = new Map<string, Promise<string | null>>();

/** The step's diagram (SVG), drawing it the first time. Null if the step doesn't exist or can't be drawn. */
export function pictureFor(stepId: string): Promise<string | null> {
  const already = drawing.get(stepId);
  if (already) return already;
  const pending = (async () => {
    const step = await getStep(stepId);
    if (!step) return null;
    if (step.pictureSvg) return step.pictureSvg;
    const svg = await drawStep(step.routineTitle, step);
    if (svg) await savePicture(stepId, svg);
    return svg;
  })().finally(() => drawing.delete(stepId));
  drawing.set(stepId, pending);
  return pending;
}
