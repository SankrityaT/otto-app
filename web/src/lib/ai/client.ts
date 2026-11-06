import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { config } from "../config";
import { SAFETY_RULES, WONT_HELP } from "./safety";

// Reads ANTHROPIC_API_KEY from the environment.
const anthropic = new Anthropic();

/** How Ayin talks, and its safety rules, shared by every prompt. Comes from our AZACS research notes. */
export const AYIN_VOICE = `You are Ayin, a calm step-by-step coach for autistic students aged 16-22
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

export class AyinAIError extends Error {}

type Ask<T extends z.ZodType> = {
  schema: T;
  instructions: string;
  photo?: Photo | null;
  /** Several pictures, in order (like a screen over a few seconds). */
  photos?: Photo[];
  effort: "low" | "medium" | "high";
  maxTokens?: number;
};

function request<T extends z.ZodType>(options: Ask<T>) {
  const content: Anthropic.ContentBlockParam[] = [];
  for (const photo of [options.photo, ...(options.photos ?? [])]) {
    if (!photo) continue;
    content.push({ type: "image", source: { type: "base64", media_type: photo.mediaType, data: photo.data } });
  }
  content.push({ type: "text", text: options.instructions });
  return {
    model: config.model,
    max_tokens: options.maxTokens ?? 8000,
    system: AYIN_VOICE,
    messages: [{ role: "user" as const, content }],
    output_config: { effort: options.effort, format: zodOutputFormat(options.schema) },
  };
}

function checked<T>(response: { stop_reason: string | null; parsed_output?: T | null }): T {
  if (response.stop_reason === "refusal") {
    throw new AyinAIError(WONT_HELP);
  }
  if (response.parsed_output == null) {
    throw new AyinAIError("Claude's answer didn't match the expected format.");
  }
  return response.parsed_output;
}

/** Ask Claude for a JSON answer that matches `schema`, optionally with a photo. */
export async function askClaude<T extends z.ZodType>(options: Ask<T>): Promise<z.infer<T>> {
  return checked(await anthropic.messages.parse(request(options)));
}

/**
 * The same, but streamed: `onText` gets the JSON written so far as it arrives, so a caller can
 * use parts of the answer before it's finished (like 3D parts appearing one by one).
 */
export async function streamClaude<T extends z.ZodType>(options: Ask<T> & { onText: (soFar: string) => void }): Promise<z.infer<T>> {
  const stream = anthropic.messages.stream(request(options));
  stream.on("text", (_delta, soFar) => options.onText(soFar));
  return checked(await stream.finalMessage());
}
