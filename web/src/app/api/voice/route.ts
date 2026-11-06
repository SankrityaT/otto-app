import { jsonError, readJson } from "@/lib/http";
import { speakAloud } from "@/lib/voice";

/** What Otto says, as spoken audio. 204 means "no voice service here", so the browser speaks instead. */
export async function POST(request: Request) {
  const { text } = await readJson(request);
  if (typeof text !== "string" || !text.trim()) return jsonError("Nothing to say.", 400);
  const audio = await speakAloud(text.trim().slice(0, 600));
  if (!audio) return new Response(null, { status: 204 });
  return new Response(audio, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
}
