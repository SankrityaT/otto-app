"use client";

import { LeafShape, type LeafTone } from "./pond/PondLeaves";

type Task = { id: string; title: string; tone: LeafTone };

/**
 * The tasks under the pond, as leaves you can read and tap (the pond's own leaves only show
 * their names on hover, which phones don't have). A task already started comes first, with a
 * ring showing how far along it is.
 */
export function TaskLeaves({
  started,
  tasks,
  onCarryOn,
  onStart,
}: {
  started: (Task & { runId: string; done: number; total: number })[];
  tasks: (Task & { stepCount: number })[];
  onCarryOn: (runId: string) => void;
  onStart: (routineId: string) => void;
}) {
  return (
    <ul className="flex w-full max-w-[560px] flex-wrap justify-center gap-2.5" aria-label="Your tasks">
      {started.map((task) => (
        <li key={task.runId}>
          <button
            onClick={() => onCarryOn(task.runId)}
            className={`routine--${task.tone} flex items-center gap-2.5 rounded-full border-2 border-[var(--routine)] bg-card py-1.5 pl-1.5 pr-4 text-left`}
          >
            <Ring part={task.total ? task.done / task.total : 0} />
            <span>
              <span className="block text-[16px] font-semibold leading-tight text-ink">{task.title}</span>
              <span className="block text-[14px] text-ink-3">
                Step {Math.min(task.done + 1, task.total)} of {task.total} · Carry on
              </span>
            </span>
          </button>
        </li>
      ))}
      {tasks.map((task) => (
        <li key={task.id}>
          <button
            onClick={() => onStart(task.id)}
            className={`routine--${task.tone} flex items-center gap-2 rounded-full border border-line bg-card py-2 pl-2 pr-4 text-[16px] font-semibold text-ink hover:bg-clay`}
          >
            <LeafShape className="leaf__svg h-7 w-7" />
            {task.title}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** A leaf inside a ring that fills as the task goes on. */
function Ring({ part }: { part: number }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative grid h-12 w-12 shrink-0 place-items-center" aria-hidden>
      <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="var(--line)" strokeWidth="4" />
        <circle cx="24" cy="24" r={r} fill="none" stroke="var(--routine)" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${c * part} ${c}`} />
      </svg>
      <LeafShape className="leaf__svg h-6 w-6" />
    </span>
  );
}
