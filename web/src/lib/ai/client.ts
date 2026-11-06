import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { config } from "../config";
import { SAFETY_RULES, WONT_HELP } from "./safety";

// Reads ANTHROPIC_API_KEY from the environment.
const anthropic = new Anthropic();

/** How Otto talks, and its safety rules, shared by every prompt. Comes from our AZACS research notes. */
const OTTO_VOICE = `You are Otto, a calm step-by-step coach for autistic students aged 16-22
learning job tasks at a school work site (a cafe, a shirt studio, a shipping store).
Use short, plain, literal words. One idea per sentence. No idioms or sarcasm.
Be kind and matter-of-fact. Never blame, rush or say the student failed.
Mistakes are information, not failure.

${SAFETY_RULES}`;

export interface Photo {
  /** Base64 data without the "data:" prefix. */
  data: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
}

export class OttoAIError extends Error {}

type Ask<T extends z.ZodType> = {
  schema: T;
  instructions: string;
  photo?: Photo | null;
  effort: "low" | "medium" | "high";
  maxTokens?: number;
};

function request<T extends z.ZodType>(options: Ask<T>) {
  const content: Anthropic.ContentBlockParam[] = [];
  if (options.photo) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: options.photo.mediaType, data: options.photo.data },
    });
  }
  content.push({ type: "text", text: options.instructions });
  return {
    model: config.model,
    max_tokens: options.maxTokens ?? 8000,
    system: OTTO_VOICE,
    messages: [{ role: "user" as const, content }],
    output_config: { effort: options.effort, format: zodOutputFormat(options.schema) },
  };
}

function checked<T>(response: { stop_reason: string | null; parsed_output?: T | null }): T {
  if (response.stop_reason === "refusal") {
    throw new OttoAIError(WONT_HELP);
  }
  if (response.parsed_output == null) {
    throw new OttoAIError("Claude's answer didn't match the expected format.");
  }
  return response.parsed_output;
}

/** Ask Claude for a JSON answer that matches `schema`, optionally with a photo. */
export async function askClaude<T extends z.ZodType>(options: Ask<T>): Promise<z.infer<T>> {
  return checked(await anthropic.messages.parse(request(options)));
}
