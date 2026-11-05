import { describe, expect, it } from "vitest";
import { matchBuddies, type StepHistory } from "../src/lib/buddies";

const MASTERED = [0, 0, 0];
const LEARNING = [2, 0];

describe("practice buddies", () => {
  it("pairs a student with someone who has mastered a step they're learning", () => {
    const history: StepHistory[] = [
      { studentId: "sam", stepId: "milk", levels: MASTERED },
      { studentId: "jordan", stepId: "milk", levels: LEARNING },
    ];
    expect(matchBuddies(["sam", "jordan"], history)).toEqual([
      { a: "sam", b: "jordan", aCanShowB: ["milk"], bCanShowA: [] },
    ]);
  });

  it("prefers two-way pairs so both students get to help", () => {
    const history: StepHistory[] = [
      { studentId: "sam", stepId: "milk", levels: MASTERED },
      { studentId: "sam", stepId: "shot", levels: MASTERED },
      { studentId: "ava", stepId: "lid", levels: MASTERED },
      { studentId: "ava", stepId: "milk", levels: LEARNING },
      { studentId: "leo", stepId: "milk", levels: LEARNING },
      { studentId: "leo", stepId: "shot", levels: LEARNING },
      { studentId: "sam", stepId: "lid", levels: LEARNING },
    ];
    const [first] = matchBuddies(["sam", "ava", "leo"], history);
    expect([first.a, first.b]).toEqual(["sam", "ava"]);
    expect(first.aCanShowB).toEqual(["milk"]);
    expect(first.bCanShowA).toEqual(["lid"]);
  });

  it("leaves students out when nobody can help them yet", () => {
    const history: StepHistory[] = [
      { studentId: "sam", stepId: "milk", levels: LEARNING },
      { studentId: "leo", stepId: "milk", levels: LEARNING },
    ];
    expect(matchBuddies(["sam", "leo"], history)).toEqual([]);
  });

  it("never pairs anyone twice", () => {
    const history: StepHistory[] = [
      { studentId: "sam", stepId: "milk", levels: MASTERED },
      { studentId: "ava", stepId: "milk", levels: LEARNING },
      { studentId: "leo", stepId: "milk", levels: LEARNING },
    ];
    const ids = matchBuddies(["sam", "ava", "leo"], history).flatMap((p) => [p.a, p.b]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
