import { z } from "zod";
import { askClaude, type Photo } from "./client";

const StepCheck = z.object({
  done: z.boolean().describe("True only if the photo clearly shows the step is finished"),
  say: z
    .string()
    .describe("12 words or fewer. If done, a calm well-done. If not, what is still missing, or what to show the camera"),
});

export type StepCheck = z.infer<typeof StepCheck>;

/** Look at a photo and decide whether the step is done. */
export function checkStep(step: { text: string; detail: string }, photo: Photo): Promise<StepCheck> {
  return askClaude({
    schema: StepCheck,
    photo,
    effort: "low",
    instructions: `The student says they finished this step: "${step.text}" (${step.detail}).
Look at the photo. If you can't tell, set done to false and say what to hold up to the camera.`,
  });
}
