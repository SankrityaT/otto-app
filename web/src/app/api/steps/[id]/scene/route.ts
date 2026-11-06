import type { NextRequest } from "next/server";
import { buildScene, parseScene } from "@/lib/ai/scene";
import { getPhoto } from "@/lib/camera";
import { getStep, saveScene } from "@/lib/data/routines";
import { aiFailure, jsonError, readJson } from "@/lib/http";

/** "Show me" in 3D. A model built before comes back straight away; a new one is built once and saved. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/steps/[id]/scene">) {
  const { id } = await ctx.params;
  const step = await getStep(id);
  if (!step) return jsonError("Step not found.", 404);

  const saved = step.sceneJson ? parseScene(step.sceneJson) : null;
  if (saved) return Response.json({ scene: saved });

  const { photo } = await readJson(request);
  try {
    const scene = await buildScene(step.routineTitle, step, await getPhoto(photo).catch(() => null));
    await saveScene(id, JSON.stringify(scene));
    return Response.json({ scene });
  } catch (error) {
    return aiFailure(error);
  }
}
