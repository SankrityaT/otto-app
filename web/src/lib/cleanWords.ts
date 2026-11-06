// A fast first check for swear words, before Ayin's fuller kindness check. It runs even if
// the AI is slow or down, so the raft never shows these words to students.

const BLOCKED = [
  "fuck", "shit", "bitch", "bastard", "asshole", "dick", "cunt", "piss", "crap", "damn",
  "slut", "whore", "retard", "stupid ass", "dumbass", "jackass", "wtf", "stfu", "kys",
];

/** Undo common tricks like "sh1t", "f.u.c.k" or "fuuuck" before checking. */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[0@]/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/3/g, "e")
    .replace(/[4]/g, "a")
    .replace(/[5$]/g, "s")
    .replace(/[^a-z\s]/g, "")
    .replace(/(.)\1{2,}/g, "$1");
}

/** True if the text has a blocked word in it, even when disguised. */
export function hasBlockedWords(text: string): boolean {
  const clean = normalise(text);
  const squashed = clean.replace(/\s+/g, "");
  return BLOCKED.some((word) => {
    const w = word.replace(/\s+/g, "");
    return new RegExp(`\\b${word}`).test(clean) || (w.length >= 4 && squashed.includes(w));
  });
}
