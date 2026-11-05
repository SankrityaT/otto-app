import { config } from "./config";

// What a video on the student's screen just said: Deepgram turns a few seconds of the shared
// tab's sound into words, for that one answer. Nothing is saved.

const DEEPGRAM_LISTEN =
  "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true";

/** The words in a short clip of sound, or "" if there's no hearing service or nothing was said. */
export async function transcribe(
  audio: Uint8Array<ArrayBuffer>,
  mimeType: string,
): Promise<string> {
  if (!config.deepgramKey || audio.length === 0) return "";
  const response = await fetch(DEEPGRAM_LISTEN, {
    method: "POST",
    headers: {
      Authorization: `Token ${config.deepgramKey}`,
      "Content-Type": mimeType,
    },
    body: audio,
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!response?.ok) return "";
  const body = await response.json().catch(() => null);
  return body?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
}
