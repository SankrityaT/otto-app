import { askCrewmate } from "@/lib/data/crew";
import { jsonError, readJson } from "@/lib/http";

/** "Ask a crewmate": find someone who has done this step on their own. */
export async function POST(request: Request) {
  const { fromId, stepId } = await readJson(request);
  if (typeof fromId !== "string" || typeof stepId !== "string") return jsonError("Missing ask details.", 400);
  return Response.json({ helperName: askCrewmate(fromId, stepId) });
}
