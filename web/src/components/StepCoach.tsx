"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useState } from "react";
import type { Run } from "@/lib/data/runs";
import { api, type Summary } from "@/lib/client/api";
import { useCameraChoice } from "@/lib/client/settings";
import { canListen, listen, speak, type VoiceCommand } from "@/lib/client/speech";
import { useCamera } from "@/lib/client/useCamera";
import { HELP_LEVELS, nextHelpLevel, type HelpLevel } from "@/lib/help";
import { Button } from "./Button";
import { Ring } from "./Ring";
import { StepPicture } from "./StepPicture";
import UprightOtter from "./otter/UprightOtter";
import { Check, Eye, Lightbulb, MessageCircle, Mic, MicOff, Users, X } from "lucide-react";

/** How often the screen checks for presses on the otter's physical buttons. */
const BUTTON_POLL_MS = 1000;

/** How much help the student has asked for on the step in front of them. */
interface StepHelp {
  stepId: string;
  level: HelpLevel;
  pictureShown: boolean;
}

export function StepCoach({ run }: { run: Run }) {
  const [doneIds, setDoneIds] = useState<string[]>(run.doneStepIds);
  const [help, setHelp] = useState<StepHelp | null>(null);
  const [say, setSay] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [looking, setLooking] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [listening, setListening] = useState(false);
  const [cameraChoice] = useCameraChoice();
  const useDeviceCamera = cameraChoice === "this-device";
  const { videoRef, capture, error: cameraError } = useCamera(useDeviceCamera && !summary);

  const index = run.steps.findIndex((s) => !doneIds.includes(s.id));
  const step = index === -1 ? null : run.steps[index];
  const nextStep = index === -1 ? null : run.steps[index + 1];

  // Help belongs to one step: a new step starts on its own, with the picture only if it hasn't faded.
  const current: StepHelp | null = !step
    ? null
    : help?.stepId === step.id
      ? help
      : { stepId: step.id, level: HELP_LEVELS.onMyOwn, pictureShown: step.showPictureFirst };

  // A new step: read it aloud, and start drawing the next picture early.
  useEffect(() => {
    if (!step) return;
    speak(step.text);
    if (nextStep) new Image().src = `/api/steps/${nextStep.id}/picture`;
  }, [step, nextStep]);

  /** One photo, only at the moment the student asks. Null means "let the server use the otter". */
  async function takePhoto(): Promise<string | null> {
    setLooking(true);
    const photo = capture();
    setTimeout(() => setLooking(false), 600);
    return photo;
  }

  function tell(text: string) {
    setSay(text);
    speak(text);
  }

  async function done() {
    if (!step || !current || busy) return;
    setBusy(true);
    try {
      const result = await api.check(run.id, step.id, current.level, await takePhoto());
      tell(result.say);
      if (result.done) setDoneIds((ids) => [...ids, step.id]);
      if (result.finished) setSummary(result.summary);
    } catch (error) {
      tell((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function askForHelp(level: HelpLevel) {
    if (!step || !current || busy || level === HELP_LEVELS.onMyOwn) return;
    setBusy(true);
    setHelp({ ...current, level, pictureShown: current.pictureShown || level === HELP_LEVELS.showMe });
    try {
      const result = await api.help(run.id, step.id, level, await takePhoto());
      tell(result.say);
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
        : "Nobody in your crew has done this step yet. A staff member can help.",
    );
  }

  // Voice, the on-screen buttons and the otter's buttons all end in the same three actions.
  const onCommand = useEffectEvent((command: VoiceCommand | string) => {
    if (command === "done") done();
    if (command === "help" && current) askForHelp(nextHelpLevel(current.level));
    if (command === "show-me") askForHelp(HELP_LEVELS.showMe);
  });

  useEffect(() => {
    if (!listening) return;
    return listen(onCommand);
  }, [listening]);

  useEffect(() => {
    let lastId = -1;
    const poll = async () => {
      const { presses } = await api.buttonPresses(Math.max(lastId, 0)).catch(() => ({ presses: [] }));
      if (presses.length === 0) return;
      // On the first poll, skip presses from before this screen opened.
      if (lastId !== -1) presses.forEach((press) => onCommand(press.button));
      lastId = presses[presses.length - 1].id;
    };
    poll();
    const timer = setInterval(poll, BUTTON_POLL_MS);
    return () => clearInterval(timer);
  }, []);

  if (summary || !step || !current) {
    return <Finished title={run.title} summary={summary ?? { total: run.steps.length, onOwn: 0 }} />;
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-5 pb-6 pt-5">
      <header className="flex items-center justify-between gap-3">
        <Link href="/" aria-label="Stop this task" className="grid h-11 w-11 place-items-center rounded-full bg-card text-ink-2">
          <X size={20} />
        </Link>
        <div className="flex flex-1 flex-col gap-2">
          <p className="text-center text-[15px] font-medium text-ink-3">
            {run.title}, step {index + 1} of {run.steps.length}
          </p>
          <ol className="flex gap-1" aria-label={`Step ${index + 1} of ${run.steps.length}`}>
            {run.steps.map((s, i) => (
              <li key={s.id} className={`h-1.5 flex-1 rounded-full ${i < index ? "bg-cel-deep" : i === index ? "bg-cel" : "bg-clay"}`} />
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

      <StepPicture stepId={step.id} alt={step.detail} shown={current.pictureShown} />

      <h1 className="font-display text-[34px] leading-[1.08]">{step.text}</h1>

      {say && (
        <p className="flex items-start gap-3 rounded-2xl bg-cel-wash px-4 py-3 text-[17px] leading-snug text-cel-deep" aria-live="polite">
          <MessageCircle size={20} className="mt-0.5 shrink-0" />
          {say}
        </p>
      )}

      {current.level === HELP_LEVELS.showMe && (
        <Button look="quiet" className="self-start px-0" onClick={askCrewmate}>
          <Users size={18} /> Still stuck? Ask a crewmate
        </Button>
      )}

      <div className="mt-auto flex flex-col gap-4">
        <div className="flex items-end justify-between gap-3">
          <RoundAction label="Help" disabled={busy} onClick={() => askForHelp(nextHelpLevel(current.level))}>
            <Lightbulb size={22} />
          </RoundAction>
          <Button look="main" className="h-16 flex-1 text-[19px]" disabled={busy} onClick={done}>
            <Check size={22} /> {busy ? "Looking" : "Done"}
          </Button>
          <RoundAction label="Show me" disabled={busy} onClick={() => askForHelp(HELP_LEVELS.showMe)}>
            <Eye size={22} />
          </RoundAction>
        </div>

        {useDeviceCamera ? (
          <div className="flex items-center gap-3 rounded-full bg-card py-1.5 pl-1.5 pr-4 text-[15px] text-ink-3">
            <video ref={videoRef} autoPlay playsInline muted className="h-9 w-12 rounded-full bg-clay object-cover" />
            <span className={`h-2 w-2 rounded-full ${looking ? "bg-cel-deep" : "bg-clay-2"}`} />
            {looking ? "Looking now" : (cameraError ?? "Looks only when you tap")}
          </div>
        ) : (
          <p className="text-center text-[15px] text-ink-3">Using the otter&apos;s camera</p>
        )}
      </div>
    </main>
  );
}

/** A secondary action: a round button with its word underneath. */
function RoundAction({ label, children, ...props }: { label: string; children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button className="flex w-16 flex-col items-center gap-1 text-[13px] font-medium text-ink-2 disabled:opacity-40" {...props}>
      <span className="grid h-14 w-14 place-items-center rounded-full bg-card">{children}</span>
      {label}
    </button>
  );
}

function Finished({ title, summary }: { title: string; summary: Summary }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-6 px-5 text-center">
      <div className="relative grid place-items-center">
        <Ring fill={summary.total ? summary.onOwn / summary.total : 0} size={200} stroke={10} label="Steps on your own" />
        <UprightOtter className="absolute h-32 w-32" />
      </div>
      <h1 className="font-display text-[40px] leading-none">
        {summary.onOwn} of {summary.total} on your own
      </h1>
      <p className="text-[17px] text-ink-2">{title} is done. It counts toward your crew&apos;s week.</p>
      <div className="flex gap-3">
        <Link href="/" className="inline-flex min-h-12 items-center rounded-full bg-ink px-6 text-[17px] font-medium text-card">
          Another task
        </Link>
        <Link href="/crew" className="inline-flex min-h-12 items-center rounded-full bg-clay px-6 text-[17px] font-medium">
          See my crew
        </Link>
      </div>
    </main>
  );
}
