"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { OttoChat, type ChatTurn, type Voice } from "@/components/OttoChat";
import { OtterWaits } from "@/components/OtterWaits";
import { OttoRemembers, DoneToday } from "@/components/TodayShelves";
import CardStack from "@/components/pond/CardStack";
import { lineFor } from "@/components/pond/FocusCard";
import Pond, { type PondStatus } from "@/components/pond/Pond";
import { toneFor, type BinItem, type LeafItem } from "@/components/pond/PondLeaves";
import TalkBar from "@/components/pond/TalkBar";
import { Welcome } from "@/components/Welcome";
import type { Student } from "@/lib/data/crew";
import { api, ApiError, type ThingAction } from "@/lib/client/api";
import { hush, speak } from "@/lib/client/speech";
import { useStudentId } from "@/lib/client/settings";
import type { Thing, Today as TodayView } from "@/lib/today";

/** Leaves drift away while talking. The same empty list each time, so they only go once. */
const NO_LEAVES: LeafItem[] = [];

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
  const [today, setToday] = useState<TodayView | null>(null);
  // The Now cards: which one is on top, whether they're tucked away, and the last one let go.
  const [focus, setFocus] = useState<string | null>(null);
  const [stowed, setStowed] = useState(false);
  const [letGoOf, setLetGoOf] = useState<Thing | null>(null);
  const now = useRef<HTMLElement>(null);
  // Tapping the bin in the pond opens Done today; tapping again folds it.
  const [doneSignal, setDoneSignal] = useState(0);
  const [status, setStatus] = useState<PondStatus>("idle");
  // The conversation with Otto on this screen: the last few turns, and whether the otter is still talking.
  const [chat, setChat] = useState<ChatTurn[]>([]);
  const [voice, setVoice] = useState<Voice>(null);
  // Ready answers under Otto's last line, and the task Otto offered to start (the student taps to go).
  const [choices, setChoices] = useState<string[]>([]);
  const [offer, setOffer] = useState<{ title: string; routineId: string | null } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Opened from the "Use Otto on your phone" QR code: remember who this is, then tidy the address.
  useEffect(() => {
    const fromLink = new URLSearchParams(window.location.search).get("student");
    if (!fromLink) return;
    setStudentId(fromLink);
    window.history.replaceState(null, "", "/app");
  }, [setStudentId]);

  // Only this student is ever fetched; there's no list of everyone. If they're gone, start over.
  useEffect(() => {
    if (!studentId) return;
    api
      .student(studentId)
      .then((r) => setStudent(r.student))
      .catch((e) => (e instanceof ApiError && e.status === 404 ? setStudentId(null) : setMessage(e.message)));
  }, [studentId, setStudentId]);

  const refresh = useCallback(async () => {
    if (studentId) setToday(await api.today(studentId));
  }, [studentId]);

  // What's open, done and remembered. Coming back to the screen brings it up to date, since a
  // phone can stay open past lunch or overnight.
  useEffect(() => {
    const load = () => refresh().catch((e) => setMessage(e.message));
    const onShow = () => document.visibilityState === "visible" && load();
    load();
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
  }, [refresh]);

  const leaves = useMemo<LeafItem[]>(
    () => (today?.open ?? []).map((t) => ({ id: t.id, title: t.title, line: lineFor(t), tone: toneFor(t.id) })),
    [today],
  );
  const finished = useMemo<BinItem[]>(
    () =>
      (today?.done ?? []).map((d) => ({
        id: d.thingId,
        doneId: d.id,
        title: d.title,
        line: d.line ?? "Done",
        tone: toneFor(d.thingId),
      })),
    [today],
  );

  if (studentId === undefined) return null; // still reading who's on this device
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
    router.push(`/app/run/${runId}`);
  }

  /** A button on a Now card. The next thing moves up, in the same place as always. */
  async function act(thing: Thing, action: ThingAction, line: string) {
    setMessage(line);
    setFocus(null);
    setLetGoOf(action.action === "let-go" ? thing : null);
    try {
      await api.thing(thing.id, student!.id, action);
      await refresh();
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  /** The main button on a card: carry on, start, or mark a reminder done. */
  function primary(thing: Thing) {
    if (thing.kind === "reminder") return act(thing, { action: "done" }, `${thing.title}. That's done.`);
    if (thing.run) return router.push(`/app/run/${thing.run.id}`);
    start(thing.id).catch((error) => setMessage(error.message));
  }

  async function undoLetGo() {
    if (!letGoOf) return;
    await act(letGoOf, { action: "back" }, `${letGoOf.title} is back on your list.`);
  }

  /** Tapping a leaf brings its card to the top. */
  function showCard(id: string) {
    setFocus(id);
    setStowed(false);
    now.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  async function forget(memoryId: string) {
    try {
      await api.forget(memoryId, student!.id);
      await refresh();
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  /** Talk with Otto. It chats back out loud, and starts a task when that's what the student means. */
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
      if (reply.kept) await refresh();
      setStatus("idle");
      sayAloud(turns, turns.length - 1);
    } catch (error) {
      setMessage((error as Error).message);
      setStatus("idle");
    }
  }

  /** Read one of Otto's lines out loud, lighting up each word as it's said. */
  function sayAloud(turns: ChatTurn[], turn: number) {
    setVoice({ turn, char: 0 });
    speak(turns[turn].text, {
      onWord: (char) => setVoice({ turn, char }),
      onEnd: () => setVoice(null),
    });
  }

  async function newTask(task: string, photo: string | null) {
    setStatus("thinking");
    setMessage("Otto is breaking it into steps");
    try {
      const { routine } = await api.newRoutine(student!.id, task, photo);
      await start(routine.id);
    } catch (error) {
      setMessage((error as Error).message);
      setStatus("idle");
    }
  }

  const chatting = chat.length > 0;
  const open = today?.open ?? [];
  const top = Math.max(0, open.findIndex((t) => t.id === focus));

  return (
    <AppShell>
      <div className={`today ${chatting ? "is-chatting" : ""}`}>
        <div className="today__center">
          <h1 className="sr-only">Today</h1>
          {letGoOf && (
            <div className="today__undo">
              <button className="btn btn--text" onClick={undoLetGo}>
                Undo &ldquo;Let go&rdquo;
              </button>
            </div>
          )}
          {/* While talking, the leaves drift off and the pond draws in, so the words have room. */}
          <Pond
            motion="idle"
            furHue={student.furHue}
            agentStatus={status}
            open={today ? (chatting ? NO_LEAVES : leaves) : undefined}
            done={finished}
            onLeafSelect={showCard}
            onBin={() => setDoneSignal((n) => n + 1)}
            upright={status !== "idle" || chatting}
            mood={status !== "idle" ? status : voice ? "talking" : "idle"}
            beat={voice?.char}
            onOtter={chatting ? undefined : () => converse("Hi Otto")}
            style={chatting ? { width: "min(56%, 280px)", marginTop: 0 } : undefined}
          />
          {chatting && (
            <OttoChat
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
        </div>

        {today && (
          <>
            <aside ref={now} className={`today__left now ${stowed ? "is-stowed" : ""}`} aria-label="Open now">
              <h2 className="now__h">
                <button className="now__btn" aria-expanded={!stowed} aria-controls="now-drawer" onClick={() => setStowed(!stowed)}>
                  <span className="now__title">Now</span>
                  <span className="now__summary">{open.length === 0 ? "Nothing open" : `${open.length} open`}</span>
                  <svg className="now__chev" viewBox="0 0 16 16" width="16" height="16" aria-hidden>
                    <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </h2>
              {/* The stack slides up and its space folds away while it is tucked in. */}
              <div id="now-drawer" className="now__drawer" inert={stowed} aria-hidden={stowed}>
                <div className="now__inner">
                  <CardStack
                    open={open}
                    index={top}
                    onNext={() => setFocus(open[(top + 1) % open.length].id)}
                    onPrimary={primary}
                    act={act}
                  />
                </div>
              </div>
            </aside>

            <aside className="today__right" aria-label="Today so far">
              <DoneToday done={today.done} toggleSignal={doneSignal} onAgain={(id) => start(id).catch((e) => setMessage(e.message))} />
              <OttoRemembers memories={today.memories} onForget={forget} />
            </aside>
          </>
        )}
      </div>
    </AppShell>
  );
}
