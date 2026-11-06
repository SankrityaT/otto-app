import { config } from "@/lib/config";
import { jsonError } from "@/lib/http";

// Ayin's ears: a short clip of the student talking becomes words (Deepgram). Clips aren't saved,
// and the key stays on the server.

const DEEPGRAM_LISTEN = "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true";
/** About a minute of speech; anything longer isn't someone talking to Ayin. */
const MAX_BYTES = 3_000_000;

export async function POST(request: Request) {
  if (!config.deepgramKey) return jsonError("Listening isn't set up on this server.", 503);
  const type = (request.headers.get("Content-Type") ?? "").split(";")[0];
  if (!type.startsWith("audio/")) return jsonError("Send a voice clip.", 400);
  const audio = new Uint8Array(await request.arrayBuffer());
  if (audio.length === 0 || audio.length > MAX_BYTES) return jsonError("That clip couldn't be heard.", 400);

  const response = await fetch(DEEPGRAM_LISTEN, {
    method: "POST",
    headers: { Authorization: `Token ${config.deepgramKey}`, "Content-Type": type },
    body: audio,
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!response?.ok) return jsonError("Ayin couldn't hear that. Please try again.", 502);
  const body = await response.json().catch(() => null);
  return Response.json({ text: body?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "" });
}
