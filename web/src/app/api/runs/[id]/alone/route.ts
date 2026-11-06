import type { NextRequest } from "next/server";
import { checkStep } from "@/lib/ai/check";
import { getPhoto } from "@/lib/camera";
import { getRun, logWholeRun, runSummary } from "@/lib/data/runs";
import { aiFailure, jsonError, readJson } from "@/lib/http";

/** "On my own": the student did the whole task alone. Otto checks only the end result. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/runs/[id]/alone">) {
  const { id } = await ctx.params;
  const run = await getRun(id);
  const last = run?.steps.at(-1);
  if (!run || !last) return jsonError("Run not found.", 404);
  if (run.stage !== 5) return jsonError("Otto still checks each step for this task.", 400);

  const photo = await getPhoto((await readJson(request)).photo);
  if (!photo) return jsonError("Otto needs a photo to check the finished task.", 400);

  try {
    const result = await checkStep({ text: `Finish: ${run.title}`, detail: last.detail }, photo);
    if (result.done) await logWholeRun(run);
    return Response.json({ ...result, finished: result.done, summary: result.done ? await runSummary(id) : null });
  } catch (error) {
    return aiFailure(error);
  }
}
