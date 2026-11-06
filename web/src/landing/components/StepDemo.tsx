"use client";

import { useEffect, useState } from "react";
import { Check, Eye, Lightbulb, RotateCcw, Sparkles } from "lucide-react";

/** A pretend task, so visitors can feel how one step at a time works. */
const STEPS = [
  {
    text: "Fill a cup with ice",
    help: ["What goes in the cup first?", "Use the scoop. Fill to the top line.", "The scoop is in the ice bin. Fill the cup up to the line near the top."],
  },
  {
    text: "Pour milk up to the line",
    help: ["The milk is in the fridge.", "Pour slowly. Stop at the line.", "Hold the cup still. Pour the milk until it touches the line on the cup."],
  },
  {
    text: "Add one shot of espresso",
    help: ["The coffee comes last.", "Press the button with one cup on it.", "Put the cup under the spout. Press the one-cup button. Wait for it to stop."],
  },
  {
    text: "Put the lid on",
    help: ["Almost done. What keeps it from spilling?", "Press the lid down all the way round.", "Line up the lid. Press around the edge until you hear it click."],
  },
];
const HELP_NAMES = ["Nudge", "Hint", "Show me"];
const CHEERS = ["Looks right!", "Nice pour!", "That's the one.", "Lid's on. Done!"];

/** The step's picture: the cup fills up as you go. */
function Cup({ step }: { step: number }) {
  return (
    <svg viewBox="0 0 200 200" className="size-full" aria-hidden>
      <ellipse cx="100" cy="186" rx="62" ry="8" fill="var(--clay)" />
      <clipPath id="cup-inside">
        <path d="M56 58h88l-10 120a8 8 0 0 1-8 7H74a8 8 0 0 1-8-7z" />
      </clipPath>
      <g clipPath="url(#cup-inside)">
        {/* milk, then espresso swirled on top */}
        <rect x="40" y={step >= 1 ? 80 : 200} width="120" height="130" fill="#f4ede1" style={{ transition: "y 700ms ease" }} />
        <path
          d="M50 80c18 10 34-8 52 2s34-6 50 2v14H50z"
          fill="#9a6a45"
          opacity={step >= 2 ? 0.9 : 0}
          style={{ transition: "opacity 700ms ease" }}
        />
        {/* ice */}
        {step >= 0 &&
          [
            [70, 140],
            [100, 150],
            [124, 132],
            [82, 108],
            [112, 102],
            [92, 76],
          ].map(([x, y], i) => (
            <rect key={i} x={x - 13} y={y - 13} width="26" height="26" rx="6" fill="#ffffff" opacity="0.75" stroke="#b6cec3" strokeWidth="2" transform={`rotate(${i * 17 - 20} ${x} ${y})`} />
          ))}
      </g>
      <path d="M56 58h88l-10 120a8 8 0 0 1-8 7H74a8 8 0 0 1-8-7z" fill="none" stroke="var(--ink)" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M62 74h76" stroke="var(--ink)" strokeWidth="2" strokeDasharray="5 5" opacity="0.4" />
      {/* lid */}
      <g style={{ transition: "transform 600ms cubic-bezier(0.2,0.7,0.2,1), opacity 400ms ease", transform: step >= 3 ? "none" : "translateY(-24px)", opacity: step >= 3 ? 1 : 0 }}>
        <path d="M48 58c0-14 104-14 104 0z" fill="var(--celadon)" stroke="var(--ink)" strokeWidth="3.5" strokeLinejoin="round" />
        <rect x="46" y="54" width="108" height="9" rx="4" fill="var(--celadon)" stroke="var(--ink)" strokeWidth="3.5" />
        <path d="M112 36l14-22" stroke="var(--ink)" strokeWidth="5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

type Phase = "doing" | "checking" | "checked";

/** A phone you can actually tap: Done checks the step, Help climbs nudge, hint, show me. */
export function StepDemo() {
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>("doing");
  const [helpLevel, setHelpLevel] = useState(0);
  const [onOwn, setOnOwn] = useState(0);
  const finished = step >= STEPS.length;

  // "Checking" stands in for Otto looking at the camera photo, then it moves on by itself.
  useEffect(() => {
    if (phase === "checking") {
      const t = setTimeout(() => setPhase("checked"), 900);
      return () => clearTimeout(t);
    }
    if (phase === "checked") {
      const t = setTimeout(() => {
        setStep((s) => s + 1);
        setHelpLevel(0);
        setPhase("doing");
      }, 1300);
      return () => clearTimeout(t);
    }
  }, [phase]);

  function done() {
    if (phase !== "doing") return;
    if (helpLevel === 0) setOnOwn((n) => n + 1);
    setPhase("checking");
  }

  function restart() {
    setStep(0);
    setOnOwn(0);
    setHelpLevel(0);
    setPhase("doing");
  }

  const current = STEPS[Math.min(step, STEPS.length - 1)];
  const pictureStep = phase === "doing" ? step - 1 : step;

  return (
    <div className="relative mx-auto w-full max-w-[360px]">
      <div className="rounded-[46px] border border-line bg-ink p-3 shadow-[0_30px_60px_-30px_var(--shadow)]">
        <div className="flex min-h-[620px] flex-col rounded-[36px] bg-ground px-5 pb-6 pt-5">
          <div className="flex items-center justify-between text-[14px] text-ink-3">
            <span>Make an iced latte</span>
            <span aria-hidden>●●●</span>
          </div>

          <div className="mt-4 flex justify-center gap-2" aria-label={`Step ${Math.min(step + 1, STEPS.length)} of ${STEPS.length}`}>
            {STEPS.map((_, i) => (
              <span key={i} className={`dot ${i < step ? "is-done" : ""} ${i === step && !finished ? "is-now" : ""}`} />
            ))}
          </div>

          {finished ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="size-40">
                <Cup step={3} />
              </div>
              <p className="mt-4 font-display text-[38px] leading-none">All done!</p>
              <p className="mt-3 text-ink-2">
                {onOwn} of {STEPS.length} steps on your own.
                <br />
                {onOwn === STEPS.length ? "Next time, Otto will step back." : "Help is always one tap away."}
              </p>
              <button type="button" onClick={restart} className="btn btn--quiet btn--small mt-6">
                <RotateCcw className="size-4" aria-hidden /> Make another
              </button>
            </div>
          ) : (
            <>
              <div className="relative mx-auto mt-5 size-48 rounded-[28px] bg-card">
                <Cup step={pictureStep} />
                {phase !== "doing" && (
                  <span className="absolute inset-x-3 bottom-3 rounded-full bg-ink/85 px-3 py-1.5 text-center text-[14px] font-semibold text-ground">
                    {phase === "checking" ? "Looking..." : CHEERS[step]}
                  </span>
                )}
              </div>
              <p className="mt-5 text-center text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                Step {step + 1} of {STEPS.length}
              </p>
              <p className="mt-1 text-center font-display text-[34px] leading-[1.05]" aria-live="polite">
                {current.text}
              </p>

              <div className="mt-4 min-h-[76px]" aria-live="polite">
                {helpLevel > 0 && phase === "doing" && (
                  <div className="rounded-2xl bg-cel-wash px-4 py-3 text-[16px] text-ink">
                    <span className="mb-0.5 block text-[12px] font-semibold uppercase tracking-[0.08em] text-cel-deep">
                      {HELP_NAMES[helpLevel - 1]}
                    </span>
                    {current.help[helpLevel - 1]}
                  </div>
                )}
              </div>

              <div className="mt-auto grid grid-cols-2 gap-2.5">
                <button type="button" onClick={done} disabled={phase !== "doing"} className="btn btn--primary col-span-2 py-4 disabled:opacity-60">
                  <Check className="size-5" aria-hidden /> Done
                </button>
                <button
                  type="button"
                  onClick={() => setHelpLevel((l) => Math.min(l + 1, 3))}
                  disabled={phase !== "doing" || helpLevel === 3}
                  className="btn btn--quiet btn--small disabled:opacity-50"
                >
                  <Lightbulb className="size-4" aria-hidden /> {helpLevel === 0 ? "Help" : "More help"}
                </button>
                <button
                  type="button"
                  onClick={() => setHelpLevel(3)}
                  disabled={phase !== "doing" || helpLevel === 3}
                  className="btn btn--quiet btn--small disabled:opacity-50"
                >
                  <Eye className="size-4" aria-hidden /> Show me
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <p className="mt-4 flex items-center justify-center gap-1.5 text-center font-hand text-[19px] text-ink-3">
        <Sparkles className="size-4" aria-hidden /> This one&apos;s real. Tap it!
      </p>
    </div>
  );
}
