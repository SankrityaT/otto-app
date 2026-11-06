import { hasBlockedWords } from "./cleanWords";

// Students only ever give a first name, and raftmates see it, so it's checked on the screen
// (to say so straight away) and again on the server.

const NAME = /^\p{L}[\p{L}'\- ]{0,23}$/u;

/** A first name that's safe to show the raft: letters only, short, no swear words. Null if not. */
export function safeName(name: string): string | null {
  const trimmed = name.trim().replace(/\s+/g, " ");
  return NAME.test(trimmed) && !hasBlockedWords(trimmed) ? trimmed : null;
}

export const NAME_HINT = "Please use just your first name, in letters.";
