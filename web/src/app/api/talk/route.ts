import { safeReply } from "@/lib/ai/safety";
import { talk } from "@/lib/ai/talk";
import { getStudent } from "@/lib/data/crew";
import { profile } from "@/lib/data/raft";
import { listRoutines } from "@/lib/data/routines";
import { keep, whatOttoHolds } from "@/lib/data/today";
import { aiFailure, jsonError, readJson } from "@/lib/http";

/**
 * One turn of talking with Otto on the home screen. Returns what Otto says, a task to start if any,
 * and whether it kept something new (a reminder or a memory) so Today can show it.
 */
export async function POST(request: Request) {
  const { studentId, said, history } = await readJson(request);
  const student = typeof studentId === "string" ? await getStudent(studentId) : null;
  const text = typeof said === "string" ? said.trim().slice(0, 300) : "";
  if (!student || !text) return jsonError("Say something to Otto first.", 400);

  const turns = Array.isArray(history)
    ? history
        .filter((t): t is { who: "student" | "ayin"; text: string } => typeof t?.text === "string" && (t.who === "student" || t.who === "ayin"))
        .slice(-6)
    : [];
  const [routines, holding] = await Promise.all([listRoutines(student.id), whatOttoHolds(student.id)]);

  try {
    const turn = await talk({
      name: student.name,
      said: text,
      history: turns,
      practised: routines.map((r) => r.title),
      goal: (await profile(student.id, student.id))?.goal?.text ?? null,
      ...holding,
    });
    // Any safety concern: just Otto's words (with staff and 988 when someone may be at risk), never a task, nothing kept.
    if (turn.concern !== "none") {
      return Response.json({ say: safeReply(turn.say, turn.concern), choices: [], startTask: null, routineId: null, kept: false });
    }
    // If the task they asked for is one they've practised, start that one instead of a new list.
    const known = turn.task ? routines.find((r) => r.title.toLowerCase() === turn.task!.toLowerCase()) : undefined;
    const kept = await keep(student.id, turn, holding);
    return Response.json({ say: turn.say, choices: turn.choices.slice(0, 3), startTask: turn.intent === "start-task" ? turn.task : null, routineId: known?.id ?? null, kept });
  } catch (error) {
    return aiFailure(error);
  }
}
