import type { NextRequest } from "next/server";
import { profile, updateProfile, WORK_STYLES } from "@/lib/data/raft";
import { jsonError, readJson } from "@/lib/http";

/** A student's profile: their otter, goal, how they work best, and what they can help with. */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/raft/people/[id]">) {
  const { id } = await ctx.params;
  const found = profile(id);
  if (!found) return jsonError("Student not found.", 404);
  return Response.json({ profile: found, workStyles: WORK_STYLES });
}

/** Students change their own goal and how they work best. */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/raft/people/[id]">) {
  const { id } = await ctx.params;
  const { goal, goalRoutineId, workStyle } = await readJson(request);
  const ok = updateProfile(id, {
    goal: typeof goal === "string" || goal === null ? goal : undefined,
    goalRoutineId: typeof goalRoutineId === "string" ? goalRoutineId : null,
    workStyle: Array.isArray(workStyle) ? workStyle.filter((w): w is string => typeof w === "string") : undefined,
  });
  if (!ok) return jsonError("Student not found.", 404);
  return Response.json({ ok: true });
}
