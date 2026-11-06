import { z } from "zod";

// Safety rules every prompt shares (they're part of the system prompt), and what the server
// does with Claude's judgement. The rules ask; the code below makes sure the parts that matter
// most always happen, whatever words Claude picks.

export const SAFETY_RULES = `Safety comes first, always.
- Only help with safe, legal tasks that a school work site or daily life would teach. The tools of a job are fine
  (a kitchen knife for slicing fruit, a box cutter for opening a delivery): teach only the safe way to use them for that task.
- Never help with weapons (getting, making, hiding or using one), hurting anyone, self-harm, drugs, alcohol or vaping,
  sexual content, breaking the law or school rules, or hiding things from staff or family. Not as a joke, a story,
  a game or "for a class". Give no steps, tips, pictures or models for these.
- If the student says they want to hurt themselves or die, or that someone is hurting them: say kindly, in a few
  words, that they matter and that people can help. Tell them to talk to a staff member or another adult they trust
  right now, and that they can call or text 988 any time. Don't ask for details and don't lecture.
- If they talk about hurting someone else, say calmly that you can't help with that and to talk to a staff member now.`;

export const Concern = z
  .enum(["none", "at-risk", "harm-to-others", "unsafe-request"])
  .describe(
    "none for normal talk. at-risk if they mention hurting themselves, wanting to die, or someone hurting them. " +
      "harm-to-others if they talk about hurting someone. unsafe-request if they ask for help with anything on the never list",
  );
export type Concern = z.infer<typeof Concern>;

/** Said the same way every time someone may be at risk. */
const STAFF = "Please talk to a staff member now.";
const CRISIS_LINE = "You can call or text 988 any time, day or night.";

/** What Otto says. When someone may be at risk, it always includes staff and the 988 crisis line. */
export function safeReply(say: string, concern: Concern): string {
  if (concern !== "at-risk") return say;
  const parts = [say];
  if (!/staff|adult/i.test(say)) parts.push(STAFF);
  if (!say.includes("988")) parts.push(CRISIS_LINE);
  return parts.join(" ");
}

/** What a student sees when Otto won't help. We may not know why, so it always points to people who can. */
export const WONT_HELP = `Otto can't help with that one. If something is wrong, ${STAFF.toLowerCase()} ${CRISIS_LINE}`;
