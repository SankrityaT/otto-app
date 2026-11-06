import { addCheer } from "@/lib/data/crew";
import { jsonError, readJson } from "@/lib/http";

export async function POST(request: Request) {
  const { fromId, runId, phrase } = await readJson(request);
  if (typeof fromId !== "string" || typeof runId !== "string" || typeof phrase !== "string") {
    return jsonError("Missing cheer details.", 400);
  }
  if (!await addCheer(fromId, runId, phrase)) return jsonError("That cheer can't be sent.", 400);
  return Response.json({ ok: true }, { status: 201 });
}
