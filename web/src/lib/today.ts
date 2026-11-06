// The rules behind the Today screen, with no database in them so they can be tested.
// Open things are what a student could do now; finished ones land in the bin for the day.

/** How a logged step was checked. */
export type SeenBy = "camera" | "student";

/** How Otto knows something. Every memory says which, and says nothing when Otto doesn't know. */
export type Evidence = "saw" | "confirmed" | "said";

export interface StartedRun {
  runId: string;
  routineId: string;
  title: string;
  done: number;
  total: number;
}

export interface FinishedRun {
  runId: string;
  routineId: string;
  title: string;
  finishedAt: string;
  total: number;
  onOwn: number;
  /** Steps a photo check passed, and steps the student said they did. */
  seen: number;
  said: number;
}

export interface Hold {
  itemId: string;
  laterUntil: string | null;
  laterMoment: string | null;
  letGoAt: string | null;
}

/** One open thing: a task (routine) or something the student asked to be reminded about. */
export interface Thing {
  id: string;
  kind: "task" | "reminder";
  title: string;
  /** Tasks: how many steps. */
  stepCount: number;
  /** A task already started: the run to carry on, and how far along it is. */
  run: { id: string; done: number; total: number } | null;
  /** Reminders: when the student asked. */
  saidAt: string | null;
  /** Put off for now: when it comes back, in words. */
  later: string | null;
}

/** One finished thing. `id` is unique; `thingId` is the task or reminder it finished. */
export interface DoneThing {
  id: string;
  thingId: string;
  /** Set for tasks, so they can be started again today. */
  routineId: string | null;
  title: string;
  at: string;
  /** "5 of 6 steps on your own"; reminders have none. */
  line: string | null;
}

export interface Memory {
  id: string;
  title: string;
  detail: string | null;
  evidence: { kind: Evidence; detail: string } | null;
  at: string;
  /** Only what the student told Otto can be forgotten. The rest is their practice log. */
  canForget: boolean;
}

export interface Today {
  open: Thing[];
  done: DoneThing[];
  memories: Memory[];
}

/**
 * What's open, in the order the cards stack: tasks already started, then reminders, then tasks
 * to practise. Anything put off goes to the back until its time comes; let go is gone.
 * A task finished today rests in the bin, unless the student has started it again.
 */
export function openThings(input: {
  routines: { id: string; title: string; stepCount: number }[];
  started: StartedRun[];
  reminders: { id: string; text: string; createdAt: string }[];
  holds: Hold[];
  finishedToday: Set<string>;
  now: string;
}): Thing[] {
  const { routines, reminders, holds, finishedToday, now } = input;
  // Newest first from the server, so this keeps the latest unfinished try of each task.
  const started = input.started.filter((s, i) => input.started.findIndex((o) => o.routineId === s.routineId) === i);
  const visible = new Set(routines.map((r) => r.id));

  const things: Thing[] = [
    ...started
      .filter((s) => visible.has(s.routineId))
      .map((s) => ({
        id: s.routineId,
        kind: "task" as const,
        title: s.title,
        stepCount: s.total,
        run: { id: s.runId, done: s.done, total: s.total },
        saidAt: null,
        later: null,
      })),
    ...reminders.map((r) => ({
      id: r.id,
      kind: "reminder" as const,
      title: r.text,
      stepCount: 0,
      run: null,
      saidAt: r.createdAt,
      later: null,
    })),
    ...routines
      .filter((r) => !finishedToday.has(r.id) && !started.some((s) => s.routineId === r.id))
      .map((r) => ({
        id: r.id,
        kind: "task" as const,
        title: r.title,
        stepCount: r.stepCount,
        run: null,
        saidAt: null,
        later: null,
      })),
  ];

  const hold = new Map(holds.map((h) => [h.itemId, h]));
  const held = things
    .filter((t) => !hold.get(t.id)?.letGoAt)
    .map((t) => {
      const h = hold.get(t.id);
      return h?.laterUntil && h.laterUntil > now ? { ...t, later: h.laterMoment } : t;
    });
  return [...held.filter((t) => !t.later), ...held.filter((t) => t.later)];
}

/** Says how Otto knows a task was finished. Empty when the log can't say. */
export function evidenceFor(run: Pick<FinishedRun, "total" | "seen" | "said">): Memory["evidence"] {
  if (run.seen === run.total) return { kind: "saw", detail: "Otto saw every step" };
  if (run.seen > 0) return { kind: "saw", detail: `Otto saw ${run.seen} of ${run.total} steps` };
  if (run.said > 0) return { kind: "confirmed", detail: "You said you did it" };
  return null;
}

/** "5 of 6 steps on your own." */
export function onOwnLine(run: Pick<FinishedRun, "total" | "onOwn">): string {
  return `${run.onOwn} of ${run.total} steps on your own`;
}

/** Tasks in the order they were last finished, each once: what Otto remembers about the work. */
export function latestOfEachTask(runs: FinishedRun[]): FinishedRun[] {
  return runs.filter((run, i) => runs.findIndex((other) => other.routineId === run.routineId) === i);
}

export const LATER_MOMENTS = ["in 30 minutes", "after lunch", "this evening", "tomorrow"] as const;
export type LaterMoment = (typeof LATER_MOMENTS)[number];
export type Later = { moment: LaterMoment; until: string };

function at(day: Date, hour: number, addDays = 0): string {
  const when = new Date(day);
  when.setDate(when.getDate() + addDays);
  when.setHours(hour, 0, 0, 0);
  return when.toISOString();
}

/** "Later" choices that still make sense at this time of day, on the student's own clock. */
export function laterChoices(now: Date): Later[] {
  const soon = (hour: number) => now.getHours() < hour - 1;
  const choices: Later[] = [{ moment: "in 30 minutes", until: new Date(now.getTime() + 30 * 60_000).toISOString() }];
  if (soon(13)) choices.push({ moment: "after lunch", until: at(now, 13) });
  if (soon(18)) choices.push({ moment: "this evening", until: at(now, 18) });
  return choices;
}

/** "Not now": Otto doesn't ask again until tomorrow morning. */
export function notNow(now: Date): Later {
  return { moment: "tomorrow", until: at(now, 8, 1) };
}
