"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
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
import { Composer } from "./raft/Composer";
import { RaftIcon } from "./raft/Stickers";
import type { Scene, SceneSoFar } from "@/lib/ai/scene";
import type { ChatTurn } from "./AyinChat";
import dynamic from "next/dynamic";
import UprightOtter from "./otter/UprightOtter";
import { AyinSees } from "./AyinSees";
import { HandsFree } from "./HandsFree";
import { TogetherBar } from "./TogetherBar";
import {
  Check,
  Eye,
  Lightbulb,
  ListTree,
  MessageCircle,
  Users,
  X,
} from "lucide-react";

/** How often the screen checks for presses on the otter's physical buttons. */
const BUTTON_POLL_MS = 1000;
/** How often Ayin looks through the otter's camera while watching hands-free. */
const WATCH_EVERY_MS = 6000;

// three.js only runs in the browser, and only loads when a student asks to be shown.
const ShowMe3D = dynamic(() => import("./ShowMe3D").then((m) => m.ShowMe3D), {
  ssr: false,
});
const BuildingModel = dynamic(() => import("./ShowMe3D").then((m) => m.BuildingModel), {
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
  // Posting to the raft from inside a task: asking for help on a step, or sharing a finished task.
  const [composing, setComposing] = useState<"ask" | "win" | null>(null);
  // Hands-free: Ayin notices when a step is done, so the student doesn't have to tap. On by default.
  const [watching, setWatching] = useState(true);
  // The step Ayin couldn't see being done, so the student can say "I did it".
  const [notSeen, setNotSeen] = useState<string | null>(null);
  // null: the pause before starting. "steps": one step at a time. "alone": checked only at the end.
  const [mode, setMode] = useState<"steps" | "alone" | null>(
    run.doneStepIds.length > 0 ? "steps" : null,
  );
  // Each step's 3D model, built once and then reused. The flat picture is the fallback.
  const [scenes, setScenes] = useState<Record<string, Scene>>({});
  // Models being built right now, with the parts written so far, so the student sees them being built.
  const [building, setBuilding] = useState<Record<string, SceneSoFar>>({});
  const loading = useRef(new Map<string, Promise<Scene>>());
  // Small talk while Ayin builds a model the student asked to see.
  const [smallTalk, setSmallTalk] = useState<{ stepId: string; turns: ChatTurn[]; choices: string[] } | null>(null);
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
    // Ayin looks when the student moves and then holds still: usually a step just done.
    watching && mode === "steps" ? () => done({ auto: true }) : undefined,
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

  const stepScene = step ? scenes[step.id] : undefined;

  /** A step's 3D model, built once. Asking again while it's being built waits for the same build. */
  function loadScene(stepId: string, photo: string | null): Promise<Scene> {
    const already = loading.current.get(stepId);
    if (already) return already;
    const pending = api
      .scene(stepId, photo, (soFar) => setBuilding((all) => ({ ...all, [stepId]: soFar })))
      .then((r) => {
        setScenes((all) => ({ ...all, [stepId]: r.scene }));
        return r.scene;
      })
      .finally(() => {
        loading.current.delete(stepId);
        setBuilding((all) => Object.fromEntries(Object.entries(all).filter(([id]) => id !== stepId)));
      });
    loading.current.set(stepId, pending);
    return pending;
  }

  const getReady = useEffectEvent((ids: string[]) => {
    for (const id of ids) {
      new Image().src = `/api/steps/${id}/picture`;
      loadScene(id, null).catch(() => {}); // the flat picture stays up instead
    }
  });

  // A new step: read it aloud, and get this step's 3D model and the next one's ready.
  useEffect(() => {
    if (!step || mode !== "steps") return;
    speak(step.text);
    getReady([step.id, ...(nextStep ? [nextStep.id] : [])]);
  }, [step, nextStep, mode]);

  /**
   * Keep the student company while a model is being built: Claude makes light small talk, out
   * loud, and answers whatever the student says back until the model is ready.
   */
  async function keepCompany(stepId: string, stepText: string, said: string, before: ChatTurn[]) {
    const turns: ChatTurn[] = said ? [...before, { who: "student", text: said }] : before;
    if (said) setHeard(said);
    try {
      const reply = await api.talk(run.studentId, said, turns, `a 3D model of the step "${stepText}"`);
      if (!loading.current.has(stepId)) return; // the model is ready; that comes first now
      setSmallTalk({ stepId, turns: [...turns, { who: "ayin", text: reply.say }], choices: reply.choices });
      tell(reply.say);
    } catch {
      // Small talk is a nicety; the model still arrives without it.
    }
  }

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
      const showing = stepScene && !flat ? stepScene.title : null;
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
        // "Show me" brings up the 3D model of the step and talks the student through it. A model
        // that isn't ready yet is shown being built, and Ayin makes small talk until it is.
        setFlat(false);
        let shown = stepScene;
        if (!shown) {
          const pending = loadScene(step.id, await takePhoto());
          keepCompany(step.id, step.text, "", []);
          shown = await pending;
          setSmallTalk(null);
        }
        tell(shown.say);
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

  /** Still stuck: ask the raft's help board, with this step attached. */
  async function askRaft() {
    if (!step) return;
    setComposing("ask");
    const { helperName } = await api.helperFor(run.studentId, step.id);
    if (helperName) tell(`${helperName} has done this step on their own and can help.`);
  }

  // Voice, the on-screen buttons and the otter's buttons all end in the same three actions.
  const onQuestion = useEffectEvent((question: string) => {
    if (step && smallTalk?.stepId === step.id && loading.current.has(step.id)) {
      keepCompany(step.id, step.text, question, smallTalk.turns);
      return;
    }
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

  // The otter's camera can't be compared frame by frame here, so it simply looks every few seconds.
  useEffect(() => {
    if (!watching || mode !== "steps" || useBrowserEyes) return;
    const timer = setInterval(onWatchTick, WATCH_EVERY_MS);
    return () => clearInterval(timer);
  }, [watching, mode, useBrowserEyes]);

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

  // What Ayin sees, always on screen, so the student never has to trust a camera they can't see.
  const eyes = (
    <div className="flex items-center gap-3 rounded-2xl bg-card p-2 pr-3 text-[15px] text-ink-2">
      <AyinSees videoRef={videoRef} otter={!useBrowserEyes} looking={looking} className="h-20 w-28 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <span className="font-semibold text-ink">{looking ? "Ayin is looking" : "What Ayin sees"}</span>
        {cameraChoice === "screen" && !sharing ? (
          <button onClick={shareScreen} className="font-medium text-cel-deep underline-offset-4 hover:underline">
            Share a screen with Ayin
          </button>
        ) : cameraError ? (
          <span>{cameraError}</span>
        ) : (
          <span className="leading-snug">
            {mode === "steps" && watching
              ? useBrowserEyes
                ? "Looks when your hands stop"
                : "Looks every few seconds"
              : "Looks when you say or tap Done"}
          </span>
        )}
      </div>
    </div>
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

  const composer = composing && (
    <Composer
      authorId={run.studentId}
      startKind={composing}
      step={composing === "ask" && step ? { id: step.id, text: step.text } : null}
      onClose={() => setComposing(null)}
      onShared={() => {
        setComposing(null);
        tell(composing === "ask" ? "Asked your raft. Someone who knows this step can answer." : "Shared with your raft.");
      }}
    />
  );

  if (summary || !step || !current) {
    return (
      <>
        {composer}
        <Finished
          title={run.title}
          furHue={run.furHue}
          summary={summary ?? { total: run.steps.length, onOwn: 0 }}
          onShare={() => setComposing("win")}
        />
      </>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-5 pb-6 pt-5">
      {composer}
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
        <HandsFree
          on={listening || watching}
          onChange={(on) => {
            setListening(on && canListen());
            setWatching(on);
          }}
        />
      </header>

      <TogetherBar runId={run.id} />

      {current.pictureShown && !flat && (stepScene || building[step.id]) ? (
        <div className="flex h-[42dvh] flex-col gap-1">
          <div className="min-h-0 flex-1">
            {stepScene ? (
              <ShowMe3D key={step.id} scene={stepScene} fill />
            ) : (
              <BuildingModel key={step.id} soFar={building[step.id]} fill />
            )}
          </div>
          <Button look="quiet" className="self-center py-1" onClick={() => setFlat(true)}>
            See the flat picture
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <StepPicture stepId={step.id} alt={step.detail} shown={current.pictureShown} furHue={run.furHue} />
          {current.pictureShown && stepScene && (
            <Button look="quiet" className="self-center py-1" onClick={() => setFlat(false)}>
              See it in 3D
            </Button>
          )}
        </div>
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

      {smallTalk?.stepId === step.id && smallTalk.choices.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Answers">
          {smallTalk.choices.map((choice, i) => (
            <button
              key={choice}
              onClick={() => keepCompany(step.id, step.text, choice, smallTalk.turns)}
              className="chat__leaf"
              style={{ "--tone": `var(--r-${["study", "errands", "care"][i % 3]})`, "--i": i } as CSSProperties}
            >
              {choice}
            </button>
          ))}
        </div>
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
        <Button look="quiet" className="self-start px-0" onClick={askRaft}>
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
  onShare,
}: {
  title: string;
  furHue: number;
  summary: Summary;
  onShare: () => void;
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
      <Button look="main" className="h-14 w-full" onClick={onShare}>
        <RaftIcon name="win" /> Share this win with my raft
      </Button>
      <div className="flex gap-3">
        <Link
          href="/"
          className="inline-flex min-h-12 items-center rounded-full bg-clay px-6 text-[17px] font-medium"
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
