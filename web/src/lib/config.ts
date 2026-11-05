// All settings come from the environment (see .env.example), so nothing is hardcoded.

export const config = {
  /** Claude model used for steps, checks, hints and pictures. */
  model: process.env.AYIN_MODEL ?? "claude-opus-5-5",

  /** Where the SQLite file lives. */
  databasePath: process.env.AYIN_DB_PATH ?? "data/ayin.db",

  /**
   * Optional network camera (the otter). When set, the server takes a photo from
   * `${cameraUrl}/capture` instead of expecting one from the browser.
   */
  cameraUrl: process.env.AYIN_CAMERA_URL || null,

  /** Optional shared secret the otter sends with button presses (header x-device-token). */
  deviceToken: process.env.AYIN_DEVICE_TOKEN || null,
};
