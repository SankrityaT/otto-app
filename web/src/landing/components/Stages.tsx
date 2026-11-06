"use client";

import { useEffect, useRef, useState } from "react";
import { Reveal } from "./Reveal";
import { Section } from "./Section";

/** First Place AZ's five stages, in the words Otto uses with students. */
const STAGES = [
  { name: "Watch", says: "See every step before you try.", ayin: "Otto shows you the whole task first." },
  { name: "First tries", says: "Give it a go.", ayin: "Otto shows each step and sees what you can do." },
  { name: "With help", says: "Help when you ask.", ayin: "Otto shows each step and helps when you ask." },
  { name: "Check-in", says: "You lead.", ayin: "Otto just checks each step with you." },
  { name: "On my own", says: "You've got this.", ayin: "Otto only checks at the very end." },
];

/** The sticky nav's height. The pinned card sits in the space below it. */
const NAV_PX = 72;
/** How far to scroll for each stage, as a share of the screen's height. Long enough to read each one. */
const STAGE_SCROLL_VH = 70;
/** Each stage stays on screen at least this long, so there is time to read it. */
const MIN_STAGE_MS = 700;

/**
 * The card pins in the middle of the screen while the page scrolls past a tall track, and
 * scrolling moves it through the five stages, one after another. Each stage stays up for a
 * moment before the next, and a quick scroll still steps through every stage in order rather
 * than skipping, so each one gets read. After the last stage the page carries on. Tapping a stage scrolls to it, so scrolling and
 * tapping always agree.
 */
export function Stages() {
  const [stage, setStage] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const r = 46;
  const circumference = 2 * Math.PI * r;

  // How far through the track we are, from 0 (just pinned) to 1 (about to let go).
  const progress = () => {
    const el = track.current;
    if (!el) return 0;
    const pinned = window.innerHeight - NAV_PX;
    const travel = el.offsetHeight - pinned;
    return Math.min(1, Math.max(0, (NAV_PX - el.getBoundingClientRect().top) / travel));
  };

  // The stage the scroll position asks for, the stage on screen, and when that last changed.
  const want = useRef(0);
  const shown = useRef(0);
  const changedAt = useRef(0);

  useEffect(() => {
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Step one stage at a time toward the scroll position, holding each for MIN_STAGE_MS.
    const step = () => {
      timer = undefined;
      if (shown.current === want.current) return;
      const wait = changedAt.current + MIN_STAGE_MS - performance.now();
      if (wait > 0) {
        timer = setTimeout(step, wait);
        return;
      }
      shown.current += Math.sign(want.current - shown.current);
      changedAt.current = performance.now();
      setStage(shown.current);
      if (shown.current !== want.current) timer = setTimeout(step, MIN_STAGE_MS);
    };
    const update = () => {
      frame = 0;
      want.current = Math.min(STAGES.length - 1, Math.floor(progress() * STAGES.length));
      if (!timer) step();
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  /** Scroll to the middle of a stage's stretch of the track. `at` is the tap's event time. */
  const goTo = (i: number, at: number) => {
    const el = track.current;
    if (!el) return;
    // A tapped stage shows straight away; scrolling there then keeps it.
    shown.current = want.current = i;
    changedAt.current = at;
    setStage(i);
    const pinned = window.innerHeight - NAV_PX;
    const travel = el.offsetHeight - pinned;
    const top = el.getBoundingClientRect().top + window.scrollY - NAV_PX + ((i + 0.5) / STAGES.length) * travel;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top, behavior: still ? "auto" : "smooth" });
  };

  return (
    <Section
      label="Help that steps back"
      title={
        <>
          The best help knows
          <br />
          <span className="italic text-cel-deep">when to let go.</span>
        </>
      }
      intro="Every time you do a step on your own, Otto helps a little less. Ask for help any time and it comes right back. The goal is you, doing it."
      className="bg-card/60"
    >
      <div ref={track} className="relative" style={{ height: `calc(100vh - ${NAV_PX}px + ${STAGES.length * STAGE_SCROLL_VH}vh)` }}>
        <div className="sticky flex flex-col justify-center" style={{ top: NAV_PX, height: `calc(100vh - ${NAV_PX}px)` }}>
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
                          onClick={(e) => goTo(i, e.timeStamp)}
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
                    These five stages come from First Place AZ, who use them to teach life skills. Otto works out your stage from how
                    your last tries went, so you never have to keep track.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
          <p
            className={`mt-5 text-center font-hand text-[19px] text-ink-3 transition-opacity duration-500 ${stage < STAGES.length - 1 ? "opacity-100" : "opacity-0"}`}
            aria-hidden
          >
            Keep scrolling to see the next stage
          </p>
        </div>
      </div>
    </Section>
  );
}
