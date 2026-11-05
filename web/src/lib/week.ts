// Weekly numbers for the crew screen. Rings restart every Monday; nothing ever "breaks".

export interface StepLog {
  studentId: string;
  helpLevel: number;
  doneAt: string; // ISO date
}

/** Monday 00:00 (local time) of the week that contains `date`. */
export function startOfWeek(date: Date): Date {
  const start = new Date(date);
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  start.setHours(0, 0, 0, 0);
  return start;
}

/** Steps a student did with no help this week. */
export function stepsOnOwn(logs: StepLog[], studentId: string): number {
  return logs.filter((log) => log.studentId === studentId && log.helpLevel === 0).length;
}

/** How full a ring is, from 0 to 1. */
export function ringFill(onOwn: number, weeklyTarget: number): number {
  if (weeklyTarget <= 0) return 0;
  return Math.min(onOwn / weeklyTarget, 1);
}

/** Days this week the student practised: a count, never a streak. */
export function daysPractised(logs: StepLog[], studentId: string): number {
  const days = logs
    .filter((log) => log.studentId === studentId)
    .map((log) => new Date(log.doneAt).toDateString());
  return new Set(days).size;
}
