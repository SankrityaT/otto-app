"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AyinChat, type ChatTurn, type Voice } from "@/components/AyinChat";
import { OtterWaits } from "@/components/OtterWaits";
import { TaskLeaves } from "@/components/TaskLeaves";
import Pond, { type PondStatus } from "@/components/pond/Pond";
import { toneFor } from "@/components/pond/PondLeaves";
import TalkBar from "@/components/pond/TalkBar";
import { Welcome } from "@/components/Welcome";
import type { Student } from "@/lib/data/crew";
import { api, ApiError } from "@/lib/client/api";
import { hush, speak } from "@/lib/client/speech";
import { useStudentId } from "@/lib/client/settings";

type Routine = { id: string; title: string; stepCount: number };
type Started = { runId: string; title: string; done: number; total: number };

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
  const [student, setStudent] = useState<Student | null>(null);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [started, setStarted] = useState<Started[]>([]);
  const [status, setStatus] = useState<PondStatus>("idle");
  // The conversation with Ayin on this screen: the last few turns, and whether the otter is still talking.
  const [chat, setChat] = useState<ChatTurn[]>([]);
  const [voice, setVoice] = useState<Voice>(null);
  // Ready answers under Ayin's last line, and the task Ayin offered to start (the student taps to go).
  const [choices, setChoices] = useState<string[]>([]);
  const [offer, setOffer] = useState<{ title: string; routineId: string | null } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Opened from the "Use Ayin on your phone" QR code: remember who this is, then tidy the address.
  useEffect(() => {
    const fromLink = new URLSearchParams(window.location.search).get("student");
    if (!fromLink) return;
    setStudentId(fromLink);
    window.history.replaceState(null, "", "/");
  }, [setStudentId]);

  useEffect(() => {
    api.routines().then((r) => setRoutines(r.routines)).catch((e) => setMessage(e.message));
  }, []);

  // Only this student is ever fetched; there's no list of everyone. If they're gone, start over.
  useEffect(() => {
    if (!studentId) return;
    api
      .student(studentId)
      .then((r) => setStudent(r.student))
      .catch((e) => (e instanceof ApiError && e.status === 404 ? setStudentId(null) : setMessage(e.message)));
  }, [studentId, setStudentId]);

  useEffect(() => {
    if (!studentId) return;
    api
      .doneThisWeek(studentId)
      .then((r) => setStarted(r.inProgress))
      .catch(() => {});
  }, [studentId]);

  if (!studentId) {
    return (
      <Welcome
        onReady={(chosen) => {
          setStudent(chosen);
          setStudentId(chosen.id);
        }}
      />
    );
  }
  if (student?.id !== studentId) return <OtterWaits says={message ?? "Finding your otter"} />;

  async function start(routineId: string) {
    const { runId } = await api.startRun(routineId, student!.id);
    router.push(`/run/${runId}`);
  }

  /** Talk with Ayin. It chats back out loud, and starts a task when that's what the student means. */
  async function converse(said: string) {
    if (!student) return;
    setStatus("thinking");
    setMessage(null);
    setChoices([]);
    setOffer(null);
    const history: ChatTurn[] = [...chat, { who: "student", text: said }];
    setChat(history);
    try {
      const reply = await api.talk(student.id, said, chat);
      const turns: ChatTurn[] = [...history, { who: "ayin" as const, text: reply.say }].slice(-12);
      setChat(turns);
      setChoices(reply.choices);
      if (reply.startTask) setOffer({ title: reply.startTask, routineId: reply.routineId });
      setStatus("idle");
      sayAloud(turns, turns.length - 1);
    } catch (error) {
      setMessage((error as Error).message);
      setStatus("idle");
    }
  }

  /** Read one of Ayin's lines out loud, lighting up each word as it's said. */
  function sayAloud(turns: ChatTurn[], turn: number) {
    setVoice({ turn, char: 0 });
    speak(turns[turn].text, {
      onWord: (char) => setVoice({ turn, char }),
      onEnd: () => setVoice(null),
    });
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

  const chatting = chat.length > 0;
  // Each task once: the latest unfinished try of it (newest first from the server).
  const carryOn = started.filter((s, i) => started.findIndex((other) => other.title === s.title) === i);


  return (
    <AppShell>
      <div className="today">
        <div className="today__center">
          <h1 className="sr-only">Today</h1>
          {/* Just the otter in its pond. While talking, the pond draws in so the words have room. */}
          <Pond
            motion="idle"
            furHue={student.furHue}
            agentStatus={status}
            upright={status !== "idle" || chatting}
            mood={status !== "idle" ? status : voice ? "talking" : "idle"}
            beat={voice?.char}
            onOtter={chatting ? undefined : () => converse("Hi Ayin")}
            style={chatting ? { width: "min(56%, 280px)", marginTop: 0 } : undefined}
          />
          {chatting && (
            <AyinChat
              turns={chat}
              thinking={status === "thinking"}
              voice={voice}
              choices={choices}
              task={offer?.title ?? null}
              onChoose={converse}
              onHear={(turn) => sayAloud(chat, turn)}
              onStartTask={() => offer && (offer.routineId ? start(offer.routineId) : newTask(offer.title, null))}
              onClose={() => {
                hush();
                setVoice(null);
                setChat([]);
                setOffer(null);
                setChoices([]);
              }}
            />
          )}
          <TalkBar
            status={status}
            onListening={(on) => setStatus(on ? "listening" : "idle")}
            onSend={(text) => converse(text)}
            onPhoto={async (file) => newTask("", await readPhoto(file))}
          />
          {message && <p className="mt-2 text-center text-ink-2">{message}</p>}
          {!chatting && (
            <div className="mt-3 w-full">
              <TaskLeaves
                started={carryOn.map((s) => ({ ...s, id: s.runId, tone: toneFor(routines.find((r) => r.title === s.title)?.id ?? s.runId) }))}
                tasks={routines.filter((r) => !carryOn.some((s) => s.title === r.title)).map((r) => ({ ...r, tone: toneFor(r.id) }))}
                onCarryOn={(runId) => router.push(`/run/${runId}`)}
                onStart={start}
              />
            </div>
          )}
        </div>

      </div>
    </AppShell>
  );
}
