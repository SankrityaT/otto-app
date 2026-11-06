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

const RAFT_NAME = /^[\p{L}\p{N}][\p{L}\p{N}'\- ]{0,29}$/u;

/** A raft's name, like "Café raft": letters and numbers, short, no swear words. Null if not. */
export function safeRaftName(name: string): string | null {
  const trimmed = name.trim().replace(/\s+/g, " ");
  return RAFT_NAME.test(trimmed) && !hasBlockedWords(trimmed) ? trimmed : null;
}

export const RAFT_NAME_HINT = "Give your raft a short name, in letters or numbers.";
