import type { NextRequest } from "next/server";
import { drawStep } from "@/lib/ai/picture";
import { getStep, savePicture } from "@/lib/data/routines";
import { aiFailure, jsonError } from "@/lib/http";

/** The step's picture as an SVG image. Drawn the first time, then reused. */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/steps/[id]/picture">) {
  const { id } = await ctx.params;
  const step = getStep(id);
  if (!step) return jsonError("Step not found.", 404);

  let svg = step.pictureSvg;
  if (!svg) {
    try {
      svg = await drawStep(step.routineTitle, step);
    } catch (error) {
      return aiFailure(error);
    }
    if (!svg) return jsonError("No picture for this step.", 404);
    savePicture(id, svg);
  }

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
