import { db, now } from "../db";

// The otter's physical buttons. The device reports a press; the screen at the same
// station picks it up and acts exactly as if the on-screen button was tapped.

export const BUTTONS = ["done", "help", "show-me"] as const;
export type Button = (typeof BUTTONS)[number];

export function isButton(value: unknown): value is Button {
  return typeof value === "string" && (BUTTONS as readonly string[]).includes(value);
}

export function recordPress(button: Button): void {
  db.prepare("INSERT INTO button_presses (button, created_at) VALUES (?, ?)").run(button, now());
}

/** Presses after `afterId`, oldest first. The screen remembers the last id it saw. */
export function pressesAfter(afterId: number): { id: number; button: Button }[] {
  return db
    .prepare("SELECT id, button FROM button_presses WHERE id > ? ORDER BY id")
    .all(afterId) as { id: number; button: Button }[];
}
