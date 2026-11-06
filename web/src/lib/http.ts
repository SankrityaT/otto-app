import { OttoAIError } from "./ai/client";

// Small helpers so every API route answers errors the same way.

export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return typeof body === "object" && body !== null ? body : {};
  } catch {
    return {};
  }
}

/** Turn an unexpected error into a calm message the screen can show or read aloud. */
export function aiFailure(error: unknown): Response {
  console.error(error);
  const message =
    error instanceof OttoAIError ? error.message : "Otto couldn't think that through. Please try again.";
  return jsonError(message, 502);
}
