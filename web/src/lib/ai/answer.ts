import { z } from "zod";
import { askClaude, type Photo } from "./client";
import { Concern, safeReply } from "./safety";

const Answer = z.object({
  concern: Concern,
  say: z.string().describe("What Otto says out loud: one or two short sentences, 25 words at most"),
});

/**
 * The student asks something out loud while they work ("is this the right way up?").
 * Otto answers like a coach standing next to them: about the step in front of them and
 * what the camera sees right now.
 */
export async function answerQuestion(options: {
  task: string;
  step: { text: string; detail: string };
  question: string;
  photo?: Photo | null;
  showing?: string | null;
}): Promise<string> {
  const answer = await askClaude({
    schema: Answer,
    photo: options.photo,
    effort: "low",
    instructions: `A student is doing "${options.task}". They are on this step: "${options.step.text}" (${options.step.detail}).
${options.showing ? `The screen is showing them a 3D model: "${options.showing}".` : ""}
${options.photo ? "The photo shows what is in front of them right now." : ""}
They just said out loud: "${options.question}"
Answer like a calm coach standing beside them. Talk about what you can see: name the part, where it is and which way to move it.
If they are doing it right, say so. If the question is about a later step, help with this step first.
If something looks unsafe, tell them to stop and get a staff member. Follow your safety rules for anything off the task.`,
  });
  return safeReply(answer.say, answer.concern);
}
