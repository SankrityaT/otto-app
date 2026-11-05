// First Place AZ teaches a skill in five stages: watch someone do it, try it while staff see
// what you can do, do it with help, do it while someone checks in, then do it alone.
// Ayin follows the same path for each student and each task, worked out from their log.
// Kept free of I/O so it is easy to test.

export const STAGES = [
  { name: "Watch", says: "See every step before you try." },
  { name: "First tries", says: "Ayin shows each step and sees what you can do." },
  { name: "With help", says: "Ayin shows each step and helps when you ask." },
  { name: "Check-in", says: "You lead. Ayin checks each step." },
  { name: "On my own", says: "You know this one. Ayin just checks at the end." },
] as const;

export type Stage = 1 | 2 | 3 | 4 | 5;

/** How a finished run went. */
export interface RunResult {
  onOwn: number;
  total: number;
  /** The most help any step took: 0 none, 1 nudge, 2 hint, 3 show me. */
  mostHelp: number;
}

/** Runs in a row done fully on their own before Ayin steps back to "On my own". */
export const RUNS_ON_OWN_TO_FINISH = 3;

/** The student's stage for a task, from their finished runs of it, newest first. */
export function stageFor(runs: RunResult[]): Stage {
  if (runs.length === 0) return 1;
  if (runs.length === 1) return 2;
  const recent = runs.slice(0, RUNS_ON_OWN_TO_FINISH);
  if (recent.length === RUNS_ON_OWN_TO_FINISH && recent.every((r) => r.onOwn === r.total)) return 5;
  return runs[0].mostHelp <= 1 ? 4 : 3;
}
