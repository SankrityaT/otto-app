import { describe, expect, it } from "vitest";
import { safeName } from "../src/lib/names";

describe("safeName", () => {
  it("keeps a first name, tidied", () => {
    expect(safeName("  Maya ")).toBe("Maya");
    expect(safeName("José")).toBe("José");
    expect(safeName("Mary  Ann")).toBe("Mary Ann");
  });

  it("refuses anything that isn't a short name in letters", () => {
    expect(safeName("")).toBeNull();
    expect(safeName("maya@school.org")).toBeNull();
    expect(safeName("602 555 0100")).toBeNull();
    expect(safeName("a".repeat(30))).toBeNull();
  });

  it("refuses swear words, even disguised", () => {
    expect(safeName("shit")).toBeNull();
    expect(safeName("Fuuuck")).toBeNull();
    expect(safeName("Sexy")).toBeNull();
    expect(safeName("N4ked")).toBeNull();
  });
});
