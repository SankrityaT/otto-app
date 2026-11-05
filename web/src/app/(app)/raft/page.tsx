"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { RaftIntro } from "@/components/RaftIntro";
import { Composer } from "@/components/raft/Composer";
import { PostCard } from "@/components/raft/PostCard";
import { RaftPond } from "@/components/raft/RaftPond";
import { RaftIcon } from "@/components/raft/Stickers";
import { TogetherSheet } from "@/components/raft/TogetherSheet";
import type { CrewView } from "@/lib/data/crew";
import type { Post, PostKind } from "@/lib/data/raft";
import { api } from "@/lib/client/api";
import { useStudentId } from "@/lib/client/settings";

type Tab = "wins" | "help";
type Member = CrewView["members"][number];
const INTRO_KEY = "ayin.raftIntroSeen";

export default function RaftPage() {
  const router = useRouter();
  const [studentId] = useStudentId();
  const [tab, setTab] = useState<Tab>("wins");
  const [raft, setRaft] = useState<CrewView | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [composing, setComposing] = useState<PostKind | null>(null);
  const [introOpen, setIntroOpen] = useState(false);
  // "Do a task together": open with nobody picked, or with the otter tapped in the pond.
  const [together, setTogether] = useState<{ with: Member | null } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!studentId) return;
    api.crew(studentId).then((r) => setRaft(r.crew)).catch((e) => setMessage(e.message));
    api.feed(studentId, null).then((r) => setPosts(r.posts)).catch((e) => setMessage(e.message));
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  // The first visit opens the "what's a raft?" intro.
  useEffect(() => {
    if (localStorage.getItem(INTRO_KEY)) return;
    const open = setTimeout(() => setIntroOpen(true), 0);
    return () => clearTimeout(open);
  }, []);

  async function act(action: Promise<unknown>) {
    await action.catch((e) => setMessage(e.message));
    load();
  }

  if (!raft || !studentId) {
    return (
      <AppShell>
        <div className="page flex flex-col items-center gap-3 pt-10 text-center">
          <p>{message ?? (studentId ? "Loading your raft" : "Pick your name on the Today screen first.")}</p>
          <Link href="/" className="btn btn--text">
            Go to Today
          </Link>
        </div>
      </AppShell>
    );
  }

  const shown = posts.filter((p) => (tab === "wins" ? p.kind === "win" : p.kind === "ask"));
  const invites = raft.invites.filter((i) => i.fromId !== studentId && i.status === "waiting");
  const waitingOn = raft.invites.find((i) => i.fromId === studentId && i.status === "waiting");

  async function join(inviteId: string) {
    const { runId } = await api.answerInvite(inviteId, studentId!, "yes");
    if (runId) router.push(`/run/${runId}`);
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
          authorId={studentId}
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
          meId={studentId}
          members={raft.members}
          buddyId={raft.buddy?.id ?? null}
          start={together.with}
          onClose={() => setTogether(null)}
          onStarted={(runId) => router.push(`/run/${runId}`)}
        />
      )}

      <div className={`page flex flex-col gap-5 ${introOpen ? "hidden" : ""}`}>
        <header>
          <h1 className="page__h">{raft.name}</h1>
          <button onClick={() => setIntroOpen(true)} className="text-[15px] text-ink-3 underline-offset-4 hover:underline">
            {raft.members.length} otters · What&apos;s a raft?
          </button>
        </header>

        <section className="flex flex-col gap-2" aria-label="Who's here">
          <RaftPond
            members={raft.members}
            meId={studentId}
            onPick={(m) => (m.id === studentId ? router.push(`/raft/people/${m.id}`) : setTogether({ with: m }))}
          />
          <p className="text-center text-[16px] text-ink-2">
            <strong className="text-ink">{raft.onOwnTogether}</strong> of {raft.weeklyGoal} steps on our own this week, together
          </p>
        </section>

        {invites.map((invite) => (
          <section key={invite.id} className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-cel-wash p-4">
            <p className="flex items-center gap-2 text-[17px] text-ink">
              <RaftIcon name="together" />
              <span>
                <strong>{invite.fromName}</strong> just started &ldquo;{invite.about}&rdquo;. Do it together?
              </span>
            </p>
            <div className="flex gap-2">
              <Button look="main" onClick={() => join(invite.id)}>
                Join {invite.fromName}
              </Button>
              <Button onClick={() => act(api.answerInvite(invite.id, studentId, "not-today"))}>Not today</Button>
            </div>
          </section>
        ))}

        {waitingOn?.fromRunId ? (
          <Link href={`/run/${waitingOn.fromRunId}`} className="btn btn--primary h-14 justify-center">
            Back to {waitingOn.about}, waiting for {waitingOn.toName}
          </Link>
        ) : (
          <Button look="main" className="h-14" onClick={() => setTogether({ with: null })}>
            <RaftIcon name="together" /> Do a task together
          </Button>
        )}

        <div className="flex items-center gap-2">
          <div className="flex flex-1 rounded-full bg-clay p-1" role="tablist">
            {(
              [
                ["wins", "Wins"],
                ["help", "Help board"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                role="tab"
                aria-selected={tab === value}
                onClick={() => setTab(value)}
                className={`flex-1 rounded-full py-2 text-[16px] font-semibold ${tab === value ? "bg-card" : "text-ink-2"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <Button className="h-11 px-4" onClick={() => setComposing(tab === "wins" ? "win" : "ask")}>
            <RaftIcon name={tab === "wins" ? "win" : "help"} /> {tab === "wins" ? "Share" : "Ask"}
          </Button>
        </div>

        <section className="flex flex-col gap-3" aria-label={tab === "wins" ? "Raft wins" : "Help board"}>
          {shown.length === 0 && (
            <p className="py-6 text-center text-ink-2">{tab === "help" ? "Nobody needs help right now." : "No wins yet. Share the first one!"}</p>
          )}
          {shown.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              viewerId={studentId}
              onReact={(kind) => act(api.react(post.id, studentId, kind))}
              onReport={() => act(api.report(post.id, studentId))}
            />
          ))}
        </section>

        {message && <p className="text-ink-3">{message}</p>}
      </div>

    </AppShell>
  );
}
