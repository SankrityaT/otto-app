import { z } from "zod";
import { askClaude } from "./client";
import { Concern } from "./safety";

const Turn = z.object({
  concern: Concern,
  say: z.string().describe("What Otto says out loud: warm, playful, one or two short sentences, 25 words at most"),
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
  remember: z
    .string()
    .nullable()
    .describe("A fact the student just asked you to remember, in a short plain sentence, like 'The lids are on the top shelf'. Otherwise null"),
  remind: z
    .string()
    .nullable()
    .describe("Something the student just asked to be reminded to do, as a short to-do, like 'Bring my apron'. Otherwise null"),
});

export type Turn = z.infer<typeof Turn>;

/**
 * Talking with Otto. Otto is a friendly otter: it chats back, answers small questions, and starts
 * a task when the student says what they want to do.
 */
export function talk(options: {
  name: string;
  said: string;
  history: { who: "student" | "ayin"; text: string }[];
  practised: string[];
  goal: string | null;
  /** What this student already asked Otto to keep. */
  reminders: string[];
  memories: string[];
}): Promise<Turn> {
  const history = options.history.map((t) => `${t.who === "ayin" ? "Otto" : options.name}: ${t.text}`).join("\n");
  return askClaude({
    schema: Turn,
    effort: "low",
    maxTokens: 2000,
    instructions: `You are Otto, a friendly otter who helps ${options.name} (16-22, autistic) with job tasks at their school's work site.
Personality: warm, a little playful, never childish. Short and literal: no idioms or figures of speech.
You are an otter coach, not their friend or a person; point them to their raft and staff for company and support.
${options.goal ? `${options.name}'s own goal: "${options.goal}".` : ""}
Tasks they've practised: ${options.practised.length ? options.practised.join("; ") : "none yet"}.
Their open reminders: ${options.reminders.length ? options.reminders.join("; ") : "none"}.
What they asked you to remember: ${options.memories.length ? options.memories.join("; ") : "nothing yet"}.
${history ? `The conversation so far:\n${history}` : ""}
${options.name} just said: "${options.said}"
Reply naturally. If they greet you, greet them by name and offer one task they could do, maybe toward their goal.
If they ask what to do, suggest one practised task. If they want to start something, set intent to start-task,
say it's ready and they can tap Start when they want. Don't give steps here: the steps screen does that.
They are capable young adults: never explain everyday things like washing hands.
If they ask you to remember a fact, put it in remember. If they ask to be reminded to do something, put it in remind;
it stays in their Now list until they mark it done, and Otto can't send alerts, so never promise one or a set time.
Only keep what they asked you to keep in this message, and say that you kept it.
Never keep passwords, phone numbers or home addresses: say kindly that those are for a trusted adult to keep.
If they ask what you remember, answer only from the lists above. If it isn't there, say you don't know. Never guess.
Ask at most one question at a time, and make it easy to answer with one of your choices.
Never pressure them. If they sound upset, be kind and suggest talking to a staff member.
Follow your safety rules: if there is any concern, set intent to chat, start no task, keep nothing, and offer no choices.`,
  });
}
