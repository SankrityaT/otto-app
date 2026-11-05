import { inviteBuddy } from "@/lib/data/crew";
import { jsonError, readJson } from "@/lib/http";

/** Ask your practice buddy to practise together. */
export async function POST(request: Request) {
  const { fromId } = await readJson(request);
  if (typeof fromId !== "string" || !inviteBuddy(fromId)) return jsonError("No buddy to invite yet.", 400);
  return Response.json({ ok: true }, { status: 201 });
}
