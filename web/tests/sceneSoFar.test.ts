import { describe, expect, it } from "vitest";
import { sceneSoFar } from "../src/lib/ai/scene";

const part = (id: string) =>
  JSON.stringify({
    id,
    shape: "box",
    position: { x: 0, y: 0.5, z: 0 },
    size: { x: 1, y: 1, z: 1 },
    rotation: { x: 0, y: 0, z: 0 },
    color: "#aabbcc",
    highlight: false,
  });

describe("reading a 3D model while it's still being written", () => {
  it("has nothing before the parts start", () => {
    expect(sceneSoFar('{"title":"Press the ')).toEqual({ title: null, parts: [] });
  });

  it("reads the title once it's complete, even with quotes inside", () => {
    expect(sceneSoFar('{"title":"Press \\"go\\" now","say":"').title).toBe('Press "go" now');
  });

  it("returns only the parts that have closed", () => {
    const json = `{"title":"Cup","say":"Hi","parts":[${part("cup")},${part("lid")},{"id":"stra`;
    expect(sceneSoFar(json).parts.map((p) => p.id)).toEqual(["cup", "lid"]);
  });

  it("isn't fooled by braces inside strings", () => {
    const tricky = part("a").replace('"#aabbcc"', '"#aabbcc"').replace('"a"', '"a{b}"');
    expect(sceneSoFar(`{"parts":[${tricky}]}`).parts.map((p) => p.id)).toEqual(["a{b}"]);
  });

  it("stops at the end of the parts list", () => {
    const json = `{"parts":[${part("a")}],"labels":[{"text":"x","partId":"a","side":"top","tone":"blue"}]}`;
    expect(sceneSoFar(json).parts).toHaveLength(1);
  });
});
