import type { NextRequest } from "next/server";
import { answerQuestion } from "@/lib/ai/answer";
import { getPhoto } from "@/lib/camera";
import { getRun } from "@/lib/data/runs";
import { aiFailure, jsonError, readJson } from "@/lib/http";

/** The student asks Ayin something out loud while working on a step. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/runs/[id]/ask">) {
  const { id } = await ctx.params;
  const body = await readJson(request);
  const run = getRun(id);
  const step = run?.steps.find((s) => s.id === body.stepId);
  if (!run || !step) return jsonError("Step not found.", 404);
  const question = typeof body.question === "string" ? body.question.trim().slice(0, 500) : "";
  if (!question) return jsonError("Ask Ayin a question.", 400);

  try {
    const photo = await getPhoto(body.photo).catch(() => null);
    const showing = typeof body.showing === "string" ? body.showing : null;
    return Response.json({ say: await answerQuestion({ task: run.title, step, question, photo, showing }) });
  } catch (error) {
    return aiFailure(error);
  }
}
