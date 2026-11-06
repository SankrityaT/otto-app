import { z } from "zod";
import { AyinAIError, askClaude, type Photo } from "./client";
import { WONT_HELP } from "./safety";

const StepPlan = z.object({
  safe: z
    .boolean()
    .describe("Decide this first. false if the task is on the never list in your safety rules; then leave steps empty"),
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
          .describe("Only when the step itself takes a set time (steam milk for 30 seconds, let it set for 2 minutes). Otherwise null"),
      }),
    )
    .max(12),
});

export type StepPlan = z.infer<typeof StepPlan>;

/**
 * Break any task into small physical steps. The task comes from the student, not from code.
 * A task Ayin shouldn't help with gets no steps at all, so nothing about it is ever saved or shown.
 */
export async function planSteps(task: string, photo?: Photo | null): Promise<StepPlan> {
  const plan = await askClaude({
    schema: StepPlan,
    photo,
    effort: "medium",
    instructions: `A student wants to do this task: "${task}".
${photo ? "The photo shows the task, a recipe card or the instructions they were given." : ""}
Break it into the smallest steps a student can see and check, in order.
Each step is one physical action. Include safety steps (gloves, hot surfaces) where they apply.
The students are capable young adults learning a job. Teach the job, not everyday life: leave out things
anyone already does (washing hands, walking over, picking things up) unless the task itself is about them.`,
  });
  if (!plan.safe) throw new AyinAIError(WONT_HELP);
  if (plan.steps.length < 2) throw new AyinAIError("Ayin couldn't break that into steps. Try saying it another way.");
  return plan;
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
