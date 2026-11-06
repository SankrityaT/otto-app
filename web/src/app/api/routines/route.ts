import { planSteps } from "@/lib/ai/steps";
import { getPhoto } from "@/lib/camera";
import { after, type NextRequest } from "next/server";
import { getStudent } from "@/lib/data/crew";
import { createRoutine, listRoutines } from "@/lib/data/routines";
import { aiFailure, jsonError, readJson } from "@/lib/http";
import { pictureFor } from "@/lib/pictures";

/** This student's tasks: their own, and their raft's. */
export async function GET(request: NextRequest) {
  const studentId = request.nextUrl.searchParams.get("studentId") ?? "";
  if (!(await getStudent(studentId))) return jsonError("Student not found.", 404);
  return Response.json({ routines: await listRoutines(studentId) });
}

/** A new task: the student says it, shows it, or both. Claude breaks it into steps. */
export async function POST(request: Request) {
  const body = await readJson(request);
  const student = typeof body.studentId === "string" ? await getStudent(body.studentId) : null;
  if (!student) return jsonError("Student not found.", 404);
  const task = typeof body.task === "string" ? body.task.trim() : "";
  const photo = body.photo ? await getPhoto(body.photo) : null;
  if (!task && !photo) return jsonError("Say or show the task first.", 400);

  try {
    const plan = await planSteps(task || "the task in the photo", photo);
    const routine = await createRoutine(plan, { studentId: student.id });
    // Draw every step's diagram now, all at once, so they're ready when the student gets there.
    after(() => Promise.all(routine.steps.map((step) => pictureFor(step.id).catch(() => null))));
    return Response.json({ routine }, { status: 201 });
  } catch (error) {
    return aiFailure(error);
  }
}
