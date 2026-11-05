"use client";

import { HandHeart } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { CrewPond } from "@/components/CrewPond";
import UprightOtter from "@/components/otter/UprightOtter";
import type { CrewView } from "@/lib/data/crew";
import { api } from "@/lib/client/api";
import { useStudentId } from "@/lib/client/settings";

/** "today", "yesterday" or the weekday: plain words, no exact timestamps. */
function whenWords(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "today";
  if (days < 2) return "yesterday";
  return new Date(iso).toLocaleDateString("en-US", { weekday: "long" });
}

export default function CrewPage() {
  const [studentId] = useStudentId();
  const [crew, setCrew] = useState<CrewView | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [cheering, setCheering] = useState<string | null>(null);

  const load = (id: string) => api.crew(id).then((r) => setCrew(r.crew)).catch((e) => setMessage(e.message));

  useEffect(() => {
    if (studentId) load(studentId);
  }, [studentId]);

  async function act(action: Promise<unknown>) {
    await action.catch((e) => setMessage(e.message));
    if (studentId) load(studentId);
  }

  if (!crew || !studentId) {
    return (
      <AppShell>
        <div className="page flex flex-col items-center gap-3 pt-10 text-center">
          <p>{message ?? (studentId ? "Loading your crew" : "Pick your name on the Today screen first.")}</p>
          <Link href="/" className="btn btn--text">
            Go to Today
          </Link>
        </div>
      </AppShell>
    );
  }

  const me = crew.members.find((m) => m.id === studentId);
  const incoming = crew.invites.filter((i) => i.fromId !== studentId && i.status === "waiting");
  const mine = crew.invites.find((i) => i.fromId === studentId);

  return (
    <AppShell>
      <div className="page flex flex-col gap-8 pb-6">
        <header className="flex flex-col gap-1 text-center">
          <h1 className="page__h">{crew.name}</h1>
          <p className="text-[18px] text-ink-2">
            <strong className="text-ink">{crew.onOwnTogether}</strong> of {crew.weeklyGoal} steps on our own this week.
            Let&apos;s fill the pond together.
          </p>
        </header>

        <CrewPond fill={crew.onOwnTogether / crew.weeklyGoal} members={crew.members} />

        {incoming.map((invite) => (
          <section key={invite.id} className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-cel-wash p-5">
            <p className="text-[18px] text-ink">
              <strong>{invite.fromName}</strong> wants to practise &ldquo;{invite.about}&rdquo; with you.
            </p>
            <div className="flex gap-3">
              <Button look="main" onClick={() => act(api.answerInvite(invite.id, studentId, "yes"))}>
                Yes, let&apos;s
              </Button>
              <Button onClick={() => act(api.answerInvite(invite.id, studentId, "not-today"))}>Not today</Button>
            </div>
          </section>
        ))}

        {crew.buddy && me && (
          <section className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-card p-5">
            <div className="flex items-end justify-center gap-2">
              <figure className="flex w-28 flex-col items-center">
                <UprightOtter className="aspect-square w-full" furHue={me.furHue} active={false} />
                <figcaption className="font-semibold">You</figcaption>
              </figure>
              <HandHeart className="mb-10 text-cel-deep" size={28} aria-hidden />
              <figure className="flex w-28 flex-col items-center">
                <UprightOtter className="aspect-square w-full" furHue={crew.buddy.furHue} active={false} />
                <figcaption className="font-semibold">{crew.buddy.name}</figcaption>
              </figure>
            </div>
            <h2 className="text-center text-[15px] font-medium text-ink-3">Your practice buddy this week</h2>
            {crew.buddy.theyCanShowYou.length > 0 && (
              <p className="text-[18px]">
                {crew.buddy.name} can show you: <strong>{crew.buddy.theyCanShowYou.join(", ").toLowerCase()}</strong>
              </p>
            )}
            {crew.buddy.youCanShowThem.length > 0 && (
              <p className="text-[18px]">
                You can show {crew.buddy.name}: <strong>{crew.buddy.youCanShowThem.join(", ").toLowerCase()}</strong>
              </p>
            )}
            {!mine && !incoming.some((i) => i.fromName === crew.buddy?.name) && (
              <Button look="main" onClick={() => act(api.inviteBuddy(studentId))}>
                Ask {crew.buddy.name} to practise together
              </Button>
            )}
            {mine?.status === "waiting" && <p className="text-center text-ink-2">Waiting for {mine.toName} to answer</p>}
            {mine?.status === "yes" && (
              <p className="rounded-2xl bg-cel-wash px-4 py-3 text-center text-[18px] text-cel-deep">
                {mine.toName} said yes! Practise &ldquo;{mine.about}&rdquo; together today.
              </p>
            )}
            {mine?.status === "not-today" && (
              <p className="text-center text-ink-2">{mine.toName} can&apos;t today. Try another day.</p>
            )}
          </section>
        )}

        {crew.asksForMe.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-[15px] font-medium text-ink-3">Asking for your help</h2>
            {crew.asksForMe.map((ask) => (
              <p key={ask.id} className="rounded-2xl bg-cel-wash px-4 py-3 text-[18px] text-ink">
                <strong>{ask.fromName}</strong> would like help with &ldquo;{ask.stepText}&rdquo;
              </p>
            ))}
          </section>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="text-[15px] font-medium text-ink-3">This week in the crew</h2>
          {crew.wins.length === 0 && <p className="text-ink-2">Nobody has finished a task yet this week.</p>}
          <ul className="flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-card">
            {crew.wins.map((win) => (
              <li key={win.runId} className="flex gap-3 border-b border-line p-4 last:border-0">
                <UprightOtter className="h-14 w-14 shrink-0 rounded-full bg-clay" furHue={win.furHue} active={false} />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <p className="text-[18px] leading-snug">
                    <strong>{win.studentId === studentId ? "You" : win.name}</strong> finished {win.title}
                  </p>
                  <p className="text-[15px] text-ink-2">
                    {win.onOwn === win.total ? "Every step" : `${win.onOwn} of ${win.total} steps`} on their own ·{" "}
                    {whenWords(win.finishedAt)}
                  </p>
                  {win.cheers.length > 0 && (
                    <p className="text-[15px] text-cel-deep">
                      {win.cheers.map((c) => `${c.fromName}: ${c.phrase}`).join(" · ")}
                    </p>
                  )}
                  {win.studentId !== studentId && !win.cheered && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {cheering === win.runId ? (
                        crew.cheers.map((phrase) => (
                          <button
                            key={phrase}
                            onClick={() => {
                              setCheering(null);
                              act(api.cheer(studentId, win.runId, phrase));
                            }}
                            className="rounded-full bg-clay px-3.5 py-1.5 text-[15px] font-medium text-ink hover:bg-clay-2"
                          >
                            {phrase}
                          </button>
                        ))
                      ) : (
                        <button
                          onClick={() => setCheering(win.runId)}
                          className="rounded-full border border-line px-3.5 py-1.5 text-[15px] font-medium text-ink"
                        >
                          Cheer
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        {message && <p className="text-ink-3">{message}</p>}
      </div>
    </AppShell>
  );
}
