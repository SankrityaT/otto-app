import { describe, expect, it } from "vitest";
import { isSafeSvg } from "../src/lib/ai/picture";

describe("isSafeSvg", () => {
  it("accepts plain shapes", () => {
    expect(isSafeSvg('<svg viewBox="0 0 400 300"><rect width="10" height="10"/></svg>')).toBe(true);
  });

  it("accepts links inside the same drawing", () => {
    expect(isSafeSvg('<svg viewBox="0 0 400 300"><rect fill="url(#g)"/></svg>')).toBe(true);
  });

  it.each([
    '<svg><script>alert(1)</script></svg>',
    '<svg><rect onclick="alert(1)"/></svg>',
    '<svg><a href="https://example.com"><rect/></a></svg>',
    '<svg><image href="x.png"/></svg>',
    '<svg><rect style="fill:url(https://example.com/x)"/></svg>',
    "<div>not svg</div>",
  ])("rejects %s", (svg) => {
    expect(isSafeSvg(svg)).toBe(false);
  });
});
