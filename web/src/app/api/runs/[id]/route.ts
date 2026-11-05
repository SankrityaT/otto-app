import type { NextRequest } from "next/server";
import { getRun, runSummary } from "@/lib/data/runs";
import { jsonError } from "@/lib/http";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/runs/[id]">) {
  const { id } = await ctx.params;
  const run = getRun(id);
  if (!run) return jsonError("Run not found.", 404);
  return Response.json({ run, summary: runSummary(id) });
}
