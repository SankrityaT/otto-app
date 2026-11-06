import { describe, expect, it } from "vitest";
import { ringFill, startOfWeek, stepsOnOwn, type StepLog } from "../src/lib/week";

const logs: StepLog[] = [
  { studentId: "ava", helpLevel: 0, doneAt: "2026-11-02T10:00:00" },
  { studentId: "ava", helpLevel: 2, doneAt: "2026-11-02T10:05:00" },
  { studentId: "ava", helpLevel: 0, doneAt: "2026-11-04T09:00:00" },
  { studentId: "sam", helpLevel: 0, doneAt: "2026-11-03T09:00:00" },
];

describe("weekly rings", () => {
  it("starts the week on Monday", () => {
    const monday = startOfWeek(new Date("2026-11-05T15:00:00")); // a Thursday
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(2);
  });

  it("counts only steps done with no help", () => {
    expect(stepsOnOwn(logs, "ava")).toBe(2);
  });

  it("fills the ring up to 1 and no further", () => {
    expect(ringFill(5, 10)).toBe(0.5);
    expect(ringFill(15, 10)).toBe(1);
    expect(ringFill(3, 0)).toBe(0);
  });
});
