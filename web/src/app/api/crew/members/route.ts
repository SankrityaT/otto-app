import { raftByCode } from "@/lib/data/crew";
import { jsonError, readJson } from "@/lib/http";

/**
 * A returning student on a new device: with their raft's code, they see that raft's otters
 * and tap their own. Sent as a POST so the code never ends up in an address or a log.
 */
export async function POST(request: Request) {
  const { code } = await readJson(request);
  const members = typeof code === "string" ? await raftByCode(code) : [];
  if (members.length === 0) return jsonError("That code doesn't match a raft. Your teacher can give it to you.", 400);
  return Response.json({ members });
}
