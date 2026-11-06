import type { NextRequest } from "next/server";
import { getStudent } from "@/lib/data/crew";
import { todayFor } from "@/lib/data/today";
import { jsonError } from "@/lib/http";

/**
 * What's on this student's Today screen. `since` is midnight on their own clock: the server runs
 * in another time zone, and "done today" should end when their day does.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const studentId = params.get("studentId") ?? "";
  if (!(await getStudent(studentId))) return jsonError("Student not found.", 404);
  const since = new Date(params.get("since") ?? "");
  if (Number.isNaN(since.getTime())) return jsonError("Say when the day started.", 400);
  return Response.json(await todayFor(studentId, since.toISOString()));
}
