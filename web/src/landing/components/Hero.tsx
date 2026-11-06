"use client";

import { useRef, useState } from "react";
import { site } from "@/landing/lib/site";
import { Leaf } from "./Leaf";
import { OtterSays } from "./OtterSays";
import { Pond } from "./Pond";
import type { AyinOtterHandle } from "@/components/otter/AyinOtter";

/** What the otter says each time someone taps it. It never runs out; it just starts again. */
const BOOPS = [
  "Ready when you are.",
  "Hi! I'm Otto.",
  "One step at a time.",
  "Boop received.",
  "I like your style.",
  "Okay, that tickles.",
];

export function Hero() {
  const otter = useRef<AyinOtterHandle>(null);
  const [boops, setBoops] = useState(0);

  function boop() {
    setBoops((n) => n + 1);
    if (boops % 2 === 0) otter.current?.swingTail();
    else otter.current?.tiltHead();
  }

  return (
    <section id="top" className="relative overflow-hidden px-5 pb-20 pt-12 sm:px-8 md:pb-28 md:pt-20">
      <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-[1.05fr_1fr]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-1.5 text-[15px] text-ink-2">
            <span className="size-2 rounded-full bg-cel" aria-hidden />
            Made with Arizona Autism Charter Schools and First Place AZ
          </p>
          <h1 className="mt-6 font-display text-[clamp(52px,8.5vw,96px)] leading-[0.95] tracking-[-0.015em]">
            Big tasks,
            <br />
            <span className="italic text-cel-deep">one small step</span>
            <br />
            at a time.
          </h1>
          <p className="mt-6 max-w-xl text-xl text-ink-2 md:text-[22px]">
            Otto is a friendly otter coach for neurodivergent teens and young adults. It shows you one step, checks it
            with you, and helps only when you ask. Every time you do it on your own, it helps a little less.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href={site.appUrl} className="btn btn--primary">
              Try Otto
            </a>
            <a href="#demo" className="btn btn--quiet">
              Watch the demo
            </a>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[540px] pt-16">
          <div className="absolute left-[6%] top-0 z-10">
            <OtterSays tailX="70%">{BOOPS[boops % BOOPS.length]}</OtterSays>
          </div>
          <button
            type="button"
            onClick={boop}
            className="block w-full cursor-pointer rounded-[40%] text-left"
            aria-label="Say hi to the otter"
          >
            <Pond ref={otter} alt="Otto's otter, floating on its back in a pond and holding a smooth green stone." />
          </button>
          <Leaf color="var(--mustard)" className="drift absolute -left-2 bottom-8 w-11" style={{ ["--r" as string]: "-20deg" }} />
          <Leaf color="var(--sky)" className="drift absolute -right-1 bottom-24 w-9" style={{ ["--r" as string]: "40deg", animationDelay: "-3s" }} />
          <Leaf color="var(--apricot)" className="drift absolute bottom-12 right-[8%] w-8" style={{ ["--r" as string]: "110deg", animationDelay: "-6s" }} />
          <p className="mt-4 text-center font-hand text-[19px] text-ink-3">(go on, tap the otter)</p>
        </div>
      </div>
    </section>
  );
}
