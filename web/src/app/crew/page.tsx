"use client";

import { ArrowLeft, HandHeart } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Ring } from "@/components/Ring";
import type { CrewView } from "@/lib/data/crew";
import { api } from "@/lib/client/api";
import { useStudentId } from "@/lib/client/settings";

export default function CrewPage() {
  const [studentId] = useStudentId();
  const [crew, setCrew] = useState<CrewView | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = (id: string) => api.crew(id).then((r) => setCrew(r.crew)).catch((e) => setMessage(e.message));

  useEffect(() => {
    if (studentId) load(studentId);
  }, [studentId]);

  async function cheer(runId: string, phrase: string) {
    if (!studentId) return;
    await api.cheer(studentId, runId, phrase).catch((e) => setMessage(e.message));
    load(studentId);
  }

  if (!crew) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-5 text-center text-[17px]">
        <p>{message ?? (studentId ? "Loading your crew" : "Pick your name on the home screen first.")}</p>
        <Link href="/" className="underline">
          Home
        </Link>
      </main>
    );
  }

  const goalFill = Math.min(crew.onOwnTogether / crew.weeklyGoal, 1);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-7 px-5 py-6">
      <header className="flex items-center gap-3">
        <Link href="/" aria-label="Home" className="grid h-11 w-11 place-items-center rounded-full bg-card text-ink-2">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-display text-[34px] leading-none">{crew.name}</h1>
      </header>

      <section className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-card p-5">
        <p className="text-[17px] text-ink-2">This week, together</p>
        <p className="flex items-baseline gap-2">
          <span className="font-display text-[56px] leading-none">{crew.onOwnTogether}</span>
          <span className="text-[17px] text-ink-2">of {crew.weeklyGoal} steps on our own</span>
        </p>
        <div className="h-2.5 overflow-hidden rounded-full bg-clay" aria-hidden>
          <div className="h-full rounded-full bg-cel-deep" style={{ width: `${goalFill * 100}%` }} />
        </div>
        <ul className="grid grid-cols-4 gap-2 pt-2">
          {crew.members.map((member) => (
            <li key={member.id} className="flex flex-col items-center gap-1.5 text-center">
              <Ring fill={member.ring} size={60} label={`${member.name}: ${member.onOwn} steps on their own this week`} />
              <span className="text-[15px] font-medium">{member.name}</span>
              <span className="text-[13px] text-ink-3">
                {member.days} {member.days === 1 ? "day" : "days"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {crew.asksForMe.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[15px] font-medium text-ink-3">Asking for your help</h2>
          {crew.asksForMe.map((ask) => (
            <p key={ask.id} className="flex items-start gap-3 rounded-2xl bg-cel-wash px-4 py-3 text-[17px] text-cel-deep">
              <HandHeart size={20} className="mt-0.5 shrink-0" />
              {ask.fromName} would like help with &ldquo;{ask.stepText}&rdquo;
            </p>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-[15px] font-medium text-ink-3">Wins this week</h2>
        {crew.wins.length === 0 && <p className="text-[17px] text-ink-2">Nobody has finished a task yet this week.</p>}
        <ul className="flex flex-col gap-3">
          {crew.wins.map((win) => (
            <li key={win.runId} className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-card p-5">
              <p className="text-[17px] font-medium leading-snug">{win.title}</p>
              <p className="text-[15px] text-ink-3">
                {win.name} did {win.onOwn} of {win.total} steps on their own
              </p>
              {win.studentId !== studentId &&
                (win.cheered ? (
                  <p className="text-[15px] text-cel-deep">You cheered</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {crew.cheers.map((phrase) => (
                      <button
                        key={phrase}
                        onClick={() => cheer(win.runId, phrase)}
                        className="rounded-full bg-clay px-4 py-2 text-[15px] font-medium hover:bg-clay-2"
                      >
                        {phrase}
                      </button>
                    ))}
                  </div>
                ))}
            </li>
          ))}
        </ul>
      </section>

      {message && <p className="text-ink-3">{message}</p>}
    </main>
  );
}
