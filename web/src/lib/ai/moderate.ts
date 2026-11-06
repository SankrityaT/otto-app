import { z } from "zod";
import { askClaude, type Photo } from "./client";

const Review = z.object({
  ok: z.boolean().describe("True if this is fine to share with the student's raft"),
  problem: z
    .enum(["none", "might-hurt", "personal-info", "sexual", "unsafe", "face-in-photo"])
    .describe("The main problem, or none"),
  why: z.string().describe("One short, kind sentence to the student about the problem. Empty if ok"),
  kinderVersion: z
    .string()
    .nullable()
    .describe("If the words might hurt or share personal info, the same message said kindly and safely. Otherwise null"),
});

export type Review = z.infer<typeof Review>;

/**
 * Otto reads every raft post and reply before anyone else sees it. It never shames the
 * student: if something might hurt, it suggests a kinder way to say the same thing.
 */
export function reviewPost(text: string, photo: Photo | null): Promise<Review> {
  return askClaude({
    schema: Review,
    photo,
    effort: "low",
    instructions: `A student (high school age to 22) wants to share this with their raft, a small private group of classmates from
their school work site: "${text}"
${photo ? "They attached the photo." : ""}
Check it before it is shared:
- might-hurt: teasing, insults, mocking someone, or comparing people in a way that puts someone down.
- personal-info: phone numbers, addresses, last names, passwords, social media handles, or meeting up off-site.
- sexual: anything sexual, flirting, asking someone out, or comments about bodies, in words or in the photo.
- unsafe: self-harm, danger, or anything a staff member needs to know about.
- face-in-photo: the photo shows a person's face. Photos should show the work, not people.
Friendly jokes, typos and casual words are fine. Be generous: most posts are ok.`,
  });
}
