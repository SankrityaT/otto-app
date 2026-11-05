import type { NextRequest } from "next/server";
import { getRoutine } from "@/lib/data/routines";
import { jsonError } from "@/lib/http";

/** One task and its steps, for the printable step card. */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/routines/[id]">) {
  const { id } = await ctx.params;
  const routine = await getRoutine(id);
  if (!routine) return jsonError("Task not found.", 404);
  return Response.json({ routine });
}
