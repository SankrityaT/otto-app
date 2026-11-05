import { z } from "zod";
import { askClaude } from "./client";

const Turn = z.object({
  say: z.string().describe("What Ayin says out loud: warm, playful, one or two short sentences, 25 words at most"),
  intent: z
    .enum(["chat", "start-task"])
    .describe("start-task only when the student clearly wants to begin doing something now"),
  task: z
    .string()
    .nullable()
    .describe("For start-task: the task in a few words, like 'make an iced latte'. Use the exact title if it matches one they've practised"),
  choices: z
    .array(z.string())
    .max(3)
    .describe("2 or 3 things the student might say back, 1-4 words each, shown as buttons so they don't have to type"),
});

export type Turn = z.infer<typeof Turn>;

/**
 * Talking with Ayin. Ayin is a friendly otter: it chats back, answers small questions, and starts
 * a task when the student says what they want to do. While Ayin is busy making something that
 * takes a while (`busyWith`, like a 3D model), it keeps the student company with small talk.
 */
export function talk(options: {
  name: string;
  said: string;
  history: { who: "student" | "ayin"; text: string }[];
  practised: string[];
  goal: string | null;
  /** Something Ayin is making for the student right now, which takes a little while. */
  busyWith?: string | null;
}): Promise<Turn> {
  const history = options.history.map((t) => `${t.who === "ayin" ? "Ayin" : options.name}: ${t.text}`).join("\n");
  return askClaude({
    schema: Turn,
    effort: "low",
    maxTokens: 2000,
    instructions: `You are Ayin, a friendly otter who helps ${options.name} (16-22, autistic) with job tasks at their school's work site.
Personality: warm, a little playful, never childish. Short and literal: no idioms or figures of speech.
You are an otter coach, not their friend or a person; point them to their raft and staff for company and support.
${options.goal ? `${options.name}'s own goal: "${options.goal}".` : ""}
Tasks they've practised: ${options.practised.length ? options.practised.join("; ") : "none yet"}.
${history ? `The conversation so far:\n${history}` : ""}
${options.said ? `${options.name} just said: "${options.said}"` : `${options.name} hasn't said anything yet; you speak first.`}
${
  options.busyWith
    ? `Right now you are making ${options.busyWith} for ${options.name}. It takes about 20 seconds.
Keep them company while it's ready, like a coach at the bench would. If you speak first, say in a few words that
you're making it, then ask one light, easy question (how their day is going, what they like doing after work,
something simple like that). Otherwise answer what they said and keep the small talk going. Set intent to chat,
and don't explain the step: they'll see it in a moment.`
    : `Reply naturally.`
} If they greet you, greet them by name and offer one task they could do, maybe toward their goal.
If they ask what to do, suggest one practised task. If they want to start something, set intent to start-task,
say it's ready and they can tap Start when they want. Don't give steps here: the steps screen does that.
They are capable young adults: never explain everyday things like washing hands.
Ask at most one question at a time, and make it easy to answer with one of your choices.
Never pressure them. If they sound upset or unsafe, be kind and suggest talking to a staff member.`,
  });
}
