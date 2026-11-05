import { talk } from "@/lib/ai/talk";
import { getStudent } from "@/lib/data/crew";
import { profile } from "@/lib/data/raft";
import { listRoutines } from "@/lib/data/routines";
import { aiFailure, jsonError, readJson } from "@/lib/http";

/** One turn of talking with Ayin on the home screen. Returns what Ayin says, and a task to start if any. */
export async function POST(request: Request) {
  const { studentId, said, history, busyWith } = await readJson(request);
  const student = typeof studentId === "string" ? await getStudent(studentId) : null;
  const text = typeof said === "string" ? said.trim().slice(0, 300) : "";
  const busy = typeof busyWith === "string" ? busyWith.slice(0, 200) : null;
  if (!student || (!text && !busy)) return jsonError("Say something to Ayin first.", 400);

  const turns = Array.isArray(history)
    ? history
        .filter((t): t is { who: "student" | "ayin"; text: string } => typeof t?.text === "string" && (t.who === "student" || t.who === "ayin"))
        .slice(-6)
    : [];
  const routines = await listRoutines();

  try {
    const turn = await talk({
      name: student.name,
      said: text,
      history: turns,
      practised: routines.map((r) => r.title),
      goal: (await profile(student.id))?.goal?.text ?? null,
      busyWith: busy,
    });
    // If the task they asked for is one they've practised, start that one instead of a new list.
    const known = turn.task ? routines.find((r) => r.title.toLowerCase() === turn.task!.toLowerCase()) : undefined;
    return Response.json({ say: turn.say, choices: turn.choices.slice(0, 3), startTask: turn.intent === "start-task" ? turn.task : null, routineId: known?.id ?? null });
  } catch (error) {
    return aiFailure(error);
  }
}
