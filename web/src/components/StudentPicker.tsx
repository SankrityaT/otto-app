"use client";

import type { Student } from "@/lib/data/crew";
import UprightOtter from "./otter/UprightOtter";

/** "Who's working today?" Each student finds their own otter. */
export function StudentPicker({
  students,
  onPick,
  message,
}: {
  students: Student[];
  onPick: (id: string) => void;
  message: string | null;
}) {
  return (
    <div className="app">
      <main className="page flex min-h-svh flex-col justify-center gap-8 py-10">
        <h1 className="page__h text-center">Who&apos;s working today?</h1>
        <ul className="grid grid-cols-2 gap-4">
          {students.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => onPick(s.id)}
                className="flex w-full flex-col items-center gap-1 rounded-[var(--radius-card)] border border-line bg-card px-4 pb-4 pt-2"
              >
                <UprightOtter className="h-28 w-28" furHue={s.furHue} active={false} />
                <span className="text-[19px] font-semibold">{s.name}</span>
              </button>
            </li>
          ))}
        </ul>
        {students.length === 0 && (
          <p className="text-center text-ink-3">
            No students yet. Run <code>npm run seed</code> to add a demo crew.
          </p>
        )}
        {message && <p className="text-center text-ink-3">{message}</p>}
      </main>
    </div>
  );
}
