import type { NextRequest } from "next/server";
import { reviewPost } from "@/lib/ai/moderate";
import { addReply } from "@/lib/data/raft";
import { aiFailure, jsonError, readJson } from "@/lib/http";

/** Answer a post. Ayin reviews replies the same way as posts. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/raft/posts/[id]/replies">) {
  const { id } = await ctx.params;
  const { authorId, body } = await readJson(request);
  const text = typeof body === "string" ? body.trim().slice(0, 400) : "";
  if (typeof authorId !== "string" || !text) return jsonError("Write a few words first.", 400);
  try {
    const review = await reviewPost(text, null);
    if (!review.ok) return Response.json({ shared: false, review });
    if (!addReply(id, authorId, text)) return jsonError("Post not found.", 404);
    return Response.json({ shared: true }, { status: 201 });
  } catch (error) {
    return aiFailure(error);
  }
}
