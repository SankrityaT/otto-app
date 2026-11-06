"use client";

import Link from "next/link";
import type { Post } from "@/lib/data/raft";
import { REACTIONS } from "@/lib/raftWords";
import { OtterAvatar } from "./OtterAvatar";
import { RaftIcon, REACTION_WORDS, Sticker } from "./Stickers";
import { whenWords } from "./when";

/**
 * One post in the raft: a win to cheer, or a question to help with. Reactions show who
 * reacted, never a count to compete over.
 */
export function PostCard({
  post,
  viewerId,
  onReact,
  onReport,
  linkToThread = true,
}: {
  post: Post;
  viewerId: string;
  onReact: (kind: Post["reactions"][number]["kind"]) => void;
  onReport: () => void;
  linkToThread?: boolean;
}) {
  const asking = post.kind === "ask";
  const mine = post.author.id === viewerId;

  return (
    <article
      className={`flex flex-col gap-3 rounded-[var(--radius-card)] border p-4 ${
        asking ? "border-[#e8c547] bg-[#fbf1c7] text-[#1f1c18]" : "border-line bg-card"
      }`}
    >
      <header className="flex items-center gap-3">
        <Link href={`/raft/people/${post.author.id}`}>
          <OtterAvatar furHue={post.author.furHue} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="font-bold leading-tight">
            {mine ? "You" : post.author.name}
            {asking && <span className="font-normal"> asked for help</span>}
          </p>
          <p className="truncate text-[14px] opacity-70">
            {whenWords(post.createdAt)}
            {post.step ? ` · ${post.step.text}` : post.taskTitle ? ` · ${post.taskTitle}` : ""}
          </p>
        </div>
        {!mine && (
          <button onClick={onReport} className="rounded-full p-2 opacity-50 hover:opacity-100" aria-label="Report this post to staff">
            <RaftIcon name="report" size={18} />
          </button>
        )}
      </header>

      <p className="text-[18px] leading-snug">{post.body}</p>

      {post.photo && (
        // eslint-disable-next-line @next/next/no-img-element -- a photo a student chose to share, stored as a data URL
        <img src={post.photo} alt={`Photo shared by ${post.author.name}`} className="max-h-72 w-full rounded-2xl object-cover" />
      )}

      {asking && post.helped && (
        <p className="self-start rounded-full bg-cel-wash px-3 py-1 text-[14px] font-semibold text-cel-deep">Someone helped</p>
      )}

      {asking && post.youKnowThis && !mine && (
        <div className="flex items-center gap-3 rounded-2xl bg-[#fffcf7] px-3 py-2">
          <RaftIcon name="together" />
          <span className="flex-1 text-[15px]">You&apos;ve done this step on your own. You know this one!</span>
        </div>
      )}

      <footer className="flex flex-wrap items-center gap-2">
        {REACTIONS.map((kind) => {
          const reaction = post.reactions.find((r) => r.kind === kind);
          return (
            <button
              key={kind}
              onClick={() => onReact(kind)}
              aria-pressed={reaction?.mine ?? false}
              className={`flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-[14px] font-semibold ${
                reaction?.mine ? "border-cel-deep bg-cel-wash text-cel-deep" : "border-line bg-[#fffcf7] text-[#48423b]"
              }`}
            >
              <Sticker kind={kind} size={26} />
              {reaction ? reaction.names.join(", ") : REACTION_WORDS[kind]}
            </button>
          );
        })}
        {linkToThread && (
          <Link
            href={`/raft/post/${post.id}`}
            className={`ml-auto rounded-full px-4 py-2 text-[15px] font-bold ${asking ? "bg-[#1f1c18] text-[#fffcf7]" : "text-cel-deep"}`}
          >
            {asking ? (post.replyCount ? `${post.replyCount} answers · Help` : "Help") : post.replyCount ? `${post.replyCount} replies` : "Reply"}
          </Link>
        )}
      </footer>
    </article>
  );
}
