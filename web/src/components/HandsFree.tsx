"use client";

import { Mic, MicOff } from "lucide-react";

/**
 * One switch for working with busy hands: Ayin listens for "next", "done", "help" or any
 * question, and on the steps it also looks when the student's hands stop.
 */
export function HandsFree({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      aria-pressed={on}
      className={`flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold ${on ? "bg-ink text-card" : "bg-card text-ink-2"}`}
    >
      {on ? <Mic size={16} /> : <MicOff size={16} />}
      Hands-free
    </button>
  );
}
