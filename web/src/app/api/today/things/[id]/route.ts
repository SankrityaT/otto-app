import type { NextRequest } from "next/server";
import { bringBack, finishReminder, hasThing, letGo, putOff } from "@/lib/data/today";
import { jsonError, readJson } from "@/lib/http";
import { LATER_MOMENTS, type LaterMoment } from "@/lib/today";

/** A button on a Now card: later, let go, undo, or done (reminders only). */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/today/things/[id]">) {
  const { id } = await ctx.params;
  const { studentId, action, until, moment } = await readJson(request);
  if (typeof studentId !== "string" || !(await hasThing(studentId, id))) return jsonError("That isn't on your list.", 404);

  switch (action) {
    case "later": {
      const when = new Date(typeof until === "string" ? until : "");
      if (Number.isNaN(when.getTime()) || !LATER_MOMENTS.includes(moment as LaterMoment)) {
        return jsonError("Pick when Otto should ask again.", 400);
      }
      await putOff(studentId, id, { until: when.toISOString(), moment: moment as LaterMoment });
      break;
    }
    case "let-go":
      await letGo(studentId, id);
      break;
    case "back":
      await bringBack(studentId, id);
      break;
    case "done":
      if (!(await finishReminder(studentId, id))) return jsonError("Tasks finish in the step coach.", 400);
      break;
    default:
      return jsonError("Unknown action.", 400);
  }
  return Response.json({ ok: true });
}
