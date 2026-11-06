import { describe, expect, it } from "vitest";
import { safeReply, WONT_HELP } from "../src/lib/ai/safety";

describe("safeReply", () => {
  it("leaves normal talk alone", () => {
    expect(safeReply("Nice work on the latte.", "none")).toBe("Nice work on the latte.");
  });

  it("always gives staff and 988 when someone may be at risk", () => {
    const said = safeReply("You matter.", "at-risk");
    expect(said).toContain("staff member");
    expect(said).toContain("988");
  });

  it("doesn't repeat what Claude already said", () => {
    const said = safeReply("You matter. Talk to a staff member now. You can call or text 988.", "at-risk");
    expect(said.match(/988/g)).toHaveLength(1);
    expect(said.match(/staff/g)).toHaveLength(1);
  });

  it("points to people when Ayin won't help", () => {
    expect(WONT_HELP).toContain("staff member");
    expect(WONT_HELP).toContain("988");
  });
});
