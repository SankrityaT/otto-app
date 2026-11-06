import type { NextRequest } from "next/server";
import { checkStep } from "@/lib/ai/check";
import { getPhoto } from "@/lib/camera";
import { getRun, logStep, runSummary } from "@/lib/data/runs";
import { HELP_LEVELS, type HelpLevel } from "@/lib/help";
import { aiFailure, jsonError, readJson } from "@/lib/http";

/**
 * "Done": look at a photo, and log the step if it really is done.
 * If the camera couldn't see the step and the student says they did it, Otto takes their
 * word (`trustStudent`). It never blocks a student who has finished.
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/runs/[id]/check">) {
  const { id } = await ctx.params;
  const body = await readJson(request);
  const run = await getRun(id);
  const step = run?.steps.find((s) => s.id === body.stepId);
  if (!run || !step) return jsonError("Step not found.", 404);

  const helpLevel = Number(body.helpLevel);
  if (!Object.values(HELP_LEVELS).includes(helpLevel as HelpLevel)) return jsonError("Unknown help level.", 400);

  const trustStudent = body.trustStudent === true;
  const photo = trustStudent ? null : await getPhoto(body.photo);
  if (!trustStudent && !photo) return jsonError("Otto needs a photo to check the step.", 400);

  try {
    const result = photo ? await checkStep(step, photo) : { done: true, say: "Okay. On to the next step.", nudge: null };
    if (result.done) await logStep(run, step.id, helpLevel as HelpLevel);
    const stepsLeft = run.steps.length - run.doneStepIds.length - (run.doneStepIds.includes(step.id) ? 0 : 1);
    const finished = result.done && stepsLeft === 0;
    return Response.json({ ...result, finished, summary: finished ? await runSummary(id) : null });
  } catch (error) {
    return aiFailure(error);
  }
}
