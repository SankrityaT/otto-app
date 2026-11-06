import { startCrew } from "@/lib/data/crew";
import { jsonError, readJson } from "@/lib/http";
import { RAFT_NAME_HINT, safeRaftName } from "@/lib/names";

/** Start a new raft. The student who starts it is its first member and gets the code to share. */
export async function POST(request: Request) {
  const { studentId, name } = await readJson(request);
  const clean = typeof name === "string" ? safeRaftName(name) : null;
  if (!clean) return jsonError(RAFT_NAME_HINT, 400);
  const code = typeof studentId === "string" ? await startCrew(studentId, clean) : null;
  if (!code) return jsonError("You're already in a raft.", 400);
  return Response.json({ code }, { status: 201 });
}
