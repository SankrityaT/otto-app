import type { NextRequest } from "next/server";
import { answerInvite } from "@/lib/data/crew";
import { jsonError, readJson } from "@/lib/http";

/** Answer a "practise together" invite with yes or not today. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/crew/invites/[id]">) {
  const { id } = await ctx.params;
  const { studentId, answer } = await readJson(request);
  if (typeof studentId !== "string" || (answer !== "yes" && answer !== "not-today")) {
    return jsonError("Answer yes or not today.", 400);
  }
  if (!answerInvite(id, studentId, answer)) return jsonError("That invite can't be answered.", 400);
  return Response.json({ ok: true });
}
