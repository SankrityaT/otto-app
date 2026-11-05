import { addStudent, crewForCode } from "@/lib/data/crew";
import { jsonError, readJson } from "@/lib/http";
import { NAME_HINT, safeName } from "@/lib/names";

// There is no list of all students: names are only shown inside a raft, to people with its code.

/** A new student: their first name, their otter's colour and, if they have it, their raft's code. */
export async function POST(request: Request) {
  const { name, furHue, raftCode } = await readJson(request);
  const clean = typeof name === "string" ? safeName(name) : null;
  if (!clean) return jsonError(NAME_HINT, 400);
  if (typeof furHue !== "number" || furHue < 0 || furHue > 359) return jsonError("Pick a colour for your otter.", 400);
  let crewId: string | null = null;
  if (typeof raftCode === "string" && raftCode.trim()) {
    crewId = await crewForCode(raftCode);
    if (!crewId) return jsonError("That code doesn't match a raft. Your teacher can give it to you.", 400);
  }
  return Response.json({ student: await addStudent(clean, furHue, crewId) }, { status: 201 });
}
