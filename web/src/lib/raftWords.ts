// The raft's fixed words, shared by the server and the screens (no database code here).

export const REACTIONS = ["clap", "proud", "me-too", "wow"] as const;
export type Reaction = (typeof REACTIONS)[number];

/** Phrases a student can pick for "How I work best". Chosen, never typed, so they stay kind and clear. */
export const WORK_STYLES = [
  "One step at a time",
  "Show me, then let me try",
  "Pictures over words",
  "Words over pictures",
  "Quiet is good",
  "Talking it through helps",
  "Give me time to think",
  "Tell me what's changing first",
] as const;
