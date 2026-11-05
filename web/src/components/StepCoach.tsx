"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useState } from "react";
import type { Run } from "@/lib/data/runs";
import { api, type Summary } from "@/lib/client/api";
import { useCameraChoice } from "@/lib/client/settings";
import {
  canListen,
  listen,
  speak,
  type VoiceCommand,
} from "@/lib/client/speech";
import { useCamera } from "@/lib/client/useCamera";
import { HELP_LEVELS, nextHelpLevel, type HelpLevel } from "@/lib/help";
import { Button } from "./Button";
import { Ring } from "./Ring";
import { StepPicture } from "./StepPicture";
import { StepTimer } from "./StepTimer";
import { TaskStart } from "./TaskStart";
import type { Scene } from "@/lib/ai/scene";
import dynamic from "next/dynamic";
import UprightOtter from "./otter/UprightOtter";
import {
  Check,
  Eye,
  Lightbulb,
  ListTree,
  MessageCircle,
  Mic,
  MicOff,
  Users,
  X,
} from "lucide-react";

/** How often the screen checks for presses on the otter's physical buttons. */
const BUTTON_POLL_MS = 1000;
/** How often Ayin looks when the student asks it to watch hands-free. */
const WATCH_EVERY_MS = 6000;

// three.js only runs in the browser, and only loads when a student asks to be shown.
const ShowMe3D = dynamic(() => import("./ShowMe3D").then((m) => m.ShowMe3D), {
  ssr: false,
});

/** How much help the student has asked for on the step in front of them. */
interface StepHelp {
  stepId: string;
  level: HelpLevel;
  pictureShown: boolean;
}

export function StepCoach({
  run,
  onStepsChanged,
}: {
  run: Run;
  onStepsChanged: () => void;
}) {
  const [doneIds, setDoneIds] = useState<string[]>(run.doneStepIds);
  const [help, setHelp] = useState<StepHelp | null>(null);
  const [say, setSay] = useState<string | null>(null);
  const [heard, setHeard] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [looking, setLooking] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [listening, setListening] = useState(false);
  // Hands-free: Ayin checks the step every few seconds until it's done. The student turns it on.
  const [watching, setWatching] = useState(false);
  // The step Ayin couldn't see being done, so the student can say "I did it".
  const [notSeen, setNotSeen] = useState<string | null>(null);
  // null: the pause before starting. "steps": one step at a time. "alone": checked only at the end.
  const [mode, setMode] = useState<"steps" | "alone" | null>(
    run.doneStepIds.length > 0 ? "steps" : null,
  );
  const [scene, setScene] = useState<{
    stepId: string;
    scene: Scene | null;
  } | null>(null);
  const [flat, setFlat] = useState(false);
  const [cameraChoice] = useCameraChoice();
  const useBrowserEyes = cameraChoice !== "otter";
  const {
    videoRef,
    capture,
    error: cameraError,
    sharing,
    shareScreen,
  } = useCamera(
    useBrowserEyes && !summary,
    cameraChoice === "screen" ? "screen" : "camera",
  );

  const index = run.steps.findIndex((s) => !doneIds.includes(s.id));
  const step = index === -1 ? null : run.steps[index];
  const nextStep = index === -1 ? null : run.steps[index + 1];

  // Help belongs to one step: a new step starts on its own, with the picture only if it hasn't faded.
  const current: StepHelp | null = !step
    ? null
    : help?.stepId === step.id
      ? help
      : {
          stepId: step.id,
          level: HELP_LEVELS.onMyOwn,
          pictureShown: step.showPictureFirst,
        };

  // The 3D model belongs to one step; moving on hides it.
  const stepScene = step && scene?.stepId === step.id ? scene : null;

  // A new step: read it aloud, and start drawing the next picture early.
  useEffect(() => {
    if (!step || mode !== "steps") return;
    speak(step.text);
    if (nextStep) new Image().src = `/api/steps/${nextStep.id}/picture`;
  }, [step, nextStep, mode]);

  /** One photo, only at the moment the student asks. Null means "let the server use the otter". */
  async function takePhoto(): Promise<string | null> {
    setLooking(true);
    const photo = capture();
    setTimeout(() => setLooking(false), 600);
    return photo;
  }

  /** The student asked something out loud. Ayin looks and answers like a coach beside them. */
  async function answer(question: string) {
    if (!step) return;
    setHeard(question);
    try {
      const showing = stepScene?.scene && !flat ? stepScene.scene.title : null;
      const result = await api.ask(
        run.id,
        step.id,
        question,
        await takePhoto(),
        showing,
      );
      tell(result.say);
    } catch (error) {
      tell((error as Error).message);
    }
  }

  function tell(text: string) {
    setSay(text);
    speak(text);
  }

  /**
   * "Done": Ayin looks and checks the step. When it's watching hands-free (`auto`), it stays
   * quiet until the step is done. `trust` takes the student's word when the camera can't see.
   */
  async function done({ auto = false, trust = false } = {}) {
    if (!step || !current || busy) return;
    setBusy(true);
    try {
      const result = await api.check(run.id, step.id, current.level, trust ? null : await takePhoto(), trust);
      if (result.done || !auto) tell(result.say);
      setNotSeen(result.done || auto ? null : step.id);
      if (result.done) setDoneIds((ids) => [...ids, step.id]);
      if (result.finished) {
        setSummary(result.summary);
        setWatching(false);
      }
    } catch (error) {
      if (!auto) {
        tell((error as Error).message);
        setNotSeen(step.id); // no camera, or it failed: the student can still say they did it
      }
    } finally {
      setBusy(false);
    }
  }

  /** Leave the pause screen. Voice turns on by itself, so the student's hands stay free. */
  function start(nextMode: "steps" | "alone") {
    setMode(nextMode);
    if (canListen()) setListening(true);
  }

  async function askForHelp(level: HelpLevel) {
    if (!step || !current || busy || level === HELP_LEVELS.onMyOwn) return;
    setBusy(true);
    setHelp({
      ...current,
      level,
      pictureShown: current.pictureShown || level === HELP_LEVELS.showMe,
    });
    try {
      if (level === HELP_LEVELS.showMe) {
        // "Show me" builds a 3D model of the step; the flat picture stays one tap away.
        setFlat(false);
        setScene({ stepId: step.id, scene: null });
        const result = await api.scene(step.id, await takePhoto());
        setScene({ stepId: step.id, scene: result.scene });
        tell(result.scene.say);
      } else {
        const result = await api.help(
          run.id,
          step.id,
          level,
          await takePhoto(),
        );
        tell(result.say);
      }
    } catch (error) {
      tell((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  /** The step feels too big: break it into smaller ones, then reload the steps. */
  async function makeSmaller() {
    if (!step || busy) return;
    setBusy(true);
    tell("Breaking it into smaller steps");
    try {
      await api.splitStep(step.id);
      onStepsChanged();
    } catch (error) {
      tell((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  /** "On my own": one photo of the finished task. */
  async function doneAlone() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await api.checkAlone(run.id, await takePhoto());
      tell(result.say);
      if (result.finished) setSummary(result.summary);
    } catch (error) {
      tell((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function askCrewmate() {
    if (!step) return;
    const { helperName } = await api.askCrewmate(run.studentId, step.id);
    tell(
      helperName
        ? `${helperName} has done this step on their own. We let them know you'd like help.`
        : "Nobody in your raft has done this step yet. A staff member can help.",
    );
  }

  // Voice, the on-screen buttons and the otter's buttons all end in the same three actions.
  const onQuestion = useEffectEvent((question: string) => {
    answer(question);
  });

  const onCommand = useEffectEvent((command: VoiceCommand | string) => {
    if (command === "done") done();
    if (command === "help" && current) askForHelp(nextHelpLevel(current.level));
    if (command === "show-me") askForHelp(HELP_LEVELS.showMe);
  });

  const onWatchTick = useEffectEvent(() => {
    done({ auto: true });
  });

  useEffect(() => {
    if (!watching || mode !== "steps") return;
    const timer = setInterval(onWatchTick, WATCH_EVERY_MS);
    return () => clearInterval(timer);
  }, [watching, mode]);

  useEffect(() => {
    if (!listening) return;
    return listen(onCommand, onQuestion);
  }, [listening]);

  useEffect(() => {
    let lastId = -1;
    const poll = async () => {
      const { presses } = await api
        .buttonPresses(Math.max(lastId, 0))
        .catch(() => ({ presses: [] }));
      if (presses.length === 0) return;
      // On the first poll, skip presses from before this screen opened.
      if (lastId !== -1) presses.forEach((press) => onCommand(press.button));
      lastId = presses[presses.length - 1].id;
    };
    poll();
    const timer = setInterval(poll, BUTTON_POLL_MS);
    return () => clearInterval(timer);
  }, []);

  // What Ayin looks through: the camera or shared screen preview, or a note about the otter.
  const eyes = useBrowserEyes ? (
    <div className="flex items-center gap-3 rounded-full bg-card py-1.5 pl-1.5 pr-4 text-[15px] text-ink-3">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="h-9 w-12 rounded-full bg-clay object-cover"
      />
      <span
        className={`h-2 w-2 rounded-full ${looking ? "bg-cel-deep" : "bg-clay-2"}`}
      />
      {cameraChoice === "screen" && !sharing ? (
        <button
          onClick={shareScreen}
          className="font-medium text-cel-deep underline-offset-4 hover:underline"
        >
          Share a screen with Ayin
        </button>
      ) : looking ? (
        "Looking now"
      ) : (
        (cameraError ?? "Looks only when you tap")
      )}
    </div>
  ) : (
    <p className="text-center text-[15px] text-ink-3">
      Using the otter&apos;s camera
    </p>
  );

  if (mode === null) return <TaskStart run={run} onStart={start} />;

  if (mode === "alone" && !summary) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center gap-6 px-5 py-8 text-center">
        <UprightOtter className="h-44 w-44" furHue={run.furHue} />
        <h1 className="font-display text-[38px] leading-[1.05]">
          {run.title}, on your own
        </h1>
        <p className="text-[18px] text-ink-2">
          Take your time. Tap Done when the whole task is finished.
        </p>
        {say && (
          <p
            className="rounded-2xl bg-cel-wash px-4 py-3 text-[17px] text-cel-deep"
            aria-live="polite"
          >
            {say}
          </p>
        )}
        <div className="mt-auto flex w-full flex-col gap-3">
          <Button
            look="main"
            className="h-16 text-[19px]"
            disabled={busy}
            onClick={doneAlone}
          >
            <Check size={22} /> {busy ? "Looking" : "Done"}
          </Button>
          <Button look="quiet" onClick={() => setMode("steps")}>
            I&apos;d like the steps
          </Button>
          {eyes}
        </div>
      </main>
    );
  }

  if (summary || !step || !current) {
    return (
      <Finished
        title={run.title}
        furHue={run.furHue}
        summary={summary ?? { total: run.steps.length, onOwn: 0 }}
      />
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-5 pb-6 pt-5">
      <header className="flex items-center justify-between gap-3">
        <Link
          href="/"
          aria-label="Stop this task"
          className="grid h-11 w-11 place-items-center rounded-full bg-card text-ink-2"
        >
          <X size={20} />
        </Link>
        <div className="flex flex-1 flex-col gap-2">
          <p className="text-center text-[15px] font-medium text-ink-3">
            {run.title}, step {index + 1} of {run.steps.length}
          </p>
          <ol
            className="flex gap-1"
            aria-label={`Step ${index + 1} of ${run.steps.length}`}
          >
            {run.steps.map((s, i) => (
              <li
                key={s.id}
                className={`h-1.5 flex-1 rounded-full ${i < index ? "bg-cel-deep" : i === index ? "bg-cel" : "bg-clay"}`}
              />
            ))}
          </ol>
        </div>
        {canListen() ? (
          <button
            onClick={() => setListening((on) => !on)}
            aria-pressed={listening}
            aria-label={listening ? "Stop listening" : "Talk to Ayin"}
            className={`grid h-11 w-11 place-items-center rounded-full ${listening ? "bg-ink text-card" : "bg-card text-ink-2"}`}
          >
            {listening ? <Mic size={20} /> : <MicOff size={20} />}
          </button>
        ) : (
          <span className="h-11 w-11" />
        )}
      </header>

      {stepScene && !flat ? (
        <div className="flex flex-col gap-2">
          {stepScene.scene ? (
            <ShowMe3D scene={stepScene.scene} />
          ) : (
            <div className="graph-paper flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border border-line">
              <UprightOtter className="h-40 w-40" furHue={run.furHue} />
              <p className="font-hand text-[22px] text-ink-2">
                Ayin is building it for you
              </p>
            </div>
          )}
          <Button
            look="quiet"
            className="self-center"
            onClick={() => setFlat(true)}
          >
            See the flat picture
          </Button>
        </div>
      ) : (
        <StepPicture
          stepId={step.id}
          alt={step.detail}
          shown={current.pictureShown}
          furHue={run.furHue}
        />
      )}

      <h1 className="font-display text-[38px] leading-[1.05]">{step.text}</h1>

      {step.seconds && <StepTimer key={step.id} seconds={step.seconds} />}

      {listening && (
        <p className="text-[15px] text-ink-3" aria-live="polite">
          {heard ? (
            <>You said: &ldquo;{heard}&rdquo;</>
          ) : (
            "Ayin is listening. Ask anything, or say done, help or show me."
          )}
        </p>
      )}

      {say && (
        <p
          className="flex items-start gap-3 rounded-2xl bg-cel-wash px-4 py-3 text-[17px] leading-snug text-cel-deep"
          aria-live="polite"
        >
          <MessageCircle size={20} className="mt-0.5 shrink-0" />
          {say}
        </p>
      )}

      {notSeen === step.id && (
        <Button className="self-start" disabled={busy} onClick={() => done({ trust: true })}>
          <Check size={18} /> I did it, next step
        </Button>
      )}

      {current.level >= HELP_LEVELS.nudge && (
        <Button
          look="quiet"
          className="self-start px-0"
          disabled={busy}
          onClick={makeSmaller}
        >
          <ListTree size={18} /> Too big? Smaller steps
        </Button>
      )}

      {current.level === HELP_LEVELS.showMe && (
        <Button look="quiet" className="self-start px-0" onClick={askCrewmate}>
          <Users size={18} /> Still stuck? Ask someone in your raft
        </Button>
      )}

      <div className="mt-auto flex flex-col gap-4">
        <div className="flex items-end justify-between gap-3">
          <RoundAction
            label="Help"
            disabled={busy}
            onClick={() => askForHelp(nextHelpLevel(current.level))}
          >
            <Lightbulb size={22} />
          </RoundAction>
          <Button
            look="main"
            className="h-16 flex-1 text-[19px]"
            disabled={busy}
            onClick={() => done()}
          >
            <Check size={22} /> {busy ? "Looking" : "Done"}
          </Button>
          <RoundAction
            label="Show me"
            disabled={busy}
            onClick={() => askForHelp(HELP_LEVELS.showMe)}
          >
            <Eye size={22} />
          </RoundAction>
        </div>

        <button
          onClick={() => setWatching((on) => !on)}
          aria-pressed={watching}
          className={`flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[15px] font-medium ${
            watching ? "bg-cel-wash text-cel-deep" : "border border-line text-ink-2"
          }`}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${watching ? "bg-cel-deep" : "bg-clay-2"}`} />
          {watching ? "Watching until each step is done · tap to stop" : "Hands busy? Ayin can watch for you"}
        </button>

        {eyes}
      </div>
    </main>
  );
}

/** A secondary action: a round button with its word underneath. */
function RoundAction({
  label,
  children,
  ...props
}: {
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="flex w-20 flex-col items-center gap-1 whitespace-nowrap text-[13px] font-medium text-ink-2 disabled:opacity-40"
      {...props}
    >
      <span className="grid h-14 w-14 place-items-center rounded-full bg-card">
        {children}
      </span>
      {label}
    </button>
  );
}

function Finished({
  title,
  furHue,
  summary,
}: {
  title: string;
  furHue: number;
  summary: Summary;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-6 px-5 text-center">
      <div className="relative grid place-items-center">
        <Ring
          fill={summary.total ? summary.onOwn / summary.total : 0}
          size={200}
          stroke={10}
          label="Steps on your own"
        />
        <UprightOtter className="absolute h-32 w-32" furHue={furHue} />
      </div>
      <h1 className="font-display text-[40px] leading-none">
        {summary.onOwn} of {summary.total} on your own
      </h1>
      <p className="text-[17px] text-ink-2">
        {title} is done. It counts toward your raft&apos;s week.
      </p>
      <div className="flex gap-3">
        <Link
          href="/"
          className="inline-flex min-h-12 items-center rounded-full bg-ink px-6 text-[17px] font-medium text-card"
        >
          Another task
        </Link>
        <Link
          href="/raft"
          className="inline-flex min-h-12 items-center rounded-full bg-clay px-6 text-[17px] font-medium"
        >
          See my raft
        </Link>
      </div>
    </main>
  );
}
