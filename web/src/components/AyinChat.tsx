"use client";

import type { CSSProperties } from "react";
import { Play, Volume2, X } from "lucide-react";
import { useEffect, useRef } from "react";
import UprightOtter from "./otter/UprightOtter";

export type ChatTurn = { who: "student" | "ayin"; text: string };
/** Which of Ayin's lines is being said out loud, and how far through it Ayin is. */
export type Voice = { turn: number; char: number } | null;

/** The answer buttons take the pond's leaf colours in turn. */
const CHOICE_TONES = ["study", "errands", "care", "health"];

/**
 * Talking with Ayin. Playful, but calm and predictable: the otter sits in its own little pond
 * and bobs while it talks, each word lights up as Ayin says it (so reading and listening go
 * together), every line can be heard again, and ready answers float like leaves so the
 * student never has to think up what to type. Starting a task is always the student's tap.
 */
export function AyinChat({
  turns,
  thinking,
  voice,
  furHue,
  choices,
  task,
  onChoose,
  onStartTask,
  onHear,
  onClose,
}: {
  turns: ChatTurn[];
  thinking: boolean;
  voice: Voice;
  furHue: number;
  choices: string[];
  task: string | null;
  onChoose: (text: string) => void;
  onStartTask: () => void;
  onHear: (turn: number) => void;
  onClose: () => void;
}) {
  const end = useRef<HTMLDivElement>(null);
  const talking = voice !== null;

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [turns, thinking]);

  return (
    <section className="flex h-[min(60dvh,580px)] w-full max-w-[560px] flex-col overflow-hidden rounded-[28px] border border-line bg-card" aria-label="Talking with Ayin">
      <header className="flex items-center gap-4 px-4 pb-2 pt-4">
        <div className={`chat__pond ${talking ? "is-talking" : ""}`}>
          <UprightOtter className="chat__otter h-16 w-16" furHue={furHue} active={talking || thinking} />
        </div>
        <div className="flex-1">
          <p className="font-display text-[30px] leading-none text-ink">Ayin</p>
          <p className="mt-1 text-[15px] text-ink-3">{thinking ? "Thinking…" : talking ? "Talking to you" : "Your turn"}</p>
        </div>
        <button onClick={onClose} aria-label="Close the chat" className="grid h-11 w-11 place-items-center rounded-full text-ink-3 hover:bg-clay">
          <X size={22} />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3" aria-live="polite">
        {turns.map((turn, i) =>
          turn.who === "student" ? (
            <p key={i} className="chat__bubble max-w-[80%] self-end rounded-[22px] rounded-br-md bg-cel-wash px-4 py-2.5 text-[18px] text-cel-deep">
              {turn.text}
            </p>
          ) : (
            <div key={i} className="chat__bubble flex max-w-[90%] items-end gap-1.5 self-start">
              <p className="rounded-[22px] rounded-bl-md bg-clay px-4 py-3 text-[19px] leading-snug text-ink">
                <Words text={turn.text} at={voice?.turn === i ? voice.char : null} />
              </p>
              <button onClick={() => onHear(i)} aria-label="Hear it again" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-clay">
                <Volume2 size={20} />
              </button>
            </div>
          ),
        )}
        {thinking && (
          <p className="chat__bubble chat__dots self-start rounded-[22px] rounded-bl-md bg-clay px-5 py-3 text-[22px] leading-none text-ink-3" aria-label="Ayin is thinking">
            <span>•</span> <span>•</span> <span>•</span>
          </p>
        )}
        <div ref={end} />
      </div>

      {!thinking && (task || choices.length > 0) && (
        <div className="flex flex-wrap items-center gap-2.5 px-4 pb-4 pt-2">
          {task && (
            <button onClick={onStartTask} className="chat__leaf flex items-center gap-2" style={{ "--tone": "var(--r-home)", "--i": 0 } as CSSProperties}>
              <Play size={18} fill="currentColor" /> Start: {task}
            </button>
          )}
          {choices.map((choice, i) => (
            <button
              key={choice}
              onClick={() => onChoose(choice)}
              className="chat__leaf"
              style={{ "--tone": `var(--r-${CHOICE_TONES[i % CHOICE_TONES.length]})`, "--i": i + 1 } as CSSProperties}
            >
              {choice}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

/** Ayin's words, with the one being said right now lit up. */
function Words({ text, at }: { text: string; at: number | null }) {
  return [...text.matchAll(/\S+/g)].map((match) => {
    const start = match.index;
    const now = at !== null && at >= start && at < start + match[0].length + 1;
    return (
      <span key={start}>
        <span className={`chat__word ${now ? "is-now" : ""}`}>{match[0]}</span>{" "}
      </span>
    );
  });
}
