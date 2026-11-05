"use client";

import UprightOtter, { type OtterMood } from "./otter/UprightOtter";
import { Ripples } from "./pond/PondLeaves";

/** Havi's otter sitting up in a little pond. */
export function OtterInPond({ furHue = 0, mood = "idle", beat = 0 }: { furHue?: number; mood?: OtterMood; beat?: number }) {
  return (
    <div className="relative w-44">
      <svg viewBox="0 0 200 70" className="absolute inset-x-[-10%] bottom-[-4%] w-[120%]" aria-hidden>
        <ellipse cx="100" cy="35" rx="99" ry="34" fill="var(--bank)" />
        <ellipse cx="100" cy="36" rx="90" ry="29" fill="var(--water-edge)" />
        <ellipse cx="100" cy="37" rx="84" ry="25" fill="var(--water)" />
      </svg>
      <Ripples className="absolute left-1/2 top-[86%] w-[80%] -translate-x-1/2 -translate-y-1/2" />
      <UprightOtter className="relative block aspect-square w-full" furHue={furHue} mood={mood} beat={beat} />
    </div>
  );
}

/**
 * While something loads: the otter in its pond, thinking, with what it's doing in a
 * hand-written speech bubble. Calmer and friendlier than a line of text.
 */
export function OtterWaits({ says, furHue = 0 }: { says: string; furHue?: number }) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 p-6" role="status" aria-live="polite">
      <span className="says bubble-pop">{says}</span>
      <OtterInPond furHue={furHue} mood="thinking" />
    </div>
  );
}
