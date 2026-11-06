import type { NextRequest } from "next/server";
import { crewForCode, joinCrew } from "@/lib/data/crew";
import { jsonError, readJson } from "@/lib/http";

/** A student who isn't in a raft yet joins one with the code from their teacher. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/students/[id]/raft">) {
  const { id } = await ctx.params;
  const { code } = await readJson(request);
  const crewId = typeof code === "string" ? await crewForCode(code) : null;
  if (!crewId) return jsonError("That code doesn't match a raft. Your teacher can give it to you.", 400);
  if (!(await joinCrew(id, crewId))) return jsonError("You're already in a raft.", 400);
  return Response.json({ ok: true });
}
