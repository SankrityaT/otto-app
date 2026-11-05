import type { NextRequest } from "next/server";
import { setBlocked } from "@/lib/data/raft";
import { jsonError, readJson } from "@/lib/http";

/** Block or unblock a raftmate. Blocking hides each other's posts and replies. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/raft/people/[id]/block">) {
  const { id } = await ctx.params;
  const { studentId, blocked } = await readJson(request);
  if (typeof studentId !== "string" || typeof blocked !== "boolean" || !setBlocked(studentId, id, blocked)) {
    return jsonError("That can't be changed.", 400);
  }
  return Response.json({ ok: true });
}
