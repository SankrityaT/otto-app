import { z } from "zod";
import { askClaude, type Photo } from "./client";
import { Concern, safeReply } from "./safety";

const Explanation = z.object({
  concern: Concern,
  say: z
    .string()
    .describe(
      "What Ayin says out loud: two or three short, plain sentences, 40 words at most",
    ),
  choices: z
    .array(z.string())
    .max(3)
    .describe(
      "2 or 3 things the student might ask next, 1-4 words each, like 'Say it simpler' or 'What happens next?'",
    ),
});

/**
 * The student is watching something on their screen (a video, a page, an app) and asks about it.
 * Ayin sees the last few moments of the screen and hears what the video just said, then
 * explains it in plain words, like someone sitting beside them.
 */
export async function explainScreen(options: {
  name: string;
  question: string;
  /** What was on the screen over the last few seconds, oldest first; the last is right now. */
  frames: Photo[];
  /** What the video said in the last half minute, transcribed. Empty if there was no sound. */
  heard: string;
  history: { who: "student" | "ayin"; text: string }[];
}): Promise<{ say: string; choices: string[] }> {
  const history = options.history
    .map((t) => `${t.who === "ayin" ? "Ayin" : options.name}: ${t.text}`)
    .join("\n");
  const answer = await askClaude({
    schema: Explanation,
    photos: options.frames,
    effort: "low",
    maxTokens: 2000,
    instructions: `${options.name} is watching something on their screen: a video, a web page or an app.
The ${options.frames.length > 1 ? `${options.frames.length} pictures are their screen over the last few seconds, oldest first; the last one is right now` : "picture is their screen right now"}.
${options.heard ? `What the video said in the last half minute (machine-transcribed, may have mistakes): "${options.heard}"` : "There is no sound to go on, only the screen."}
${history ? `The conversation so far:\n${history}` : ""}
${options.name} asks: "${options.question}"
Explain it like a calm coach sitting beside them. Say what is happening and what it means, in plain, literal words.
If a word or idea is hard, say what it means in everyday words. No idioms. Don't talk down to them: they are capable young adults.
If you can't tell from the screen, say what you can see and ask them to pause on the part they mean.
Follow your safety rules: if the screen shows something harmful, don't explain how to do it.`,
  });
  return {
    say: safeReply(answer.say, answer.concern),
    choices: answer.concern === "none" ? answer.choices.slice(0, 3) : [],
  };
}
