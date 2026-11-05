import { describe, expect, it } from "vitest";
import { stageFor, type RunResult } from "../src/lib/stages";

const alone: RunResult = { onOwn: 6, total: 6, mostHelp: 0 };
const nudged: RunResult = { onOwn: 5, total: 6, mostHelp: 1 };
const helped: RunResult = { onOwn: 3, total: 6, mostHelp: 3 };

describe("First Place's five stages", () => {
  it("starts by watching", () => {
    expect(stageFor([])).toBe(1);
  });

  it("treats the first run as a first try", () => {
    expect(stageFor([helped])).toBe(2);
  });

  it("stays with help while hints or show me are needed", () => {
    expect(stageFor([helped, nudged])).toBe(3);
  });

  it("moves to check-in when only nudges are needed", () => {
    expect(stageFor([nudged, helped])).toBe(4);
  });

  it("reaches on my own after 3 runs fully alone", () => {
    expect(stageFor([alone, alone, alone, helped])).toBe(5);
  });

  it("steps back down if help is needed again", () => {
    expect(stageFor([helped, alone, alone, alone])).toBe(3);
  });
});
