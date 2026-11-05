"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { CrewPond } from "@/components/CrewPond";
import { RaftIntro } from "@/components/RaftIntro";
import { Composer } from "@/components/raft/Composer";
import { OtterAvatar } from "@/components/raft/OtterAvatar";
import { PostCard } from "@/components/raft/PostCard";
import { RaftIcon } from "@/components/raft/Stickers";
import type { CrewView } from "@/lib/data/crew";
import type { Post, PostKind } from "@/lib/data/raft";
import { api } from "@/lib/client/api";
import { useStudentId } from "@/lib/client/settings";

type Tab = "wins" | "help" | "people";
const INTRO_KEY = "ayin.raftIntroSeen";

export default function RaftPage() {
  const [studentId] = useStudentId();
  const [tab, setTab] = useState<Tab>("wins");
  const [raft, setRaft] = useState<CrewView | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [composing, setComposing] = useState<PostKind | null>(null);
  const [introOpen, setIntroOpen] = useState(false);
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

  const shown = posts.filter((p) => (tab === "wins" ? true : tab === "help" ? p.kind === "ask" : false));
  const invites = raft.invites.filter((i) => i.fromId !== studentId && i.status === "waiting");

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

      <div className={`page flex flex-col gap-5 ${introOpen ? "hidden" : ""}`}>
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="page__h">{raft.name}</h1>
            <button onClick={() => setIntroOpen(true)} className="text-[15px] text-ink-3 underline-offset-4 hover:underline">
              {raft.members.length} otters · What&apos;s a raft?
            </button>
          </div>
          <div className="flex -space-x-3">
            {raft.members.map((m) => (
              <Link key={m.id} href={`/raft/people/${m.id}`} aria-label={m.name} className="rounded-full ring-2 ring-ground">
                <OtterAvatar furHue={m.furHue} size={38} />
              </Link>
            ))}
          </div>
        </header>

        <div className="flex rounded-full bg-clay p-1" role="tablist">
          {(
            [
              ["wins", "Wins"],
              ["help", "Help board"],
              ["people", "People"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={`flex-1 rounded-full py-2.5 text-[16px] font-semibold ${tab === value ? "bg-card" : "text-ink-2"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab !== "people" && (
          <div className="flex gap-3">
            <Button look="main" className="h-14 flex-1" onClick={() => setComposing("win")}>
              <RaftIcon name="win" /> Share a win
            </Button>
            <Button className="h-14 flex-1" onClick={() => setComposing("ask")}>
              <RaftIcon name="help" /> Ask for help
            </Button>
          </div>
        )}

        {tab === "wins" && (
          <>
            <section className="flex flex-col gap-1">
              <CrewPond fill={raft.onOwnTogether / raft.weeklyGoal} members={raft.members} />
              <p className="text-center text-[17px] text-ink-2">
                <strong className="text-ink">{raft.onOwnTogether}</strong> of {raft.weeklyGoal} steps on our own this week.
                Every one fills the pond.
              </p>
            </section>
            {invites.map((invite) => (
              <section key={invite.id} className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-cel-wash p-4">
                <p className="flex items-center gap-2 text-[17px] text-ink">
                  <RaftIcon name="together" />
                  <span>
                    <strong>{invite.fromName}</strong> wants to practise &ldquo;{invite.about}&rdquo; with you
                  </span>
                </p>
                <div className="flex gap-2">
                  <Button look="main" onClick={() => act(api.answerInvite(invite.id, studentId, "yes"))}>
                    Yes, let&apos;s
                  </Button>
                  <Button onClick={() => act(api.answerInvite(invite.id, studentId, "not-today"))}>Not today</Button>
                </div>
              </section>
            ))}
          </>
        )}

        {tab === "people" ? (
          <ul className="flex flex-col gap-3">
            {raft.members.map((m) => (
              <li key={m.id}>
                <Link href={`/raft/people/${m.id}`} className="flex items-center gap-4 rounded-[var(--radius-card)] border border-line bg-card p-4">
                  <OtterAvatar furHue={m.furHue} size={56} />
                  <span className="flex-1">
                    <span className="block text-[18px] font-bold">{m.id === studentId ? "You" : m.name}</span>
                    <span className="text-[15px] text-ink-3">See how {m.id === studentId ? "you work" : `${m.name} works`} best</span>
                  </span>
                  {raft.buddy?.id === m.id && (
                    <span className="rounded-full bg-cel-wash px-3 py-1 text-[14px] font-semibold text-cel-deep">Your buddy</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <section className="flex flex-col gap-3" aria-label={tab === "wins" ? "Raft wins" : "Help board"}>
            {shown.length === 0 && (
              <p className="py-6 text-center text-ink-2">
                {tab === "help" ? "Nobody needs help right now." : "No posts yet. Share the first win!"}
              </p>
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
        )}

        {message && <p className="text-ink-3">{message}</p>}
      </div>

    </AppShell>
  );
}
