import { getStudent } from "@/lib/data/crew";
import { startRun } from "@/lib/data/runs";
import { jsonError, readJson } from "@/lib/http";

export async function POST(request: Request) {
  const { routineId, studentId } = await readJson(request);
  if (typeof routineId !== "string" || typeof studentId !== "string" || !getStudent(studentId)) {
    return jsonError("Pick a student and a task.", 400);
  }
  const runId = startRun(routineId, studentId);
  if (!runId) return jsonError("That task doesn't exist.", 404);
  return Response.json({ runId }, { status: 201 });
}
