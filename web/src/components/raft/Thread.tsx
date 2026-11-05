"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Post, Reply } from "@/lib/data/raft";
import { api, type PostReview } from "@/lib/client/api";
import { useStudentId } from "@/lib/client/settings";
import { AppShell } from "../AppShell";
import { Button } from "../Button";
import { OtterAvatar } from "./OtterAvatar";
import { PostCard } from "./PostCard";
import { RaftIcon } from "./Stickers";
import { whenWords } from "./when";

/** Ways to start a reply, for anyone who'd rather not start from a blank box. */
const STARTERS = ["Try this: ", "I can show you in person.", "It took me a few tries too.", "You've got this!"];

/** A post with its replies: where raftmates help each other. */
export function Thread() {
  const { id } = useParams<{ id: string }>();
  const [studentId] = useStudentId();
  const [data, setData] = useState<{ post: Post; replies: Reply[] } | null>(null);
  const [text, setText] = useState("");
  const [review, setReview] = useState<PostReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(() => {
    if (studentId) api.post(id, studentId).then(setData).catch((e) => setMessage(e.message));
  }, [id, studentId]);

  useEffect(() => {
    load();
  }, [load]);

  async function send(body = text) {
    if (!studentId || !body.trim()) return;
    setBusy(true);
    try {
      const result = await api.reply(id, studentId, body);
      if (result.shared) {
        setText("");
        setReview(null);
        load();
      } else setReview(result.review ?? null);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!data || !studentId) {
    return (
      <AppShell>
        <p className="page pt-10 text-center">{message ?? "Loading"}</p>
      </AppShell>
    );
  }

  const { post, replies } = data;
  const asker = post.author.id === studentId;

  return (
    <AppShell>
      <div className="page flex flex-col gap-4 pb-10">
        <Link href="/raft" className="btn btn--text self-start px-0">
          Back to the raft
        </Link>
        <PostCard
          post={post}
          viewerId={studentId}
          linkToThread={false}
          onReact={(kind) => api.react(post.id, studentId, kind).then(load)}
          onReport={() => api.report(post.id, studentId).then(() => setMessage("Thanks. Staff will look at it."))}
        />

        <ol className="flex flex-col gap-3">
          {replies.map((reply) => (
            <li key={reply.id} className="flex gap-3">
              <OtterAvatar furHue={reply.author.furHue} size={40} />
              <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-2xl bg-card p-3">
                <p className="text-[15px]">
                  <strong>{reply.author.id === studentId ? "You" : reply.author.name}</strong>
                  <span className="text-ink-3">
                    {" "}
                    · {whenWords(reply.createdAt)}
                    {reply.timesOnOwn > 0 && ` · did this step on their own ${reply.timesOnOwn} ${reply.timesOnOwn === 1 ? "time" : "times"}`}
                  </span>
                </p>
                <p className="text-[17px] leading-snug">{reply.body}</p>
                {reply.helped ? (
                  <p className="self-start rounded-full bg-cel-wash px-3 py-1 text-[14px] font-semibold text-cel-deep">
                    This helped {post.author.name}
                  </p>
                ) : (
                  asker &&
                  post.kind === "ask" && (
                    <button
                      onClick={() => api.markHelped(reply.id, studentId).then(load)}
                      className="self-start rounded-full border border-line px-3 py-1 text-[14px] font-semibold"
                    >
                      This helped
                    </button>
                  )
                )}
              </div>
            </li>
          ))}
        </ol>

        <section className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-dashed border-line p-4">
          <p className="font-semibold">{post.kind === "ask" && !asker ? `Help ${post.author.name}` : "Reply"}</p>
          <div className="flex flex-wrap gap-2">
            {STARTERS.map((starter) => (
              <button key={starter} onClick={() => setText(starter)} className="rounded-full bg-clay px-3 py-1.5 text-[15px] font-semibold">
                {starter.trim()}
              </button>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setReview(null);
            }}
            rows={3}
            maxLength={400}
            aria-label="Your reply"
            placeholder="Say it your way"
            className="rounded-2xl border border-line bg-card p-3 text-[17px] placeholder:text-ink-3"
          />
          {review && (
            <div className="flex flex-col gap-2 rounded-2xl border border-[#e8c547] bg-[#fbf1c7] p-3 text-[#1f1c18]">
              <p>
                <strong>Before you send:</strong> {review.why}
              </p>
              {review.kinderVersion && (
                <div className="flex flex-wrap gap-2">
                  <Button look="main" onClick={() => send(review.kinderVersion!)}>
                    Send &ldquo;{review.kinderVersion}&rdquo;
                  </Button>
                  <Button onClick={() => setReview(null)}>Change it myself</Button>
                </div>
              )}
            </div>
          )}
          {!review && (
            <Button look="main" disabled={busy || !text.trim()} onClick={() => send()}>
              <RaftIcon name="help" /> {busy ? "Ayin is checking it" : "Send"}
            </Button>
          )}
        </section>
        {message && <p className="text-ink-3">{message}</p>}
      </div>
    </AppShell>
  );
}
