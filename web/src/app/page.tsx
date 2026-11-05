"use client";

import { Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { StudentPicker } from "@/components/StudentPicker";
import Fold from "@/components/pond/Fold";
import Pond, { type PondStatus } from "@/components/pond/Pond";
import { LEAF_TONES, type LeafItem } from "@/components/pond/PondLeaves";
import TalkBar from "@/components/pond/TalkBar";
import type { Student } from "@/lib/data/crew";
import { api } from "@/lib/client/api";
import { useStudentId } from "@/lib/client/settings";

type Routine = { id: string; title: string; stepCount: number };
type Done = { runId: string; title: string; onOwn: number; total: number };
type Started = { runId: string; title: string; done: number; total: number };

/** Each task keeps the same leaf colour every time, picked from its id. */
function toneFor(id: string): LeafItem["tone"] {
  const sum = [...id].reduce((total, char) => total + char.charCodeAt(0), 0);
  return LEAF_TONES[sum % LEAF_TONES.length];
}

function readPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("That photo couldn't be read. Try taking it again."));
    reader.readAsDataURL(file);
  });
}

export default function Today() {
  const router = useRouter();
  const [studentId, setStudentId] = useStudentId();
  const [students, setStudents] = useState<Student[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [done, setDone] = useState<Done[]>([]);
  const [started, setStarted] = useState<Started[]>([]);
  const [status, setStatus] = useState<PondStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [binSignal, setBinSignal] = useState(0);

  // Opened from the "Use Ayin on your phone" QR code: remember who this is, then tidy the address.
  useEffect(() => {
    const fromLink = new URLSearchParams(window.location.search).get("student");
    if (!fromLink) return;
    setStudentId(fromLink);
    window.history.replaceState(null, "", "/");
  }, [setStudentId]);

  useEffect(() => {
    api.students().then((r) => setStudents(r.students)).catch((e) => setMessage(e.message));
    api.routines().then((r) => setRoutines(r.routines)).catch((e) => setMessage(e.message));
  }, []);

  useEffect(() => {
    if (!studentId) return;
    api
      .doneThisWeek(studentId)
      .then((r) => {
        setDone(r.done);
        setStarted(r.inProgress);
      })
      .catch(() => {});
  }, [studentId]);

  const student = students.find((s) => s.id === studentId);
  if (!student) return <StudentPicker students={students} onPick={setStudentId} message={message} />;

  async function start(routineId: string) {
    const { runId } = await api.startRun(routineId, student!.id);
    router.push(`/run/${runId}`);
  }

  async function newTask(task: string, photo: string | null) {
    setStatus("thinking");
    setMessage("Ayin is breaking it into steps");
    try {
      const { routine } = await api.newRoutine(task, photo);
      await start(routine.id);
    } catch (error) {
      setMessage((error as Error).message);
      setStatus("idle");
    }
  }

  const leaves: LeafItem[] = routines.map((r) => ({ id: r.id, title: r.title, line: `${r.stepCount} steps`, tone: toneFor(r.id) }));
  const finished: LeafItem[] = done.map((d) => ({
    id: d.runId,
    title: d.title,
    line: `${d.onOwn} of ${d.total} on your own`,
    tone: toneFor(d.runId),
  }));

  return (
    <AppShell>
      <div className="today">
        <div className="today__center">
          <h1 className="sr-only">Today</h1>
          <Pond
            motion="idle"
            furHue={student.furHue}
            agentStatus={status}
            open={leaves}
            done={finished}
            onLeafSelect={start}
            onBin={() => setBinSignal((n) => n + 1)}
            upright={status !== "idle"}
          />
          <TalkBar status={status} onListening={(on) => setStatus(on ? "listening" : "idle")} onSend={(text) => newTask(text, null)} />
          <label className="btn btn--text mt-1 inline-flex cursor-pointer items-center gap-2">
            <Camera size={18} /> Or show Ayin a photo of the task
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              disabled={status === "thinking"}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) newTask("", await readPhoto(file));
              }}
            />
          </label>
          {message && <p className="mt-2 text-center text-ink-2">{message}</p>}
        </div>

        <aside className="today__left" aria-label="Now">
          <Fold id="now" title="Now" summary={started.length === 0 ? "Nothing started" : `${started.length} started`}>
            {started.length === 0 ? (
              <p className="text-ink-2">Nothing in progress. Tap a leaf in the pond to start a task.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {started.map((s) => (
                  <li key={s.runId} className="card flex flex-col gap-2">
                    <p className="card__title">{s.title}</p>
                    <p className="card__line">
                      {s.done} of {s.total} steps done
                    </p>
                    <button className="btn btn--primary self-start" onClick={() => router.push(`/run/${s.runId}`)}>
                      Carry on
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Fold>
        </aside>

        <aside className="today__right" aria-label="Your tasks">
          <Fold id="practise" title="Practise again" summary={`${routines.length} ${routines.length === 1 ? "task" : "tasks"}`}>
            <ul className="flex flex-col">
              {routines.map((r) => (
                <li key={r.id} className="border-b border-line last:border-0">
                  <button onClick={() => start(r.id)} className="flex w-full items-center justify-between py-3 text-left">
                    <span className="font-semibold">{r.title}</span>
                    <span className="text-ink-3">{r.stepCount} steps</span>
                  </button>
                </li>
              ))}
            </ul>
          </Fold>
          <Fold
            id="done"
            toggleSignal={binSignal}
            title="Done this week"
            summary={done.length === 0 ? "Nothing yet" : `${done.length} ${done.length === 1 ? "task" : "tasks"}`}
          >
            <ul className="flex flex-col">
              {done.map((d) => (
                <li key={d.runId} className="flex justify-between border-b border-line py-3 last:border-0">
                  <span className="font-semibold">{d.title}</span>
                  <span className="text-ink-3">
                    {d.onOwn} of {d.total} on your own
                  </span>
                </li>
              ))}
            </ul>
          </Fold>
        </aside>
      </div>
    </AppShell>
  );
}
