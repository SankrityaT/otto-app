import type { NextRequest } from "next/server";
import { getStudent, setFurHue } from "@/lib/data/crew";
import { jsonError, readJson } from "@/lib/http";

/** One student: the one using this device. */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/students/[id]">) {
  const { id } = await ctx.params;
  const student = await getStudent(id);
  if (!student) return jsonError("We couldn't find you. Please start again.", 404);
  return Response.json({ student });
}

/** A student changes how their otter looks. */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/students/[id]">) {
  const { id } = await ctx.params;
  const { furHue } = await readJson(request);
  if (typeof furHue !== "number" || !await setFurHue(id, furHue)) return jsonError("That colour can't be saved.", 400);
  return Response.json({ ok: true });
}
