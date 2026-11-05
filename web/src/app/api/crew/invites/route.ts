import { inviteTogether } from "@/lib/data/together";
import { jsonError, readJson } from "@/lib/http";

/** Invite a raftmate to do a task together. The inviter's run starts now. */
export async function POST(request: Request) {
  const { fromId, toId, routineId } = await readJson(request);
  const runId =
    typeof fromId === "string" && typeof toId === "string" && typeof routineId === "string"
      ? inviteTogether(fromId, toId, routineId)
      : null;
  if (!runId) return jsonError("You can only do a task with someone in your raft.", 400);
  return Response.json({ runId }, { status: 201 });
}
