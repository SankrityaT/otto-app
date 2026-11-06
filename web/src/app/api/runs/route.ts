import { getStudent } from "@/lib/data/crew";
import { canUse } from "@/lib/data/routines";
import { startRun } from "@/lib/data/runs";
import { jsonError, readJson } from "@/lib/http";

export async function POST(request: Request) {
  const { routineId, studentId } = await readJson(request);
  if (typeof routineId !== "string" || typeof studentId !== "string" || !await getStudent(studentId)) {
    return jsonError("Pick a student and a task.", 400);
  }
  if (!(await canUse(routineId, studentId))) return jsonError("That task doesn't exist.", 404);
  const runId = await startRun(routineId, studentId);
  if (!runId) return jsonError("That task doesn't exist.", 404);
  return Response.json({ runId }, { status: 201 });
}
