import { z } from "zod";
import { askClaude, type Photo } from "./client";

const StepCheck = z.object({
  done: z.boolean().describe("True only if the photo clearly shows the step is finished"),
  say: z
    .string()
    .describe("12 words or fewer. If done, a calm well-done. If not, what is still missing, or what to show the camera"),
  nudge: z
    .string()
    .nullable()
    .describe(
      "Only if the photo shows the student looking at or using a phone or screen that isn't part of this step: " +
        "one kind sentence, 10 words or fewer, that brings them back to the step. No blame. Otherwise null",
    ),
});

export type StepCheck = z.infer<typeof StepCheck>;

/** Look at a photo and decide whether the step is done. */
export function checkStep(step: { text: string; detail: string }, photo: Photo): Promise<StepCheck> {
  return askClaude({
    schema: StepCheck,
    photo,
    effort: "low",
    instructions: `The student says they finished this step: "${step.text}" (${step.detail}).
Look at the photo. If you can't tell, set done to false and say what to hold up to the camera.
If they seem to have drifted to their phone or another screen, add a gentle nudge back to the step.`,
  });
}
