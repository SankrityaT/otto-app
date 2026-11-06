"use client";

import type { CSSProperties } from "react";
import { Play, Volume2 } from "lucide-react";

export type ChatTurn = { who: "student" | "ayin"; text: string };
/** Which of Otto's lines is being said out loud, and how far through it Otto is. */
export type Voice = { turn: number; char: number } | null;

/** The answer buttons take the pond's leaf colours in turn. */
const CHOICE_TONES = ["study", "errands", "care", "health"];

/**
 * Talking with Otto, right there in the pond: no chat window, no scrolling history. The otter
 * sits up above, and under it is only what matters now: what the student said, Otto's answer
 * with each word lighting up as it's said (reading and listening together), and a few ready
 * answers floating like leaves. Starting a task is always the student's tap.
 */
export function OttoChat({
  turns,
  thinking,
  voice,
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
  choices: string[];
  task: string | null;
  onChoose: (text: string) => void;
  onStartTask: () => void;
  onHear: (turn: number) => void;
  onClose: () => void;
}) {
  const lastAyin = turns.findLastIndex((t) => t.who === "ayin");
  const lastYou = turns.findLast((t) => t.who === "student");

  return (
    <section className="mt-[min(80px,16vw)] flex w-full max-w-[560px] flex-col items-center gap-4 px-2 text-center" aria-label="Talking with Otto" aria-live="polite">
      {lastYou && <p className="text-[16px] text-ink-3">You: {lastYou.text}</p>}

      {thinking ? (
        <p className="chat__dots text-[34px] leading-none text-ink-3" aria-label="Otto is thinking">
          <span>•</span> <span>•</span> <span>•</span>
        </p>
      ) : (
        lastAyin !== -1 && (
          <div key={lastAyin} className="chat__bubble flex flex-col items-center gap-2">
            <p className="max-w-[26ch] text-balance text-[clamp(22px,4.6vw,28px)] font-medium leading-snug text-ink">
              <Words text={turns[lastAyin].text} at={voice?.turn === lastAyin ? voice.char : null} />
            </p>
            <button onClick={() => onHear(lastAyin)} className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[15px] text-ink-3 hover:bg-clay">
              <Volume2 size={18} /> Hear it again
            </button>
          </div>
        )
      )}

      {!thinking && (task || choices.length > 0) && (
        <div className="flex flex-wrap justify-center gap-2.5">
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

      <button onClick={onClose} className="btn btn--text py-1 text-[15px]">
        Back to my pond
      </button>
    </section>
  );
}

/** Otto's words, with the one being said right now lit up. */
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
