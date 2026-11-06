"use client";

import { MessagesSquare, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { OtterWaits } from "@/components/OtterWaits";
import { RaftIntro } from "@/components/RaftIntro";
import { Ring } from "@/components/Ring";
import { Composer } from "@/components/raft/Composer";
import { OtterAvatar } from "@/components/raft/OtterAvatar";
import { PostCard } from "@/components/raft/PostCard";
import { RaftScene } from "@/components/raft/RaftScene";
import { RaftIcon } from "@/components/raft/Stickers";
import { TogetherSheet } from "@/components/raft/TogetherSheet";
import type { CrewView } from "@/lib/data/crew";
import type { Post, PostKind, Reaction } from "@/lib/data/raft";
import { api, ApiError } from "@/lib/client/api";
import { useStudentId } from "@/lib/client/settings";
import { ringColor } from "@/lib/fur";

type Member = CrewView["members"][number];
const INTRO_KEY = "ayin.raftIntroSeen";
/** How often the raft checks what everyone is doing. */
const REFRESH_MS = 5000;

/**
 * The raft, on one screen: Havi's pond with everyone's otter, acting out what raftmates really
 * do, and one card underneath that says what's happening or what you can do. Only your own ring
 * shows a number; the raft's total is shared, so nobody is ranked.
 */
export default function RaftPage() {
  const router = useRouter();
  const [studentId] = useStudentId();
  const [raft, setRaft] = useState<CrewView | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [picked, setPicked] = useState<Member | null>(null);
  const [board, setBoard] = useState<PostKind | null>(null);
  const [composing, setComposing] = useState<PostKind | null>(null);
  const [together, setTogether] = useState<{ with: Member | null } | null>(null);
  const [introOpen, setIntroOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [noRaft, setNoRaft] = useState(false);
  const [code, setCode] = useState("");
  // Not in a raft yet: join one with a code, or start a new one (then `code` is its name).
  const [starting, setStarting] = useState(false);

  const load = useCallback(() => {
    if (!studentId) return;
    api
      .crew(studentId)
      .then((r) => setRaft(r.crew))
      .catch((e) => (e instanceof ApiError && e.status === 404 ? setNoRaft(true) : setMessage(e.message)));
    api.feed(studentId, null).then((r) => setPosts(r.posts)).catch(() => {});
  }, [studentId]);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  // The first visit opens the "what's a raft?" intro.
  useEffect(() => {
    if (localStorage.getItem(INTRO_KEY)) return;
    const open = setTimeout(() => setIntroOpen(true), 0);
    return () => clearTimeout(open);
  }, []);

  /** Join a raft later, with the code from their teacher. */
  async function join(event: FormEvent) {
    event.preventDefault();
    try {
      if (starting) await api.startRaft(studentId!, code);
      else await api.joinRaft(studentId!, code);
      setNoRaft(false);
      setMessage(null);
      load();
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  if (noRaft && studentId) {
    return (
      <AppShell>
        <form onSubmit={join} className="page flex max-w-md flex-col items-center gap-3 pt-10 text-center">
          <h1 className="page__h">{starting ? "Start a raft" : "Join your raft"}</h1>
          <p className="text-ink-2">
            {starting
              ? "Name it, and Otto gives you a code to share with your classmates."
              : "A raft is a few classmates from your work site. Your teacher has its code."}
          </p>
          <label htmlFor="code" className="sr-only">
            {starting ? "Raft name" : "Raft code"}
          </label>
          <input
            id="code"
            className={`w-full rounded-2xl border-[1.5px] border-line bg-card px-4 py-3 text-center text-[20px] outline-none focus:border-ink ${starting ? "" : "uppercase tracking-[0.2em]"}`}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={starting ? "Like Café raft" : "Raft code"}
            autoComplete="off"
            maxLength={starting ? 30 : 12}
          />
          <button className="btn btn--primary w-full" disabled={!code.trim()}>
            {starting ? "Start my raft" : "Join my raft"}
          </button>
          <button
            type="button"
            className="btn btn--text"
            onClick={() => {
              setStarting(!starting);
              setCode("");
              setMessage(null);
            }}
          >
            {starting ? "I have a code" : "No code? Start a new raft"}
          </button>
          {message && <p className="text-ink-2">{message}</p>}
        </form>
      </AppShell>
    );
  }

  if (!raft || !studentId) {
    return (
      <AppShell>
        {studentId && !message ? (
          <OtterWaits says="Paddling over to your raft" />
        ) : (
          <div className="page flex flex-col items-center gap-3 pt-10 text-center">
            <p>{message ?? "Say hi to Otto on the Today screen first."}</p>
            <Link href="/app" className="btn btn--text">
              Go to Today
            </Link>
          </div>
        )}
      </AppShell>
    );
  }

  const me = studentId;
  const mine = raft.members.find((m) => m.id === me);
  const invites = raft.invites.filter((i) => i.fromId !== me && i.status === "waiting");
  const waitingOn = raft.invites.find((i) => i.fromId === me && i.status === "waiting");
  // Keep the card in step with the latest check, not the moment it was tapped.
  const tapped = picked ? (raft.members.find((m) => m.id === picked.id) ?? null) : null;
  // With nothing tapped, the card is about whoever matters most right now: someone who needs
  // help, then someone working, then someone who just finished. The same card as tapping them.
  const others = raft.members.filter((m) => m.id !== me);
  const spotlight = others.find((m) => m.asking) ?? others.find((m) => m.now) ?? others.find((m) => m.justFinished) ?? null;
  const current = tapped ?? spotlight;

  async function act(action: Promise<unknown>) {
    await action.catch((e) => setMessage(e.message));
    load();
  }

  async function go(started: Promise<{ runId: string | null }>) {
    try {
      const { runId } = await started;
      if (runId) router.push(`/app/run/${runId}`);
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  /** The card under the pond: what you can do with the otter you tapped, or what's going on. */
  function card() {
    const invite = tapped ? invites.find((i) => i.fromId === tapped.id) : invites[0];
    const close = tapped ? () => setPicked(null) : undefined;
    const backToMine = waitingOn?.fromRunId && (
      <Link href={`/app/run/${waitingOn.fromRunId}`} className="btn btn--text self-start px-0">
        Back to {waitingOn.about} (waiting for {waitingOn.toName})
      </Link>
    );

    if (invite) {
      return (
        <Card furHue={raft!.members.find((m) => m.id === invite.fromId)?.furHue} onClose={close}>
          <p className="text-[18px]">
            <strong>{invite.fromName}</strong> just started &ldquo;{invite.about}&rdquo;. Do it together?
          </p>
          <div className="flex gap-2">
            <Button look="main" onClick={() => go(api.answerInvite(invite.id, me, "yes"))}>
              Join {invite.fromName}
            </Button>
            <Button onClick={() => act(api.answerInvite(invite.id, me, "not-today"))}>Not today</Button>
          </div>
        </Card>
      );
    }

    if (current) {
      const self = current.id === me;
      const doing = current.asking
        ? `asked: “${current.asking.body}”`
        : current.now
          ? `${self ? "are" : "is"} on step ${Math.min(current.now.done + 1, current.now.total)} of ${current.now.total}: ${current.now.title}`
          : current.justFinished
            ? `just finished ${current.justFinished}!`
            : `${self ? "are" : "is"} taking a break`;
      // Just finished something: cheer them with one of the raft's preset cheers.
      const win = !self && !current.asking && !current.now && current.justFinished ? raft!.wins.find((w) => w.studentId === current.id) : undefined;
      return (
        <Card furHue={current.furHue} onClose={close}>
          <p className="text-[18px]">
            <strong>{self ? "You" : current.name}</strong> {doing}
          </p>
          <div className="flex flex-wrap gap-2">
            {!self && current.asking && (
              <Link href={`/app/raft/post/${current.asking.postId}`} className="btn btn--primary">
                Help {current.name}
              </Link>
            )}
            {win &&
              (win.cheered ? (
                <p className="self-center text-[15px] text-ink-2">You cheered {current.name}.</p>
              ) : (
                raft!.cheers.map((phrase) => (
                  <Button key={phrase} onClick={() => act(api.cheer(me, win.runId, phrase))}>
                    {phrase}
                  </Button>
                ))
              ))}
            {!self && !(win && !win.cheered) && (
              <Button look={current.asking ? "quiet" : "main"} onClick={() => setTogether({ with: current })}>
                <RaftIcon name="together" /> Work with {current.name}
              </Button>
            )}
            <Link href={`/app/raft/people/${current.id}`} className="btn btn--text">
              {self ? "Your profile" : `How ${current.name} works best`}
            </Link>
          </div>
          {!tapped && <p className="text-[15px] text-ink-3">Tap any otter to see them.</p>}
          {backToMine}
        </Card>
      );
    }

    // Nobody is doing anything right now.
    return (
      <Card>
        <p className="text-[18px]">It&apos;s quiet in the pond right now.</p>
        <p className="text-[15px] text-ink-3">Tap any otter to see them.</p>
        {backToMine}
      </Card>
    );
  }

  return (
    <AppShell>
      {introOpen && (
        <RaftIntro
          onDone={() => {
            localStorage.setItem(INTRO_KEY, "yes");
            setIntroOpen(false);
          }}
        />
      )}
      {composing && (
        <Composer
          authorId={me}
          startKind={composing}
          onClose={() => setComposing(null)}
          onShared={() => {
            setComposing(null);
            load();
          }}
        />
      )}
      {together && (
        <TogetherSheet
          meId={me}
          members={raft.members}
          buddyId={raft.buddy?.id ?? null}
          start={together.with}
          onClose={() => setTogether(null)}
          onStarted={(runId) => router.push(`/app/run/${runId}`)}
        />
      )}
      {board && (
        <Board
          kind={board}
          posts={posts.filter((p) => p.kind === board)}
          viewerId={me}
          onKind={setBoard}
          onClose={() => setBoard(null)}
          onWrite={() => setComposing(board)}
          onReact={(postId, reaction) => act(api.react(postId, me, reaction))}
          onReport={(postId) => act(api.report(postId, me))}
        />
      )}

      <div className={`page flex flex-col gap-4 ${introOpen ? "hidden" : ""}`}>
        <header className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-3">{raft.name} · this week</p>
            <h1 className="font-display text-[30px] leading-none sm:text-[40px]">The pond is filling up</h1>
            <p className="flex flex-wrap items-center gap-x-3 text-[15px] text-ink-3">
              <button onClick={() => setIntroOpen(true)} className="underline-offset-4 hover:underline">
                What&apos;s a raft?
              </button>
              {raft.code && (
                <span>
                  Invite with code <strong className="tracking-[0.15em] text-ink">{raft.code}</strong>
                </span>
              )}
            </p>
          </div>
          {mine && (
            <div className="flex shrink-0 items-center gap-2 text-right">
              <span className="text-[14px] leading-tight text-ink-2">
                <strong className="block text-[18px] text-ink">
                  {Math.min(mine.onOwn, mine.target)} of {mine.target}
                </strong>
                steps on your own
              </span>
              <Ring fill={mine.ring} size={44} stroke={6} color={ringColor(mine.furHue)} label="Your ring this week" />
            </div>
          )}
        </header>

        <section className="flex flex-col gap-4" aria-label="Your raft">
          <div className="-mx-3 px-[3%] pt-6 sm:mx-0">
            <RaftScene raft={raft} meId={me} invitingIds={invites.map((i) => i.fromId)} onPick={setPicked} />
          </div>
          {/* The shared goal: every step anyone does on their own raises the water. */}
          <div className="flex items-center gap-3">
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-clay" aria-hidden>
              <div className="h-full rounded-full bg-[var(--water-edge)]" style={{ width: `${Math.min(1, raft.onOwnTogether / raft.weeklyGoal) * 100}%` }} />
            </div>
            <p className="shrink-0 text-[14px] text-ink-2">
              {raft.onOwnTogether} of {raft.weeklyGoal} steps together
            </p>
          </div>
        </section>

        {card()}

        <div className="flex gap-2">
          <Button look="main" className="h-14 flex-1" onClick={() => setTogether({ with: null })}>
            <RaftIcon name="together" /> Do a task together
          </Button>
          <Button className="h-14 px-4" onClick={() => setBoard("win")} aria-label="Wins and questions">
            <MessagesSquare size={20} />
            <span className="hidden sm:inline">Wins &amp; questions</span>
          </Button>
        </div>
        {message && <p className="text-ink-3">{message}</p>}
      </div>
    </AppShell>
  );
}

/** The card under the pond, with the otter it's about. */
function Card({ furHue, onClose, children }: { furHue?: number; onClose?: () => void; children: ReactNode }) {
  return (
    <section className="chat__bubble flex items-start gap-3 rounded-[var(--radius-card)] border border-line bg-card p-3" aria-live="polite">
      {furHue !== undefined && <OtterAvatar furHue={furHue} size={52} />}
      <div className="flex min-w-0 flex-1 flex-col gap-2">{children}</div>
      {onClose && (
        <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-clay">
          <X size={18} />
        </button>
      )}
    </section>
  );
}

/** Wins and questions, on top of the raft instead of under it. */
function Board({
  kind,
  posts,
  viewerId,
  onKind,
  onClose,
  onWrite,
  onReact,
  onReport,
}: {
  kind: PostKind;
  posts: Post[];
  viewerId: string;
  onKind: (kind: PostKind) => void;
  onClose: () => void;
  onWrite: () => void;
  onReact: (postId: string, reaction: Reaction) => void;
  onReport: (postId: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 sm:items-center" role="dialog" aria-modal aria-label="Wins and questions">
      <div className="flex h-[88svh] w-full max-w-md flex-col gap-3 rounded-t-[28px] bg-ground p-4 sm:rounded-[28px]">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 rounded-full bg-clay p-1" role="tablist">
            {(
              [
                ["win", "Wins"],
                ["ask", "Questions"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                role="tab"
                aria-selected={kind === value}
                onClick={() => onKind(value)}
                className={`flex-1 rounded-full py-2 text-[16px] font-semibold ${kind === value ? "bg-card" : "text-ink-2"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-full text-ink-2 hover:bg-clay">
            <X size={20} />
          </button>
        </div>
        <Button look="main" className="h-12" onClick={onWrite}>
          <RaftIcon name={kind === "win" ? "win" : "help"} /> {kind === "win" ? "Share a win" : "Ask for help"}
        </Button>
        <section className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto" aria-label={kind === "win" ? "Raft wins" : "Questions"}>
          {posts.length === 0 && <p className="py-6 text-center text-ink-2">{kind === "ask" ? "Nobody needs help right now." : "No wins yet. Share the first one!"}</p>}
          {posts.map((post) => (
            <PostCard key={post.id} post={post} viewerId={viewerId} onReact={(r) => onReact(post.id, r)} onReport={() => onReport(post.id)} />
          ))}
        </section>
      </div>
    </div>
  );
}
