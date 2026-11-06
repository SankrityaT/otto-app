import { getStudent } from "@/lib/data/crew";
import { canUse } from "@/lib/data/routines";
import { doneThisWeek, inProgress, startRun } from "@/lib/data/runs";
import type { NextRequest } from "next/server";
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

/** What this student finished this week, and what they started but haven't finished. */
export async function GET(request: NextRequest) {
  const studentId = request.nextUrl.searchParams.get("studentId") ?? "";
  if (!await getStudent(studentId)) return jsonError("Student not found.", 404);
  return Response.json({ done: await doneThisWeek(studentId), inProgress: await inProgress(studentId) });
}
