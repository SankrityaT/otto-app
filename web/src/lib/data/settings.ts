import { one, run } from "../db";

// Settings saved from the app. They win over .env, so nobody has to edit files to set things up.

export async function getSetting(key: string): Promise<string | null> {
  return (await one<{ value: string }>("SELECT value FROM settings WHERE key = ?", key))?.value ?? null;
}

export async function setSetting(key: string, value: string | null): Promise<void> {
  if (value === null) await run("DELETE FROM settings WHERE key = ?", key);
  else await run("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value", key, value);
}
