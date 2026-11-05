import type { NextRequest } from "next/server";
import { cheerPartner, togetherFor } from "@/lib/data/together";
import { jsonError, readJson } from "@/lib/http";

/** How the partner on a shared task is doing. `together` is null when the task isn't shared. */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/runs/[id]/together">) {
  const { id } = await ctx.params;
  return Response.json({ together: togetherFor(id) });
}

/** Send the partner one of the raft's preset cheers. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/runs/[id]/together">) {
  const { id } = await ctx.params;
  const { phrase } = await readJson(request);
  if (typeof phrase !== "string" || !cheerPartner(id, phrase)) return jsonError("That cheer can't be sent.", 400);
  return Response.json({ ok: true }, { status: 201 });
}
