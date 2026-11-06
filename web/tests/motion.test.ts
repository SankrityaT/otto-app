import { describe, expect, it } from "vitest";
import { frameChange, MOVING, STILL_MS, stillAfterMotion } from "../src/lib/motion";

describe("hands-free checking", () => {
  it("measures how much two frames differ", () => {
    expect(frameChange([10, 10, 10, 255], [10, 10, 10, 255])).toBe(0);
    expect(frameChange([0, 0, 0, 255], [30, 30, 30, 0])).toBe(30); // alpha is ignored
  });

  it("looks once after moving and then holding still", () => {
    const shouldLook = stillAfterMotion();
    expect(shouldLook(MOVING + 5, 0)).toBe(false);
    expect(shouldLook(1, 500)).toBe(false);
    expect(shouldLook(1, STILL_MS)).toBe(true);
    expect(shouldLook(1, STILL_MS + 2000)).toBe(false);
  });

  it("never looks at a scene that hasn't moved", () => {
    const shouldLook = stillAfterMotion();
    expect(shouldLook(0, 0)).toBe(false);
    expect(shouldLook(0, 10_000)).toBe(false);
  });
});
