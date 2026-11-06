// All settings come from the environment (see .env.example), so nothing is hardcoded.

export const config = {
  /** Claude model used for steps, checks, hints and pictures. */
  model: process.env.AYIN_MODEL ?? "claude-opus-5-5",

  /** The Postgres database (Supabase): its connection string, from the project's pooler settings. */
  databaseUrl: process.env.DATABASE_URL || null,

  /** Otto's voice: Cartesia first, Deepgram Aura if Cartesia can't answer, else the browser's own voice. */
  cartesiaKey: process.env.CARTESIA_API_KEY || null,
  /** A Cartesia voice id. The default is "Celine": relaxed, with a gentle warmth. */
  voiceId: process.env.AYIN_VOICE_ID ?? "ca566b43-944e-4474-b494-7d9f0695f307",
  deepgramKey: process.env.DEEPGRAM_API_KEY || null,
  backupVoice: process.env.AYIN_BACKUP_VOICE ?? "aura-2-helena-en",

  /**
   * Optional network camera (the otter). When set, the server takes a photo from
   * `${cameraUrl}/capture` instead of expecting one from the browser.
   */
  cameraUrl: process.env.AYIN_CAMERA_URL || null,

  /** Optional shared secret the otter sends with button presses (header x-device-token). */
  deviceToken: process.env.AYIN_DEVICE_TOKEN || null,
};
