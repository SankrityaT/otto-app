import { describe, expect, it } from "vitest";
import { hasBlockedWords } from "../src/lib/cleanWords";

describe("clean-language check", () => {
  it("lets ordinary words through", () => {
    expect(hasBlockedWords("Pour slowly when it gets close to the line")).toBe(false);
    expect(hasBlockedWords("I passed the class")).toBe(false);
  });

  it("catches swear words", () => {
    expect(hasBlockedWords("this is shit")).toBe(true);
  });

  it("catches disguised swear words", () => {
    expect(hasBlockedWords("sh1t")).toBe(true);
    expect(hasBlockedWords("f.u.c.k")).toBe(true);
    expect(hasBlockedWords("fuuuuck")).toBe(true);
  });
});
