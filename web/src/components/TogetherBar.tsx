"use client";

import { useEffect, useState } from "react";
import type { Together } from "@/lib/data/together";
import { api } from "@/lib/client/api";
import UprightOtter from "./otter/UprightOtter";

/** How often a shared task checks on the partner. */
const POLL_MS = 3000;

/**
 * Doing a task together: the partner's otter sits beside the student's step, with their
 * progress, and hops whenever they finish a step. One tap sends a preset cheer. No video
 * and no free chat, so it stays calm and safe.
 */
export function TogetherBar({ runId }: { runId: string }) {
  const [together, setTogether] = useState<Together | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  useEffect(() => {
    const check = () =>
      api
        .together(runId)
        .then((r) => setTogether(r.together))
        .catch(() => {});
    check();
    const timer = setInterval(check, POLL_MS);
    return () => clearInterval(timer);
  }, [runId]);

  if (!together) return null;
  const { partner } = together;
  const cheer = together.cheers.at(-1);

  async function send(phrase: string) {
    setSent(phrase);
    await api.cheerPartner(runId, phrase).catch(() => setSent(null));
  }

  return (
    <section className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-cel-wash px-3 py-2" aria-label={`Doing this with ${partner.name}`}>
      <div className="flex items-center gap-3">
        <UprightOtter className="h-14 w-14 shrink-0" furHue={partner.furHue} mood="talking" beat={together.done} />
        <div className="min-w-0 flex-1" aria-live="polite">
          {together.status === "waiting" ? (
            <p className="text-[16px] text-cel-deep">Waiting for {partner.name} to join…</p>
          ) : together.status === "not-today" ? (
            <p className="text-[16px] text-cel-deep">{partner.name} can&apos;t today. You&apos;ve got this.</p>
          ) : (
            <>
              <p className="truncate text-[16px] font-semibold text-cel-deep">
                {together.finished
                  ? `${partner.name} finished!`
                  : together.lastStep
                    ? `${partner.name} did: ${together.lastStep.text}`
                    : `${partner.name} is starting`}
              </p>
              <ol className="mt-1 flex gap-1" aria-label={`${partner.name}: ${together.done} of ${together.total} steps`}>
                {Array.from({ length: together.total }, (_, i) => (
                  <li key={i} className={`h-1.5 flex-1 rounded-full ${i < together.done ? "bg-cel-deep" : "bg-clay-2"}`} />
                ))}
              </ol>
            </>
          )}
        </div>
      </div>
      {cheer && (
        <p key={cheer.id} className="chat__bubble self-start rounded-full bg-card px-3 py-1 text-[15px] text-ink">
          {partner.name}: {cheer.phrase}
        </p>
      )}
      {together.status === "joined" && (
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {together.phrases.map((phrase) => (
            <button
              key={phrase}
              onClick={() => send(phrase)}
              disabled={sent === phrase}
              className="shrink-0 rounded-full border border-line bg-card px-3 py-1.5 text-[14px] font-medium text-ink disabled:opacity-50"
            >
              {sent === phrase ? "Sent" : phrase}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
