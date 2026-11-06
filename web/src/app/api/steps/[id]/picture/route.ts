import type { NextRequest } from "next/server";
import { aiFailure, jsonError } from "@/lib/http";
import { pictureFor } from "@/lib/pictures";

/** The step's diagram as an SVG image. Drawn the first time, then reused. */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/steps/[id]/picture">) {
  const { id } = await ctx.params;
  let svg: string | null;
  try {
    svg = await pictureFor(id);
  } catch (error) {
    return aiFailure(error);
  }
  if (!svg) return jsonError("No picture for this step.", 404);

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
