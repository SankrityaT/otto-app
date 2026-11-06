import { z } from "zod";
import { askClaude, type Photo } from "./client";

// "Show me" in 3D: Claude builds the thing the student is stuck on out of simple shapes
// and labels the parts that matter. The browser renders it with three.js.

const Vec = z.object({ x: z.number(), y: z.number(), z: z.number() });

const Part = z.object({
  id: z.string().describe("Short unique name, like 'steam-knob'"),
  shape: z
    .enum(["box", "rounded-box", "cylinder", "cup", "sphere", "cone", "torus"])
    .describe(
      "cup = a hollow container open at the top (cups, jugs, bowls, bins). rounded-box = a box with soft edges (machines, devices, boards)",
    ),
  position: Vec.describe("Centre of the shape. y is up and the table top is y = 0, so things resting on it have y = height / 2"),
  size: Vec.describe(
    "x = width, y = height, z = depth. For cylinder, cup and cone: x is the diameter and y is the height. For torus: x is the ring's diameter and the smallest size is how thick the ring is",
  ),
  rotation: Vec.describe(
    "Degrees around each axis. Leave 0,0,0 for anything standing upright: cylinders, cups and cones already stand on their base. A torus starts standing up facing the viewer like a ring; rotate x by 90 to lay it flat",
  ),
  color: z.string().describe("Hex colour, muted and realistic"),
  highlight: z.boolean().describe("True only for the one part the student must act on"),
});

const Label = z.object({
  text: z.string().describe("1-2 words"),
  partId: z.string().describe("The id of the part this label points at. Never label the same part twice"),
  side: z.enum(["top", "bottom"]).describe("Whether the label sits above or below the model"),
  tone: z.enum(["yellow", "pink", "blue", "green"]),
});

const Arrow = z.object({
  from: Vec,
  to: Vec,
  meaning: z.string().describe("1-3 words, like 'push down'"),
});

const Scene = z.object({
  title: z.string().describe("The idea in 6 words or fewer, like 'Turn the knob to steam'"),
  say: z.string().describe("What Otto says out loud: one or two short sentences"),
  parts: z.array(Part).min(1).max(40),
  labels: z.array(Label).max(4),
  arrows: z.array(Arrow).max(4),
});

export type Scene = z.infer<typeof Scene>;
/** Build a simple 3D model of the step, with labels on the parts that matter. */
export async function buildScene(
  taskTitle: string,
  step: { text: string; detail: string },
  photo?: Photo | null,
): Promise<Scene> {
  const scene = await askClaude({
    schema: Scene,
    photo,
    effort: "medium",
    maxTokens: 16000,
    instructions: `A student doing "${taskTitle}" is stuck on this step: "${step.text}" (${step.detail}).
${photo ? "The photo shows what they see right now. Model the real objects in it." : ""}
Build a simple, accurate 3D model of the objects this step uses, so the student can see exactly what to do.
- Model only what the step needs, at real-world proportions relative to each other, resting on the table (y = 0).
- Use the right shape: a cup, jug or bowl is a "cup", not a torus. Handles can be a small torus on the side.
- Recognisable, not detailed: 4 to 20 shapes. Keep everything within -2..2 on x and z.
- Mark the one part to act on with highlight: true and label it. Label at most 3 other parts, each a different part.
- If the step has a movement (pour, press, turn, push), add one arrow showing it.
Before answering, check every shape stands the right way up and sits where it would in real life.`,
  });
  // One label per part, so notes never pile up on the same spot.
  const seen = new Set<string>();
  return { ...scene, labels: scene.labels.filter((label) => !seen.has(label.partId) && seen.add(label.partId)) };
}

/** Parse a scene saved earlier. Returns null if it no longer matches the shape. */
export function parseScene(json: string): Scene | null {
  const result = Scene.safeParse(JSON.parse(json));
  return result.success ? result.data : null;
}
