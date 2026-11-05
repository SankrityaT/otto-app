import type { NextRequest } from "next/server";
import { AyinAIError } from "@/lib/ai/client";
import { buildScene, parseScene } from "@/lib/ai/scene";
import { getPhoto } from "@/lib/camera";
import { getStep, saveScene } from "@/lib/data/routines";
import { jsonError, readJson } from "@/lib/http";

/**
 * "Show me" in 3D. A model built before comes back straight away. A new one is streamed, one
 * line of JSON at a time, so the student can watch it being built: `{"building": …}` each time
 * another part is ready, then `{"scene": …}` when it's done (or `{"error": …}`).
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/steps/[id]/scene">) {
  const { id } = await ctx.params;
  const step = await getStep(id);
  if (!step) return jsonError("Step not found.", 404);

  const saved = step.sceneJson ? parseScene(step.sceneJson) : null;
  if (saved) return Response.json({ scene: saved });

  const { photo } = await readJson(request);
  const seen = await getPhoto(photo).catch(() => null);
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (line: object) => controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`));
      try {
        const scene = await buildScene(step.routineTitle, step, seen, (building) => send({ building }));
        await saveScene(id, JSON.stringify(scene));
        send({ scene });
      } catch (error) {
        console.error(error);
        send({ error: error instanceof AyinAIError ? error.message : "Ayin couldn't build that model. Please try again." });
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
}
