import type { NextRequest } from "next/server";
import { splitStep } from "@/lib/ai/steps";
import { getStep, replaceStep } from "@/lib/data/routines";
import { aiFailure, jsonError } from "@/lib/http";

/** "Smaller steps": break one step that feels too big into 2 to 4 smaller ones. */
export async function POST(_request: NextRequest, ctx: RouteContext<"/api/steps/[id]/split">) {
  const { id } = await ctx.params;
  const step = await getStep(id);
  if (!step) return jsonError("Step not found.", 404);
  try {
    await replaceStep(id, await splitStep(step.routineTitle, step));
    return Response.json({ ok: true });
  } catch (error) {
    return aiFailure(error);
  }
}
