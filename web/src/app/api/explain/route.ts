import { explainScreen } from "@/lib/ai/explain";
import { photoFromDataUrl } from "@/lib/camera";
import { getStudent } from "@/lib/data/crew";
import { transcribe } from "@/lib/hearing";
import { aiFailure, jsonError, readJson } from "@/lib/http";

/** A few seconds of screen is enough to follow along; more would only slow the answer down. */
const MAX_FRAMES = 3;
const MAX_SOUNDS = 3;
/** About a minute of compressed sound, well under the request size limit. */
const MAX_SOUND_BYTES = 1_500_000;
const SOUND = /^data:(audio\/[\w.+-]+)[^,]*;base64,(.+)$/;

/**
 * "What does that mean?" about what's on the student's screen. The screen and its sound are used
 * for this one answer and never saved.
 */
export async function POST(request: Request) {
  const { studentId, question, frames, sounds, history } =
    await readJson(request);
  const student =
    typeof studentId === "string" ? await getStudent(studentId) : null;
  const asked =
    typeof question === "string" ? question.trim().slice(0, 300) : "";
  const pictures = (Array.isArray(frames) ? frames : [])
    .slice(-MAX_FRAMES)
    .map((f) => (typeof f === "string" ? photoFromDataUrl(f) : null))
    .filter((p) => p !== null);
  if (!student || !asked)
    return jsonError("Ask Ayin about your screen first.", 400);
  if (pictures.length === 0)
    return jsonError("Ayin can't see your screen. Try sharing it again.", 400);

  const clips = (Array.isArray(sounds) ? sounds : [])
    .slice(-MAX_SOUNDS)
    .map((s) => (typeof s === "string" ? SOUND.exec(s) : null))
    .filter((m) => m !== null)
    .map((m) => ({
      mimeType: m[1],
      bytes: new Uint8Array(Buffer.from(m[2], "base64")),
    }))
    .filter((c) => c.bytes.length <= MAX_SOUND_BYTES);
  const turns = (Array.isArray(history) ? history : [])
    .filter(
      (t): t is { who: "student" | "ayin"; text: string } =>
        typeof t?.text === "string" &&
        (t.who === "student" || t.who === "ayin"),
    )
    .slice(-6);

  try {
    const heard = (
      await Promise.all(clips.map((c) => transcribe(c.bytes, c.mimeType)))
    )
      .join(" ")
      .trim();
    return Response.json(
      await explainScreen({
        name: student.name,
        question: asked,
        frames: pictures,
        heard,
        history: turns,
      }),
    );
  } catch (error) {
    return aiFailure(error);
  }
}
