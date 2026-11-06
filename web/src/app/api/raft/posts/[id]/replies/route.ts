import type { NextRequest } from "next/server";
import { reviewPost } from "@/lib/ai/moderate";
import { photoFromDataUrl } from "@/lib/camera";
import { hasBlockedWords } from "@/lib/cleanWords";
import { addReply } from "@/lib/data/raft";
import { aiFailure, jsonError, readJson } from "@/lib/http";

/** What a student sees when the fast clean-language check catches a word. */
const CLEAN_WORDS_REVIEW = {
  ok: false,
  problem: "might-hurt" as const,
  why: "Let's keep words clean in the raft. Try saying it another way.",
  kinderVersion: null,
};

/** Largest shared photo we keep, as a data URL. The app shrinks photos before sending. */
const MAX_PHOTO_CHARS = 700_000;

/**
 * Answer a post. A helper can add a photo of their work or share the step's 3D model, so the
 * otters can help each other the way Ayin helps one student. Ayin reviews every reply first.
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/raft/posts/[id]/replies">) {
  const { id } = await ctx.params;
  const { authorId, body, photo, sceneStepId } = await readJson(request);
  const text = typeof body === "string" ? body.trim().slice(0, 400) : "";
  if (typeof authorId !== "string" || !text) return jsonError("Write a few words first.", 400);
  if (hasBlockedWords(text)) return Response.json({ shared: false, review: CLEAN_WORDS_REVIEW });
  const photoUrl = typeof photo === "string" && photo.length <= MAX_PHOTO_CHARS ? photo : null;

  try {
    const review = await reviewPost(text, photoUrl ? photoFromDataUrl(photoUrl) : null);
    if (!review.ok) return Response.json({ shared: false, review });
    const saved = await addReply(id, authorId, text, {
      photo: photoUrl,
      sceneStepId: typeof sceneStepId === "string" ? sceneStepId : null,
    });
    if (!saved) return jsonError("This post isn't available.", 404);
    return Response.json({ shared: true }, { status: 201 });
  } catch (error) {
    return aiFailure(error);
  }
}
