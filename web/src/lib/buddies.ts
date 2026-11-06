// Practice buddies: pair crewmates so each can show the other a step they've mastered.
// Kept free of I/O so it is easy to test.
//
// "Mastered" uses the same rule as fading: RUNS_TO_FADE runs in a row with no help.
// So the help a student no longer needs from Otto is exactly what they can now offer a
// crewmate. Today's helped becomes tomorrow's helper.

import { RUNS_TO_FADE } from "./help";

export interface StepHistory {
  studentId: string;
  stepId: string;
  /** Help used on this step, newest run first. */
  levels: number[];
}

export interface Pairing {
  a: string;
  b: string;
  /** Steps a has mastered that b still needs help with. */
  aCanShowB: string[];
  /** Steps b has mastered that a still needs help with. */
  bCanShowA: string[];
}

const mastered = (levels: number[]) =>
  levels.length >= RUNS_TO_FADE && levels.slice(0, RUNS_TO_FADE).every((level) => level === 0);

const stillLearning = (levels: number[]) => levels.length > 0 && !mastered(levels);

/** Steps `teacher` has mastered that `learner` is still learning. */
function canShow(history: StepHistory[], teacher: string, learner: string): string[] {
  const learning = new Set(
    history.filter((h) => h.studentId === learner && stillLearning(h.levels)).map((h) => h.stepId),
  );
  return history
    .filter((h) => h.studentId === teacher && mastered(h.levels) && learning.has(h.stepId))
    .map((h) => h.stepId);
}

/**
 * Pair every student with the crewmate they can help most and learn most from.
 * Two-way pairs score higher than one-way ones, so both people get to be the helper.
 * Students with nothing to swap yet are left out rather than forced into a pair.
 */
export function matchBuddies(studentIds: string[], history: StepHistory[]): Pairing[] {
  const candidates: (Pairing & { score: number })[] = [];
  for (const [i, a] of studentIds.entries()) {
    for (const b of studentIds.slice(i + 1)) {
      const aCanShowB = canShow(history, a, b);
      const bCanShowA = canShow(history, b, a);
      const twoWay = aCanShowB.length > 0 && bCanShowA.length > 0;
      const score = aCanShowB.length + bCanShowA.length + (twoWay ? 10 : 0);
      if (score > 0) candidates.push({ a, b, aCanShowB, bCanShowA, score });
    }
  }

  const paired = new Set<string>();
  const pairings: Pairing[] = [];
  for (const { a, b, aCanShowB, bCanShowA } of candidates.sort((x, y) => y.score - x.score)) {
    if (paired.has(a) || paired.has(b)) continue;
    paired.add(a);
    paired.add(b);
    pairings.push({ a, b, aCanShowB, bCanShowA });
  }
  return pairings;
}
