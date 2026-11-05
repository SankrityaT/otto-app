// The help ladder and the fading rule. Kept free of I/O so it is easy to test.

export const HELP_LEVELS = {
  onMyOwn: 0,
  nudge: 1,
  hint: 2,
  showMe: 3,
} as const;

export type HelpLevel = (typeof HELP_LEVELS)[keyof typeof HELP_LEVELS];

/** How many runs in a row with no help before the picture fades away. */
export const RUNS_TO_FADE = 3;

/** Each press of "Help" goes one level up, and stops at "show me". */
export function nextHelpLevel(current: HelpLevel): HelpLevel {
  return Math.min(current + 1, HELP_LEVELS.showMe) as HelpLevel;
}

/**
 * Should the step's picture show before the student asks for it?
 *
 * `recentLevels` is the help used on this step in past runs, newest first.
 * After RUNS_TO_FADE runs on their own, the picture stays hidden until they tap
 * "Show me". Any help in those runs brings the picture back.
 */
export function showPictureFirst(recentLevels: number[]): boolean {
  const lastRuns = recentLevels.slice(0, RUNS_TO_FADE);
  const doneAloneEveryTime =
    lastRuns.length === RUNS_TO_FADE && lastRuns.every((level) => level === HELP_LEVELS.onMyOwn);
  return !doneAloneEveryTime;
}
