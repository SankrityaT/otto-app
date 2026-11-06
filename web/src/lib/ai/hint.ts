import { z } from "zod";
import { HELP_LEVELS, type HelpLevel } from "../help";
import { askClaude, type Photo } from "./client";

const Hint = z.object({
  say: z.string().describe("What Otto says out loud, 15 words or fewer"),
});

const HOW_MUCH_TO_SAY: Record<Exclude<HelpLevel, 0>, string> = {
  [HELP_LEVELS.nudge]: "Give a nudge: one short question that points their attention, without telling the answer.",
  [HELP_LEVELS.hint]: "Give a hint: name the thing to look at or use, but let them do the action.",
  [HELP_LEVELS.showMe]: "Show them: say exactly what to do, step by step, in plain words.",
};

/** One level of help for the current step. Help only ever comes when the student asks. */
export async function giveHelp(
  step: { text: string; detail: string },
  level: Exclude<HelpLevel, 0>,
  photo?: Photo | null,
): Promise<string> {
  const hint = await askClaude({
    schema: Hint,
    photo,
    effort: "low",
    instructions: `The student asked for help with this step: "${step.text}" (${step.detail}).
${photo ? "The photo shows what they see right now." : ""}
${HOW_MUCH_TO_SAY[level]}`,
  });
  return hint.say;
}
