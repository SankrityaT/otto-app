import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { config } from "../config";

// Reads ANTHROPIC_API_KEY from the environment.
const anthropic = new Anthropic();

/** How Ayin talks, shared by every prompt. Comes from our AZACS research notes. */
export const AYIN_VOICE = `You are Ayin, a calm step-by-step coach for autistic students aged 16-22
learning job tasks at a school work site (a cafe, a shirt studio, a shipping store).
Use short, plain, literal words. One idea per sentence. No idioms or sarcasm.
Be kind and matter-of-fact. Never blame, rush or say the student failed.
Mistakes are information, not failure.`;

export interface Photo {
  /** Base64 data without the "data:" prefix. */
  data: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
}

export class AyinAIError extends Error {}

/** Ask Claude for a JSON answer that matches `schema`, optionally with a photo. */
export async function askClaude<T extends z.ZodType>(options: {
  schema: T;
  instructions: string;
  photo?: Photo | null;
  effort: "low" | "medium" | "high";
  maxTokens?: number;
}): Promise<z.infer<T>> {
  const content: Anthropic.ContentBlockParam[] = [];
  if (options.photo) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: options.photo.mediaType, data: options.photo.data },
    });
  }
  content.push({ type: "text", text: options.instructions });

  const response = await anthropic.messages.parse({
    model: config.model,
    max_tokens: options.maxTokens ?? 8000,
    system: AYIN_VOICE,
    messages: [{ role: "user", content }],
    output_config: { effort: options.effort, format: zodOutputFormat(options.schema) },
  });

  if (response.stop_reason === "refusal") {
    throw new AyinAIError("Claude declined this request.");
  }
  if (response.parsed_output == null) {
    throw new AyinAIError("Claude's answer didn't match the expected format.");
  }
  return response.parsed_output;
}
