import type { NextRequest } from "next/server";
import { toggleReaction, type Reaction } from "@/lib/data/raft";
import { jsonError, readJson } from "@/lib/http";

export async function POST(request: NextRequest, ctx: RouteContext<"/api/raft/posts/[id]/react">) {
  const { id } = await ctx.params;
  const { studentId, kind } = await readJson(request);
  if (typeof studentId !== "string" || !toggleReaction(id, studentId, kind as Reaction)) {
    return jsonError("That reaction can't be added.", 400);
  }
  return Response.json({ ok: true });
}
