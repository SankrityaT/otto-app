import { z } from "zod";
import { askClaude, type Photo } from "./client";

const StepPlan = z.object({
  title: z.string().describe("Short name for the task, like 'Make an iced latte'"),
  steps: z
    .array(
      z.object({
        text: z.string().describe("The step in 8 words or fewer, starting with a verb"),
        detail: z.string().describe("One plain sentence with exactly what to do, for 'show me'"),
        seconds: z
          .number()
          .int()
          .nullable()
          .describe("Only when the step itself takes a set time (wash hands for 20 seconds, steam for 30). Otherwise null"),
      }),
    )
    .min(2)
    .max(12),
});

export type StepPlan = z.infer<typeof StepPlan>;

/** Break any task into small physical steps. The task comes from the student, not from code. */
export function planSteps(task: string, photo?: Photo | null): Promise<StepPlan> {
  return askClaude({
    schema: StepPlan,
    photo,
    effort: "medium",
    instructions: `A student wants to do this task: "${task}".
${photo ? "The photo shows the task, a recipe card or the instructions they were given." : ""}
Break it into the smallest steps a student can see and check, in order.
Each step is one physical action. Include safety steps (gloves, hot surfaces) where they apply.`,
  });
}

const SmallerSteps = z.object({ steps: StepPlan.shape.steps.element.array().min(2).max(4) });

/** Split one step that feels too big into 2 to 4 smaller ones. The student asks for this. */
export async function splitStep(task: string, step: { text: string; detail: string }): Promise<StepPlan["steps"]> {
  const result = await askClaude({
    schema: SmallerSteps,
    effort: "medium",
    instructions: `A student doing "${task}" finds this step too big: "${step.text}" (${step.detail}).
Split it into 2 to 4 smaller physical steps that together do exactly the same thing.`,
  });
  return result.steps;
}
