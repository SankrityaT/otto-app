"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Profile } from "@/lib/data/raft";
import { api } from "@/lib/client/api";
import { useStudentId } from "@/lib/client/settings";
import { STAGES } from "@/lib/stages";
import { AppShell } from "../AppShell";
import { Button } from "../Button";
import UprightOtter from "../otter/UprightOtter";
import { RaftIcon } from "./Stickers";

/**
 * A raftmate's page: their otter, their own goal, how they work best, and what they can help
 * with. "Can help with" fills itself from tasks they've done on their own, so the help a
 * student no longer needs becomes help they can give.
 */
export function ProfileScreen() {
  const { id } = useParams<{ id: string }>();
  const [viewerId] = useStudentId();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [workStyles, setWorkStyles] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [goal, setGoal] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const isMe = viewerId === id;

  const load = useCallback(() => {
    api
      .profile(id)
      .then((r) => {
        setProfile(r.profile);
        setWorkStyles(r.workStyles);
        setGoal(r.profile.goal?.text ?? "");
      })
      .catch((e) => setMessage(e.message));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!profile) {
    return (
      <AppShell>
        <p className="page pt-10 text-center">{message ?? "Loading"}</p>
      </AppShell>
    );
  }

  async function toggleStyle(style: string) {
    const next = profile!.workStyle.includes(style) ? profile!.workStyle.filter((s) => s !== style) : [...profile!.workStyle, style];
    await api.updateProfile(id, { workStyle: next });
    load();
  }

  return (
    <AppShell>
      <div className="page flex flex-col gap-4 pb-10">
        <Link href="/raft" className="btn btn--text self-start px-0">
          Back to the raft
        </Link>

        <header className="flex flex-col items-center gap-1 text-center">
          <UprightOtter className="h-36 w-36" furHue={profile.furHue} />
          <h1 className="page__h">{isMe ? "You" : profile.name}</h1>
          <p className="text-ink-3">
            {profile.raftName}
            {profile.helpedCount > 0 && ` · helped ${profile.helpedCount} ${profile.helpedCount === 1 ? "raftmate" : "raftmates"} this month`}
          </p>
        </header>

        <section className="card flex flex-col gap-2">
          <h2 className="flex items-center gap-2 font-bold">
            <RaftIcon name="goal" /> {isMe ? "My goal" : `${profile.name}'s goal`}
          </h2>
          {isMe && editing ? (
            <>
              <input
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                maxLength={120}
                placeholder="Make lattes on my own"
                aria-label="My goal"
                className="rounded-2xl border border-line bg-ground p-3 text-[17px]"
              />
              <div className="flex gap-2">
                <Button
                  look="main"
                  onClick={async () => {
                    await api.updateProfile(id, { goal: goal || null });
                    setEditing(false);
                    load();
                  }}
                >
                  Save my goal
                </Button>
                <Button onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </>
          ) : (
            <p className="text-[18px]">{profile.goal?.text ?? (isMe ? "Pick something you want to do on your own." : "No goal yet.")}</p>
          )}
          {isMe && !editing && (
            <button onClick={() => setEditing(true)} className="btn btn--text self-start px-0">
              {profile.goal ? "Change my goal" : "Set my goal"}
            </button>
          )}
        </section>

        <section className="card flex flex-col gap-3">
          <h2 className="font-bold">How {isMe ? "I work" : `${profile.name} works`} best</h2>
          <div className="flex flex-wrap gap-2">
            {(isMe ? workStyles : profile.workStyle).map((style) => {
              const on = profile.workStyle.includes(style);
              return isMe ? (
                <button
                  key={style}
                  onClick={() => toggleStyle(style)}
                  aria-pressed={on}
                  className={`rounded-full px-3.5 py-1.5 text-[15px] font-semibold ${on ? "bg-cel-wash text-cel-deep ring-2 ring-cel-deep" : "bg-clay"}`}
                >
                  {style}
                </button>
              ) : (
                <span key={style} className="rounded-full bg-cel-wash px-3.5 py-1.5 text-[15px] font-semibold text-cel-deep">
                  {style}
                </span>
              );
            })}
            {!isMe && profile.workStyle.length === 0 && <p className="text-ink-3">Not shared yet.</p>}
          </div>
          {isMe && <p className="text-[14px] text-ink-3">Tap the ones that fit you. Your raft and your work card show them.</p>}
        </section>

        <section className="card flex flex-col gap-3">
          <h2 className="flex items-center gap-2 font-bold">
            <RaftIcon name="together" /> {isMe ? "I can help with" : `${profile.name} can help with`}
          </h2>
          <div className="flex flex-wrap gap-2">
            {profile.canHelpWith.length === 0 && <p className="text-ink-3">Nothing yet. It fills in as tasks are done on their own.</p>}
            {profile.canHelpWith.map((task) => (
              <span key={task} className="rounded-full bg-clay px-3.5 py-1.5 text-[15px] font-semibold">
                {task}
              </span>
            ))}
          </div>
        </section>

        {profile.learning.length > 0 && (
          <section className="card flex flex-col gap-3">
            <h2 className="font-bold">Learning now</h2>
            <ul className="flex flex-col gap-2">
              {profile.learning.map((l) => (
                <li key={l.title} className="flex justify-between gap-3">
                  <span>{l.title}</span>
                  <span className="text-ink-3">{STAGES[l.stage - 1].name}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {isMe && (
          <Link href={`/card/${id}`} className="card flex items-center gap-3">
            <RaftIcon name="card" size={28} />
            <span className="flex-1">
              <span className="block font-bold">My work card</span>
              <span className="text-[15px] text-ink-3">A page you can choose to share with a job coach or supervisor</span>
            </span>
          </Link>
        )}
        {message && <p className="text-ink-3">{message}</p>}
      </div>
    </AppShell>
  );
}
