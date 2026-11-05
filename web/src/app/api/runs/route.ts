import { getStudent } from "@/lib/data/crew";
import { doneThisWeek, inProgress, startRun } from "@/lib/data/runs";
import type { NextRequest } from "next/server";
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

/** What this student finished this week, and what they started but haven't finished. */
export function GET(request: NextRequest) {
  const studentId = request.nextUrl.searchParams.get("studentId") ?? "";
  if (!getStudent(studentId)) return jsonError("Student not found.", 404);
  return Response.json({ done: doneThisWeek(studentId), inProgress: inProgress(studentId) });
}
