import type { NextRequest } from "next/server";
import { getPost } from "@/lib/data/raft";
import { jsonError } from "@/lib/http";

/** One post and its replies. Only people in the same raft can see it. */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/raft/posts/[id]">) {
  const { id } = await ctx.params;
  const found = await getPost(id, request.nextUrl.searchParams.get("studentId") ?? "");
  if (!found) return jsonError("Post not found.", 404);
  return Response.json(found);
}
