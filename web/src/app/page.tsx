"use client";

import { Camera, ChevronRight, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import UprightOtter from "@/components/otter/UprightOtter";
import type { Student } from "@/lib/data/crew";
import { api } from "@/lib/client/api";
import { useCameraChoice, useStudentId } from "@/lib/client/settings";

type Routine = { id: string; title: string; stepCount: number };

/** Read a photo the student took into a data URL the API understands. */
function readPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("That photo couldn't be read. Try taking it again."));
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useStudentId();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [camera, setCamera] = useCameraChoice();
  const [task, setTask] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api.students().then((r) => setStudents(r.students)).catch((e) => setMessage(e.message));
    api.routines().then((r) => setRoutines(r.routines)).catch((e) => setMessage(e.message));
  }, []);

  const student = students.find((s) => s.id === studentId);

  async function start(routineId: string) {
    if (!studentId) return;
    const { runId } = await api.startRun(routineId, studentId);
    router.push(`/run/${runId}`);
  }

  async function startNewTask(photo: string | null) {
    setBusy(true);
    setMessage("Ayin is breaking it into steps");
    try {
      const { routine } = await api.newRoutine(task, photo);
      await start(routine.id);
    } catch (error) {
      setMessage((error as Error).message);
      setBusy(false);
    }
  }

  if (!student) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-5 py-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <UprightOtter className="h-44 w-44" />
          <h1 className="font-display text-[42px] leading-none">Who&apos;s working today?</h1>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {students.map((s) => (
            <Button key={s.id} className="h-16 text-[19px]" onClick={() => setStudentId(s.id)}>
              {s.name}
            </Button>
          ))}
        </div>
        {students.length === 0 && (
          <p className="text-center text-ink-3">
            No students yet. Run <code>npm run seed</code> to add a demo crew.
          </p>
        )}
        {message && <p className="text-center text-ink-3">{message}</p>}
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-7 px-5 py-6">
      <header className="flex items-center justify-between">
        <button
          onClick={() => setStudentId(null)}
          className="flex items-center gap-2 rounded-full bg-card py-1.5 pl-1.5 pr-4 text-[15px] font-medium"
        >
          <UprightOtter className="h-8 w-8 rounded-full bg-clay" active={false} />
          {student.name}
          <span className="text-ink-3">· switch</span>
        </button>
        <Link href="/crew" className="flex items-center gap-2 rounded-full bg-card px-4 py-2.5 text-[15px] font-medium">
          <Users size={18} /> My crew
        </Link>
      </header>

      <section className="flex flex-col gap-4">
        <h1 className="font-display text-[42px] leading-[1.02]">What are you working on?</h1>
        <input
          aria-label="The task"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && task.trim() && !busy && startNewTask(null)}
          placeholder="Make an iced latte"
          className="h-16 rounded-2xl border border-line bg-card px-5 text-[19px] placeholder:text-ink-3"
        />
        <div className="flex gap-3">
          <Button look="main" className="h-14 flex-1" disabled={busy || !task.trim()} onClick={() => startNewTask(null)}>
            Start
          </Button>
          <label className="inline-flex h-14 cursor-pointer items-center gap-2 rounded-full bg-clay px-5 text-[17px] font-medium has-[:disabled]:opacity-40">
            <Camera size={20} /> Show it
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              disabled={busy}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) startNewTask(await readPhoto(file));
              }}
            />
          </label>
        </div>
        {message && <p className="text-[17px] text-ink-2">{message}</p>}
      </section>

      {routines.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[15px] font-medium text-ink-3">Practise again</h2>
          <ul className="flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-card">
            {routines.map((r) => (
              <li key={r.id} className="border-b border-line last:border-0">
                <button
                  disabled={busy}
                  onClick={() => start(r.id)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left disabled:opacity-40"
                >
                  <span className="flex flex-col">
                    <span className="text-[17px] font-medium">{r.title}</span>
                    <span className="text-[15px] text-ink-3">{r.stepCount} steps</span>
                  </span>
                  <ChevronRight size={20} className="text-ink-3" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-auto flex items-center justify-between gap-3 text-[15px] text-ink-3">
        <span>Ayin&apos;s eyes</span>
        <div className="flex rounded-full bg-clay p-1" role="radiogroup" aria-label="Which camera Ayin uses">
          {(["this-device", "otter"] as const).map((choice) => (
            <button
              key={choice}
              role="radio"
              aria-checked={camera === choice}
              onClick={() => setCamera(choice)}
              className={`rounded-full px-4 py-2 font-medium ${camera === choice ? "bg-card text-ink" : "text-ink-2"}`}
            >
              {choice === "this-device" ? "This phone" : "The otter"}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
