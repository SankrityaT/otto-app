import type { NextRequest } from "next/server";
import { answerTogether } from "@/lib/data/together";
import { jsonError, readJson } from "@/lib/http";

/** Answer a "do it together" invite. Yes starts the same task and returns the new run. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/crew/invites/[id]">) {
  const { id } = await ctx.params;
  const { studentId, answer } = await readJson(request);
  if (typeof studentId !== "string" || (answer !== "yes" && answer !== "not-today")) {
    return jsonError("Answer yes or not today.", 400);
  }
  const runId = answerTogether(id, studentId, answer);
  if (runId === false) return jsonError("That invite can't be answered.", 400);
  return Response.json({ runId });
}
