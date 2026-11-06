import { config } from "./config";

// Ayin's voice. Cartesia Sonic sounds the most natural and starts fastest; Deepgram Aura is the
// backup if Cartesia is down or out of credit. Nothing said is saved.

const CARTESIA = "https://api.cartesia.ai/tts/bytes";
const CARTESIA_VERSION = "2026-08-14";
const DEEPGRAM = "https://api.deepgram.com/v1/speak";

/** Spoken audio (mp3) for some text, or null if no voice service is set up or answering. */
export async function speakAloud(text: string): Promise<ArrayBuffer | null> {
  if (config.cartesiaKey) {
    const response = await fetch(CARTESIA, {
      method: "POST",
      headers: { "X-API-Key": config.cartesiaKey, "Cartesia-Version": CARTESIA_VERSION, "Content-Type": "application/json" },
      body: JSON.stringify({
        model_id: "sonic-3.6",
        transcript: text,
        voice: { mode: "id", id: config.voiceId },
        output_format: { container: "mp3", sample_rate: 44100, bit_rate: 128000 },
      }),
    }).catch(() => null);
    if (response?.ok) return response.arrayBuffer();
  }
  if (config.deepgramKey) {
    const response = await fetch(`${DEEPGRAM}?model=${encodeURIComponent(config.backupVoice)}`, {
      method: "POST",
      headers: { Authorization: `Token ${config.deepgramKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }).catch(() => null);
    if (response?.ok) return response.arrayBuffer();
  }
  return null;
}
