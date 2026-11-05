"use client";

import { useEffect, useState, type FormEvent } from "react";
import { OtterInPond } from "./OtterWaits";
import FurSlider from "./pond/FurSlider";
import UprightOtter from "./otter/UprightOtter";
import type { Student } from "@/lib/data/crew";
import { api } from "@/lib/client/api";
import { hush, speak } from "@/lib/client/speech";
import { NAME_HINT, safeName } from "@/lib/names";

type Step = "name" | "otter" | "raft" | "returning";

/**
 * The first time on a device, one question at a time: Ayin asks your first name, you pick your
 * otter's colour, and you join your raft with the code from your teacher. A returning student
 * types their raft's code and taps their own otter. Nobody sees anyone's name without that code.
 */
export function Welcome({ onReady }: { onReady: (student: Student) => void }) {
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [furHue, setFurHue] = useState(0);
  const [code, setCode] = useState("");
  const [raft, setRaft] = useState<Student[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [talking, setTalking] = useState<number | null>(null);

  const says: Record<Step, string> = {
    name: "Hi, I'm Ayin! What's your first name?",
    otter: `Nice to meet you, ${name.trim()}! Pick your otter's colour.`,
    raft: "Last thing: join your raft.",
    returning: raft ? "Tap your otter." : "Welcome back! What's your raft's code?",
  };
  const line = says[step];

  // Ayin says each question out loud, and its otter talks along.
  useEffect(() => {
    speak(line, { onWord: (char) => setTalking(char), onEnd: () => setTalking(null) });
    return () => hush();
  }, [line]);

  function go(next: Step) {
    setError(null);
    setStep(next);
  }

  async function attempt(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const create = (raftCode: string) => attempt(async () => onReady((await api.addStudent(name, furHue, raftCode)).student));
  const findRaft = () => attempt(async () => setRaft((await api.raftByCode(code)).members));

  function submit(event: FormEvent) {
    event.preventDefault();
    if (step === "name") {
      if (safeName(name)) go("otter");
      else setError(NAME_HINT);
    }
    else if (step === "otter") go("raft");
    else if (step === "raft" && code.trim()) create(code);
    else if (step === "returning" && code.trim()) findRaft();
  }

  const field = "w-full rounded-2xl border-[1.5px] border-line bg-card px-4 py-3 text-center text-[20px] outline-none focus:border-ink";

  return (
    <div className="app">
      <main className="page flex min-h-svh w-full max-w-md flex-col items-center justify-center gap-5 py-10 text-center">
        <span className="says bubble-pop" key={line} aria-live="polite">
          {line}
        </span>
        <OtterInPond furHue={furHue} mood={talking !== null ? "talking" : "idle"} beat={talking ?? 0} />

        <form onSubmit={submit} className="flex w-full flex-col items-center gap-3">
          {step === "name" && (
            <>
              <label htmlFor="name" className="sr-only">
                Your first name
              </label>
              <input
                id="name"
                className={field}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="First name"
                autoComplete="given-name"
                maxLength={24}
                autoFocus
              />
              <button className="btn btn--primary w-full" disabled={!name.trim()}>
                Next
              </button>
              <button type="button" className="btn btn--text" onClick={() => go("returning")}>
                I&apos;ve used Ayin before
              </button>
            </>
          )}

          {step === "otter" && (
            <>
              <FurSlider value={furHue} onChange={setFurHue} />
              <button className="btn btn--primary w-full">That&apos;s my otter</button>
              <button type="button" className="btn btn--text" onClick={() => go("name")}>
                Back
              </button>
            </>
          )}

          {(step === "raft" || (step === "returning" && !raft)) && (
            <>
              <p className="text-ink-2">A raft is a few classmates from your work site. Your teacher has its code.</p>
              <label htmlFor="code" className="sr-only">
                Raft code
              </label>
              <input
                id="code"
                className={`${field} uppercase tracking-[0.2em]`}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Raft code"
                autoComplete="off"
                autoCapitalize="characters"
                maxLength={12}
                autoFocus
              />
              <button className="btn btn--primary w-full" disabled={busy || !code.trim()}>
                {step === "raft" ? "Join my raft" : "Find my raft"}
              </button>
              {step === "raft" ? (
                <button type="button" className="btn btn--text" disabled={busy} onClick={() => create("")}>
                  Not now
                </button>
              ) : (
                <button type="button" className="btn btn--text" onClick={() => go("name")}>
                  I&apos;m new
                </button>
              )}
            </>
          )}

          {step === "returning" && raft && (
            <>
              <ul className="grid w-full grid-cols-2 gap-3">
                {raft.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => onReady(s)}
                      className="flex w-full flex-col items-center rounded-[var(--radius-card)] border border-line bg-card px-3 pb-3 pt-1"
                    >
                      <UprightOtter className="h-20 w-20" furHue={s.furHue} active={false} />
                      <span className="text-[17px] font-semibold">{s.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" className="btn btn--text" onClick={() => setRaft(null)}>
                Back
              </button>
            </>
          )}

          {error && <p className="text-ink-2">{error}</p>}
        </form>
      </main>
    </div>
  );
}
