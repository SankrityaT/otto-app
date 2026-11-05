"use client";

import { useState } from "react";
import { Reveal } from "./Reveal";
import { Section } from "./Section";

/** First Place AZ's five stages, in the words Ayin uses with students. */
const STAGES = [
  { name: "Watch", says: "See every step before you try.", ayin: "Ayin shows you the whole task first." },
  { name: "First tries", says: "Give it a go.", ayin: "Ayin shows each step and sees what you can do." },
  { name: "With help", says: "Help when you ask.", ayin: "Ayin shows each step and helps when you ask." },
  { name: "Check-in", says: "You lead.", ayin: "Ayin just checks each step with you." },
  { name: "On my own", says: "You've got this.", ayin: "Ayin only checks at the very end." },
];


export function Stages() {
  const [stage, setStage] = useState(2);
  const r = 46;
  const circumference = 2 * Math.PI * r;

  return (
    <Section
      number="02"
      label="help that steps back"
      title={
        <>
          The best help knows
          <br />
          <span className="italic text-cel-deep">when to let go.</span>
        </>
      }
      intro="Every time you do a step on your own, Ayin helps a little less. Ask for help any time and it comes right back. The goal is you, doing it."
      className="bg-card/60"
    >
      <Reveal>
        <div className="card overflow-hidden p-6 md:p-10">
          <div className="grid items-center gap-10 md:grid-cols-[auto_1fr]">
            <div className="relative mx-auto size-56">
              <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden>
                <circle cx="60" cy="60" r={r} fill="none" stroke="var(--celadon-wash)" strokeWidth="14" />
                <circle
                  className="ring__fill"
                  cx="60"
                  cy="60"
                  r={r}
                  fill="none"
                  stroke="var(--celadon)"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - (stage + 1) / STAGES.length)}
                />
              </svg>
              <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                  <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-3">Stage</p>
                  <p className="font-display text-[56px] leading-none">
                    {stage + 1}
                    <span className="text-[28px] text-ink-3">/{STAGES.length}</span>
                  </p>
                  <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-cel-deep">{STAGES[stage].name}</p>
                </div>
              </div>
            </div>

            <div>
              <ol className="grid grid-cols-5 gap-1.5" role="list">
                {STAGES.map((s, i) => (
                  <li key={s.name}>
                    <button
                      type="button"
                      onClick={() => setStage(i)}
                      aria-pressed={stage === i}
                      className={`flex w-full flex-col items-start gap-2 rounded-2xl p-2 text-left transition-colors md:p-3 ${stage === i ? "bg-cel-wash" : "hover:bg-clay/60"}`}
                    >
                      <span className={`h-2 w-full rounded-full ${i <= stage ? "bg-cel" : "bg-line"}`} />
                      <span className="text-[12px] font-semibold text-ink-3 md:text-[13px]">Stage {i + 1}</span>
                      <span className="text-[14px] font-semibold leading-tight md:text-[17px]">{s.name}</span>
                    </button>
                  </li>
                ))}
              </ol>
              <div className="mt-6 min-h-[96px]" aria-live="polite">
                <p className="font-display text-[34px] leading-none">{STAGES[stage].says}</p>
                <p className="mt-2 text-ink-2">{STAGES[stage].ayin}</p>
              </div>
              <p className="mt-4 border-t border-line pt-4 text-[16px] text-ink-3">
                These five stages come from First Place AZ, who use them to teach life skills. Ayin works out your stage from how
                your last tries went, so you never have to keep track.
              </p>
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
