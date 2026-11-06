import type { NextRequest } from "next/server";
import { reportPost } from "@/lib/data/raft";
import { jsonError, readJson } from "@/lib/http";

/** Hide a post and leave it for staff. One tap, no questions asked. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/raft/posts/[id]/report">) {
  const { id } = await ctx.params;
  const { studentId } = await readJson(request);
  if (typeof studentId !== "string" || !await reportPost(id, studentId)) return jsonError("That post can't be reported.", 400);
  return Response.json({ ok: true });
}
