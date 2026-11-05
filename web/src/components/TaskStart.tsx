"use client";

import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { Scene, SceneSoFar } from "@/lib/ai/scene";
import type { Run } from "@/lib/data/runs";
import { api } from "@/lib/client/api";
import { useCameraChoice } from "@/lib/client/settings";
import { canListen, hush, listen, speak, type VoiceCommand } from "@/lib/client/speech";
import { useCamera } from "@/lib/client/useCamera";
import { STAGES } from "@/lib/stages";
import { AyinSees } from "./AyinSees";
import { Button } from "./Button";
import { HandsFree } from "./HandsFree";
import UprightOtter from "./otter/UprightOtter";

/** The pause after Ayin finishes a step before the walkthrough moves on by itself. */
const STEP_PAUSE_MS = 2500;
/** About how long Ayin takes to say one word. */
const MS_PER_WORD = 450;

// three.js only runs in the browser, so the 3D view loads on its own.
const ShowMe3D = dynamic(() => import("./ShowMe3D").then((m) => m.ShowMe3D), { ssr: false });
const BuildingModel = dynamic(() => import("./ShowMe3D").then((m) => m.BuildingModel), { ssr: false });

/**
 * A pause before the task starts, like the doorway nooks at First Place: a moment to get
 * ready, never a rush. It shows where the student is on the five-stage path. At the "Watch"
 * stage, Ayin walks through the steps in 3D and talks them through. Everything fits on one
 * screen: no scrolling.
 */
export function TaskStart({ run, onStart }: { run: Run; onStart: (mode: "steps" | "alone") => void }) {
  const [watching, setWatching] = useState(run.stage === 1);
  const stage = STAGES[run.stage - 1];

  return (
    <main className="mx-auto flex h-dvh w-full max-w-md flex-col gap-4 px-5 py-5">
      <header className="flex items-center gap-3">
        <UprightOtter className="h-16 w-16 shrink-0" furHue={run.furHue} />
        <div className="min-w-0">
          <h1 className="font-display text-[30px] leading-[1.05]">{run.title}</h1>
          <p className="text-[15px] text-ink-2">
            {run.steps.length} steps · {stage.name}
          </p>
        </div>
      </header>

      <ol className="flex items-start justify-between" aria-label={`Stage ${run.stage} of 5: ${stage.name}`}>
        {STAGES.map((s, i) => {
          const n = i + 1;
          return (
            <li key={s.name} className="flex w-1/5 flex-col items-center gap-1 text-center">
              <span
                className={`h-3.5 w-3.5 rounded-full border-2 ${
                  n < run.stage ? "border-cel-deep bg-cel-deep" : n === run.stage ? "border-cel-deep bg-cel" : "border-clay-2"
                }`}
              />
              <span className={`text-[12px] leading-tight ${n === run.stage ? "font-semibold text-ink" : "text-ink-3"}`}>{s.name}</span>
            </li>
          );
        })}
      </ol>

      <div className="flex min-h-0 flex-1 flex-col">
        {watching ? (
          <StepStory run={run} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-[var(--radius-card)] bg-cel-wash p-6 text-center">
            <UprightOtter className="h-36 w-36" furHue={run.furHue} />
            <p className="text-[19px] text-cel-deep">{stage.says}</p>
            <button onClick={() => setWatching(true)} className="btn btn--text">
              Watch every step first
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {run.stage === 5 ? (
          <div className="flex gap-3">
            <Button look="main" className="h-14 flex-1" onClick={() => onStart("alone")}>
              Do it on my own
            </Button>
            <Button className="h-14 flex-1" onClick={() => onStart("steps")}>
              Show me the steps
            </Button>
          </div>
        ) : (
          <Button look="main" className="h-14" onClick={() => onStart("steps")}>
            {run.stage === 1 ? "I'm ready to try" : "Start"}
          </Button>
        )}
        <a href={`/print/${run.routineId}`} className="btn btn--text self-center py-1 text-[15px]">
          Print a paper step card
        </a>
      </div>
    </main>
  );
}

/**
 * The steps as a short story with Ayin as the coach: each step is a 3D model the student can
 * turn, read aloud, moving on a moment after Ayin finishes. The student can talk back at any
 * point: "next", "back", "help", or any question about what they're looking at. Turning the
 * model, asking something or tapping the arrows hands control to the student.
 */
function StepStory({ run }: { run: Run }) {
  const [index, setIndex] = useState(0);
  const [spoken, setSpoken] = useState(-1);
  const [playing, setPlaying] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [listening, setListening] = useState(canListen);
  const [scenes, setScenes] = useState<Record<string, Scene>>({});
  // Models still being built, with the parts written so far.
  const [building, setBuilding] = useState<Record<string, SceneSoFar>>({});
  const [heard, setHeard] = useState<string | null>(null);
  const [say, setSay] = useState<string | null>(null);
  // Ayin's eyes while watching too, so a question about what the student is holding gets a real look.
  const [cameraChoice] = useCameraChoice();
  const { videoRef, capture } = useCamera(cameraChoice === "this-device");
  const [looking, setLooking] = useState(false);
  const step = run.steps[index];
  const scene = scenes[step.id];
  const last = run.steps.length - 1;

  // Get each step's picture and 3D model ready one at a time, starting from the step on screen,
  // so the one being watched comes first and the app never waits on a dozen at once.
  // Each is saved, so this is only slow the first time.
  const started = useRef(new Set<string>());
  useEffect(() => {
    let moved = false;
    (async () => {
      for (const s of [...run.steps.slice(index), ...run.steps.slice(0, index)]) {
        if (moved) return;
        if (started.current.has(s.id)) continue;
        started.current.add(s.id);
        new Image().src = `/api/steps/${s.id}/picture`;
        await api
          .scene(s.id, null, (soFar) => setBuilding((all) => ({ ...all, [s.id]: soFar })))
          .then((r) => setScenes((all) => ({ ...all, [s.id]: r.scene })))
          .catch(() => {}) // the picture stays up instead
          .finally(() => setBuilding((all) => Object.fromEntries(Object.entries(all).filter(([id]) => id !== s.id))));
      }
    })();
    return () => {
      moved = true;
    };
  }, [index, run.steps]);

  const narration = useEffectEvent(() => [`Step ${index + 1}. ${step.text}.`, scenes[step.id]?.say].filter(Boolean).join(" "));

  // A new step: Ayin reads it out, plus what to look for on the model if it's ready.
  useEffect(() => {
    let gone = false;
    const text = narration();
    speak(text, { onEnd: () => !gone && setSpoken(index) });
    // Some browsers never say when speech ends, so don't wait on it forever.
    const fallback = setTimeout(() => setSpoken(index), text.split(/\s+/).length * MS_PER_WORD + STEP_PAUSE_MS);
    return () => {
      gone = true;
      clearTimeout(fallback);
    };
  }, [index]);

  // Once Ayin has finished a step, move on after a short pause, unless the student took over,
  // or this step's model is still being built (it's worth watching it come together).
  const stillBuilding = Boolean(building[step.id]);
  useEffect(() => {
    if (!playing || spoken !== index || index === last || stillBuilding) return;
    const next = setTimeout(() => setIndex(index + 1), STEP_PAUSE_MS);
    return () => clearTimeout(next);
  }, [playing, spoken, index, last, stillBuilding]);

  function go(to: number) {
    setPlaying(false);
    setSay(null);
    setIndex(Math.max(0, Math.min(last, to)));
  }

  function tell(text: string) {
    setSay(text);
    speak(text);
  }

  const onCommand = useEffectEvent((command: VoiceCommand) => {
    if (command === "done") go(index + 1);
    if (command === "back") go(index - 1);
    if (command === "help" || command === "show-me") {
      setPlaying(false);
      tell(step.detail);
    }
  });

  const onQuestion = useEffectEvent(async (question: string) => {
    setPlaying(false);
    setHeard(question);
    setSay("…");
    setLooking(true);
    const photo = capture();
    setTimeout(() => setLooking(false), 600);
    try {
      tell((await api.ask(run.id, step.id, question, photo, scene?.title ?? null)).say);
    } catch (error) {
      tell((error as Error).message);
    }
  });

  useEffect(() => {
    if (!listening) return;
    return listen(onCommand, onQuestion);
  }, [listening]);

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-2" aria-label="Every step">
      <div className="flex items-center gap-2">
        <ol className="flex flex-1 gap-1" aria-hidden>
          {run.steps.map((s, i) => (
            <li key={s.id} className={`h-1.5 flex-1 rounded-full ${i <= index ? "bg-cel-deep" : "bg-clay-2"}`} />
          ))}
        </ol>
        <button
          onClick={() => (playing ? (hush(), setPlaying(false)) : (setSpoken(index), setPlaying(true)))}
          aria-label={playing ? "Pause" : "Play"}
          className="grid h-10 w-10 place-items-center rounded-full bg-card text-ink-2"
        >
          {playing ? <Pause size={18} /> : <Play size={18} />}
        </button>
        {canListen() && <HandsFree on={listening} onChange={setListening} />}
      </div>

      <div className="relative min-h-0 flex-1">
        {scene ? (
          <ShowMe3D key={step.id} scene={scene} fill onGrab={() => setPlaying(false)} />
        ) : building[step.id] ? (
          <BuildingModel key={step.id} soFar={building[step.id]} fill />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border border-line bg-[#fbf8f2] p-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- the SVG drawn for this step */}
            <img key={step.id} src={`/api/steps/${step.id}/picture`} alt={step.detail} className="min-h-0 max-w-full flex-1 object-contain" />
          </div>
        )}
        {cameraChoice !== "screen" && (
          <figure className="absolute bottom-2 right-2 flex flex-col items-center gap-0.5">
            <AyinSees videoRef={videoRef} otter={cameraChoice === "otter"} looking={looking} className="h-16 w-24" />
            <figcaption className="rounded-full bg-card/90 px-2 text-[12px] text-ink-2">What Ayin sees</figcaption>
          </figure>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous step" className="grid h-11 w-9 place-items-center text-ink-3 disabled:opacity-0">
          <ChevronLeft size={28} />
        </button>
        <p className="flex-1 text-center text-[21px] font-semibold leading-snug" aria-live="polite">
          <span className="text-ink-3">{index + 1}. </span>
          {step.text}
        </p>
        <button onClick={() => go(index + 1)} disabled={index === last} aria-label="Next step" className="grid h-11 w-9 place-items-center text-ink-3 disabled:opacity-0">
          <ChevronRight size={28} />
        </button>
      </div>

      {say ? (
        <p className="rounded-[var(--radius-card)] bg-cel-wash px-4 py-2 text-[16px] text-cel-deep" aria-live="polite">
          {heard && <span className="block text-[13px] text-ink-3">You: {heard}</span>}
          {say}
        </p>
      ) : (
        listening && <p className="text-center text-[14px] text-ink-3">Hands-free: say &ldquo;next&rdquo;, &ldquo;back&rdquo;, or ask Ayin anything</p>
      )}
    </section>
  );
}
