import type { NextRequest } from "next/server";
import { giveHelp } from "@/lib/ai/hint";
import { getPhoto } from "@/lib/camera";
import { getRun } from "@/lib/data/runs";
import { HELP_LEVELS } from "@/lib/help";
import { aiFailure, jsonError, readJson } from "@/lib/http";

/** "Help": one level of help for the current step, with a photo when there is one. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/runs/[id]/help">) {
  const { id } = await ctx.params;
  const body = await readJson(request);
  const step = (await getRun(id))?.steps.find((s) => s.id === body.stepId);
  if (!step) return jsonError("Step not found.", 404);

  const level = Number(body.level);
  if (level !== HELP_LEVELS.nudge && level !== HELP_LEVELS.hint && level !== HELP_LEVELS.showMe) {
    return jsonError("Unknown help level.", 400);
  }

  try {
    const photo = await getPhoto(body.photo).catch(() => null); // help still works without a photo
    return Response.json({ say: await giveHelp(step, level, photo) });
  } catch (error) {
    return aiFailure(error);
  }
}
