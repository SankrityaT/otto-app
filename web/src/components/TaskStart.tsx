"use client";

import { useState } from "react";
import type { Run } from "@/lib/data/runs";
import { STAGES } from "@/lib/stages";
import { Button } from "./Button";
import UprightOtter from "./otter/UprightOtter";

/**
 * A pause before the task starts, like the doorway nooks at First Place: a moment to get
 * ready, never a rush. It shows where the student is on the five-stage path for this task.
 */
export function TaskStart({ run, onStart }: { run: Run; onStart: (mode: "steps" | "alone") => void }) {
  const [watching, setWatching] = useState(run.stage === 1);
  const stage = STAGES[run.stage - 1];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 py-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <UprightOtter className="h-32 w-32" furHue={run.furHue} />
        <h1 className="font-display text-[40px] leading-[1.05]">{run.title}</h1>
        <p className="text-[17px] text-ink-2">
          {run.steps.length} steps. Start when you&apos;re ready.
        </p>
      </div>

      <section aria-label={`Stage ${run.stage} of 5: ${stage.name}`} className="flex flex-col gap-3">
        <ol className="flex items-start justify-between">
          {STAGES.map((s, i) => {
            const n = i + 1;
            return (
              <li key={s.name} className="flex w-1/5 flex-col items-center gap-1.5 text-center">
                <span
                  className={`h-4 w-4 rounded-full border-2 ${
                    n < run.stage ? "border-cel-deep bg-cel-deep" : n === run.stage ? "border-cel-deep bg-cel" : "border-clay-2"
                  }`}
                />
                <span className={`text-[13px] leading-tight ${n === run.stage ? "font-semibold text-ink" : "text-ink-3"}`}>
                  {s.name}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="rounded-2xl bg-cel-wash px-4 py-3 text-center text-[17px] text-cel-deep">{stage.says}</p>
      </section>

      {watching && (
        <ol className="flex flex-col gap-3" aria-label="Every step">
          {run.steps.map((step, i) => (
            <li key={step.id} className="flex items-center gap-3 rounded-2xl border border-line bg-card p-2 pr-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- an SVG drawn per step and served by our API */}
              <img src={`/api/steps/${step.id}/picture`} alt="" className="h-16 w-20 shrink-0 rounded-xl bg-clay object-contain" />
              <span className="text-[17px]">
                <span className="text-ink-3">{i + 1}. </span>
                {step.text}
              </span>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-auto flex flex-col gap-3">
        <a href={`/print/${run.routineId}`} className="btn btn--text self-center">
          Print a paper step card for the station
        </a>
        {run.stage === 5 ? (
          <>
            <Button look="main" className="h-14" onClick={() => onStart("alone")}>
              Do it on my own
            </Button>
            <Button onClick={() => onStart("steps")}>Show me the steps</Button>
          </>
        ) : (
          <>
            <Button look="main" className="h-14" onClick={() => onStart("steps")}>
              {run.stage === 1 ? "I'm ready to try" : "Start"}
            </Button>
            {!watching && (
              <Button look="quiet" onClick={() => setWatching(true)}>
                See every step first
              </Button>
            )}
          </>
        )}
      </div>
    </main>
  );
}
