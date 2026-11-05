import { z } from "zod";
import { askClaude, type Photo } from "./client";

// "Show me" in 3D: Claude builds the thing the student is stuck on out of simple shapes
// and labels the parts that matter. The browser renders it with three.js.

const Vec = z.object({ x: z.number(), y: z.number(), z: z.number() });

const Part = z.object({
  id: z.string().describe("Short unique name, like 'steam-knob'"),
  shape: z.enum(["box", "cylinder", "sphere", "cone", "torus"]),
  position: Vec.describe("Centre of the shape. The whole model fits inside -2..2 on every axis; y is up"),
  size: Vec.describe("Width, height and depth. Cylinders and cones use x as the diameter and y as the height"),
  rotation: Vec.describe("Rotation in degrees around each axis"),
  color: z.string().describe("Hex colour, muted and realistic"),
  highlight: z.boolean().describe("True only for the one part the student must act on"),
});

const Label = z.object({
  text: z.string().describe("1-3 words"),
  partId: z.string().describe("The id of the part this label points at"),
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
  say: z.string().describe("What Ayin says out loud: one or two short sentences"),
  parts: z.array(Part).min(1).max(40),
  labels: z.array(Label).max(6),
  arrows: z.array(Arrow).max(4),
});

export type Scene = z.infer<typeof Scene>;

/** Build a simple 3D model of the step, with labels on the parts that matter. */
export function buildScene(taskTitle: string, step: { text: string; detail: string }, photo?: Photo | null): Promise<Scene> {
  return askClaude({
    schema: Scene,
    photo,
    effort: "low",
    maxTokens: 16000,
    instructions: `A student doing "${taskTitle}" is stuck on this step: "${step.text}" (${step.detail}).
${photo ? "The photo shows what they see right now. Model the real object in it." : ""}
Build a simple 3D model of the object they need to use, out of basic shapes, so they can see exactly
what to do. Recognisable, not detailed: 8 to 30 shapes is usually enough.
Mark the one part they must act on with highlight: true and label it. Label at most 5 other parts.
Use an arrow to show a movement (press, turn, pour) when the step has one.`,
  });
}

/** Parse a scene saved earlier. Returns null if it no longer matches the shape. */
export function parseScene(json: string): Scene | null {
  const result = Scene.safeParse(JSON.parse(json));
  return result.success ? result.data : null;
}
