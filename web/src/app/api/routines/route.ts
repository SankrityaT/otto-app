import { planSteps } from "@/lib/ai/steps";
import { getPhoto } from "@/lib/camera";
import { createRoutine, listRoutines } from "@/lib/data/routines";
import { aiFailure, jsonError, readJson } from "@/lib/http";

export function GET() {
  return Response.json({ routines: listRoutines() });
}

/** A new task: the student says it, shows it, or both. Claude breaks it into steps. */
export async function POST(request: Request) {
  const body = await readJson(request);
  const task = typeof body.task === "string" ? body.task.trim() : "";
  const photo = body.photo ? await getPhoto(body.photo) : null;
  if (!task && !photo) return jsonError("Say or show the task first.", 400);

  try {
    const plan = await planSteps(task || "the task in the photo", photo);
    return Response.json({ routine: createRoutine(plan) }, { status: 201 });
  } catch (error) {
    return aiFailure(error);
  }
}
