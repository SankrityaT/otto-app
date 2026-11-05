import type { NextRequest } from "next/server";
import { markHelped } from "@/lib/data/raft";
import { jsonError, readJson } from "@/lib/http";

/** The person who asked says an answer helped. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/raft/replies/[id]/helped">) {
  const { id } = await ctx.params;
  const { studentId } = await readJson(request);
  if (typeof studentId !== "string" || !markHelped(id, studentId)) return jsonError("Only the person who asked can say that.", 400);
  return Response.json({ ok: true });
}
