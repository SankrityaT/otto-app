import type { NextRequest } from "next/server";
import { setFurHue } from "@/lib/data/crew";
import { jsonError, readJson } from "@/lib/http";

/** A student changes how their otter looks. */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/students/[id]">) {
  const { id } = await ctx.params;
  const { furHue } = await readJson(request);
  if (typeof furHue !== "number" || !setFurHue(id, furHue)) return jsonError("That colour can't be saved.", 400);
  return Response.json({ ok: true });
}
