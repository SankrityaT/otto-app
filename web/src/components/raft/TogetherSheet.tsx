"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CrewView } from "@/lib/data/crew";
import { api } from "@/lib/client/api";
import { OtterAvatar } from "./OtterAvatar";

type Member = CrewView["members"][number];

/**
 * "Do a task together": pick a raftmate (unless one was tapped in the pond), then a task.
 * Your task starts right away and they get an invite to join.
 */
export function TogetherSheet({
  meId,
  members,
  buddyId,
  start,
  onClose,
  onStarted,
}: {
  meId: string;
  members: Member[];
  buddyId: string | null;
  start: Member | null;
  onClose: () => void;
  onStarted: (runId: string) => void;
}) {
  const [who, setWho] = useState<Member | null>(start);
  const [routines, setRoutines] = useState<{ id: string; title: string; stepCount: number }[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const others = members.filter((m) => m.id !== meId);

  useEffect(() => {
    api.routines().then((r) => setRoutines(r.routines)).catch((e) => setMessage(e.message));
  }, []);

  async function go(routineId: string) {
    if (!who) return;
    try {
      onStarted((await api.inviteTogether(meId, who.id, routineId)).runId);
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center" role="dialog" aria-modal aria-label="Do a task together">
      <div className="flex max-h-[88svh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-[28px] bg-ground p-5 sm:rounded-[28px]">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[30px] leading-none">{who ? `With ${who.name}` : "Do a task together"}</h2>
          <button onClick={onClose} className="text-[16px] font-semibold text-ink-2">
            Cancel
          </button>
        </div>

        {!who ? (
          <>
            <p className="text-[17px] text-ink-2">Pick someone. You&apos;ll each do the same task and see each other&apos;s otter move.</p>
            <ul className="grid grid-cols-3 gap-3">
              {others.map((m) => (
                <li key={m.id}>
                  <button onClick={() => setWho(m)} className="flex w-full flex-col items-center gap-1 rounded-[var(--radius-card)] bg-card p-3">
                    <OtterAvatar furHue={m.furHue} size={64} />
                    <span className="text-[16px] font-semibold">{m.name}</span>
                    {m.id === buddyId && <span className="text-[13px] text-cel-deep">Your buddy</span>}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <p className="text-[17px] text-ink-2">Pick a task. Yours starts now, and {who.name} gets an invite to join.</p>
            <ul className="flex flex-col gap-2">
              {routines.map((r) => (
                <li key={r.id}>
                  <button onClick={() => go(r.id)} className="flex w-full items-center justify-between rounded-[var(--radius-card)] bg-card px-4 py-3.5 text-left">
                    <span className="text-[17px] font-semibold">{r.title}</span>
                    <span className="text-ink-3">{r.stepCount} steps</span>
                  </button>
                </li>
              ))}
            </ul>
            <Link href={`/raft/people/${who.id}`} className="btn btn--text self-center">
              See how {who.name} works best
            </Link>
          </>
        )}
        {message && <p className="text-ink-3">{message}</p>}
      </div>
    </div>
  );
}
