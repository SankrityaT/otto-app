import { describe, expect, it } from "vitest";
import { HELP_LEVELS, nextHelpLevel, showPictureFirst } from "../src/lib/help";

describe("help ladder", () => {
  it("goes up one level per press and stops at show me", () => {
    expect(nextHelpLevel(HELP_LEVELS.onMyOwn)).toBe(HELP_LEVELS.nudge);
    expect(nextHelpLevel(HELP_LEVELS.hint)).toBe(HELP_LEVELS.showMe);
    expect(nextHelpLevel(HELP_LEVELS.showMe)).toBe(HELP_LEVELS.showMe);
  });
});

describe("fading", () => {
  it("shows the picture on a new step", () => {
    expect(showPictureFirst([])).toBe(true);
  });

  it("hides the picture after 3 runs on my own", () => {
    expect(showPictureFirst([0, 0, 0])).toBe(false);
  });

  it("brings the picture back if any recent run needed help", () => {
    expect(showPictureFirst([0, 2, 0])).toBe(true);
  });

  it("needs 3 runs before fading", () => {
    expect(showPictureFirst([0, 0])).toBe(true);
  });
});
