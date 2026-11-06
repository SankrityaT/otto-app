import type { NextRequest } from "next/server";
import { forgetMemory } from "@/lib/data/today";
import { jsonError } from "@/lib/http";

/** "Forget this": Otto deletes something the student told it to remember. */
export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/today/memories/[id]">) {
  const { id } = await ctx.params;
  const studentId = request.nextUrl.searchParams.get("studentId") ?? "";
  if (!(await forgetMemory(studentId, id))) return jsonError("That memory isn't here.", 404);
  return Response.json({ ok: true });
}
