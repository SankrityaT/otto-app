"use client";

import { Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { speak } from "@/lib/client/speech";
import { Ring } from "./Ring";

/**
 * For steps that take a set time, like steaming milk for 30 seconds. Time is hard to feel,
 * so the ring shows it draining away. It only counts when the student starts it, and it
 * never turns red or says "late".
 */
export function StepTimer({ seconds }: { seconds: number }) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (startedAt === null) return;
    const tick = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(tick);
  }, [startedAt]);

  const elapsed = startedAt === null ? 0 : (now - startedAt) / 1000;
  const left = Math.max(0, Math.ceil(seconds - elapsed));
  const finished = startedAt !== null && left === 0;

  useEffect(() => {
    if (finished) speak(`That's ${seconds} seconds.`);
  }, [finished, seconds]);

  if (startedAt === null) {
    return (
      <button
        onClick={() => {
          setStartedAt(Date.now());
          setNow(Date.now());
        }}
        className="flex items-center gap-2 self-start rounded-full bg-card px-4 py-2.5 text-[17px] font-medium"
      >
        <Timer size={20} /> Start a {seconds} second timer
      </button>
    );
  }

  return (
    <div className="flex items-center gap-4 rounded-2xl bg-card px-4 py-3" role="timer" aria-live="polite">
      <div className="relative grid place-items-center">
        <Ring fill={left / seconds} size={56} stroke={6} label={`${left} seconds left`} />
        <span className="absolute text-[17px] font-semibold">{left}</span>
      </div>
      <p className="text-[17px] text-ink-2">{finished ? "That's the time. Tap Done when you're ready." : "Keep going"}</p>
    </div>
  );
}
