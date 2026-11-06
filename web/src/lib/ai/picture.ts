import { z } from "zod";
import { askClaude } from "./client";

const Picture = z.object({
  svg: z.string().describe("A complete <svg> element, viewBox 0 0 400 300"),
});

/** Draw one simple picture for a step. The result is checked by `isSafeSvg` before use. */
export async function drawStep(taskTitle: string, step: { text: string; detail: string }): Promise<string | null> {
  const picture = await askClaude({
    schema: Picture,
    effort: "low",
    maxTokens: 6000,
    instructions: `Draw a simple picture for one step of the task "${taskTitle}".
Step: "${step.text}" (${step.detail})

Rules for the drawing:
- Flat, calm, friendly line drawing. viewBox="0 0 400 300", no width or height attributes.
- Colours: outlines #2B2A28, fills #F6EFE4 and #E8DCC8, and one highlight colour #3E8E87
  for the single thing the student must act on (the part to press, the line to fill to).
- Show only the objects this step needs, large and centred. At most one short text label.
- Keep it quick and simple: about 10 to 25 shapes is plenty.
- Plain SVG shapes only: no scripts, no images, no links, no fonts, no animation.`,
  });
  return isSafeSvg(picture.svg) ? picture.svg : null;
}

/**
 * A strict check on the model's SVG. Pictures are also shown with <img>, which never
 * runs scripts, so this is a second layer of safety.
 */
export function isSafeSvg(svg: string): boolean {
  const trimmed = svg.trim();
  if (!trimmed.startsWith("<svg") || !trimmed.endsWith("</svg>")) return false;
  // url(#id) is allowed: it only points inside the same drawing.
  const banned = [/<script/i, /<foreignObject/i, /<image/i, /\son\w+\s*=/i, /href\s*=/i, /javascript:/i, /@import/i, /url\(\s*['"]?(?!#)/i];
  return !banned.some((pattern) => pattern.test(trimmed));
}
