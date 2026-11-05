import { reviewPost } from "@/lib/ai/moderate";
import { photoFromDataUrl } from "@/lib/camera";
import { hasBlockedWords } from "@/lib/cleanWords";
import { createPost } from "@/lib/data/raft";
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
 * Share a win or ask for help. Ayin reviews it first; if something might hurt or isn't safe,
 * nothing is saved and the student gets a kinder way to say it.
 */
export async function POST(request: Request) {
  const { authorId, kind, body, photo, stepId } = await readJson(request);
  const text = typeof body === "string" ? body.trim().slice(0, 500) : "";
  if (typeof authorId !== "string" || (kind !== "win" && kind !== "ask") || !text) {
    return jsonError("Write a few words first.", 400);
  }
  const photoUrl = typeof photo === "string" && photo.length <= MAX_PHOTO_CHARS ? photo : null;

  if (hasBlockedWords(text)) return Response.json({ shared: false, review: CLEAN_WORDS_REVIEW });

  try {
    const review = await reviewPost(text, photoUrl ? photoFromDataUrl(photoUrl) : null);
    if (!review.ok) return Response.json({ shared: false, review });
    const id = createPost({ authorId, kind, body: text, photo: photoUrl, stepId: typeof stepId === "string" ? stepId : null });
    if (!id) return jsonError("You're not in a raft yet.", 400);
    return Response.json({ shared: true, id }, { status: 201 });
  } catch (error) {
    return aiFailure(error);
  }
}
