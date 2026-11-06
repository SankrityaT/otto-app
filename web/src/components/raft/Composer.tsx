"use client";

import { useState } from "react";
import type { PostKind } from "@/lib/data/raft";
import { api, type PostReview } from "@/lib/client/api";
import { shrinkPhoto } from "@/lib/client/photo";
import { Button } from "../Button";
import { RaftIcon } from "./Stickers";

/**
 * Share a win or ask the raft for help. Otto checks the post before anyone sees it. If
 * something might hurt or isn't safe, it explains why and offers a kinder way to say it.
 */
export function Composer({
  authorId,
  startKind,
  step,
  onClose,
  onShared,
}: {
  authorId: string;
  startKind: PostKind;
  step?: { id: string; text: string } | null;
  onClose: () => void;
  onShared: () => void;
}) {
  const [kind, setKind] = useState<PostKind>(startKind);
  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [review, setReview] = useState<PostReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function share(text = body) {
    setBusy(true);
    setError(null);
    try {
      const result = await api.share({ authorId, kind, body: text, photo, stepId: step?.id ?? null });
      if (result.shared) onShared();
      else setReview(result.review ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center" role="dialog" aria-modal aria-label="New post">
      <div className="flex max-h-[92svh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-[28px] bg-ground p-5 sm:rounded-[28px]">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[30px] leading-none">{kind === "win" ? "Share a win" : "Ask for help"}</h2>
          <button onClick={onClose} className="text-[16px] font-semibold text-ink-2">
            Cancel
          </button>
        </div>

        <div className="flex rounded-full bg-clay p-1" role="radiogroup" aria-label="What kind of post">
          {(
            [
              ["win", "Share a win"],
              ["ask", "Ask for help"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              role="radio"
              aria-checked={kind === value}
              onClick={() => setKind(value)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2 font-semibold ${kind === value ? "bg-card" : "text-ink-2"}`}
            >
              <RaftIcon name={value === "win" ? "win" : "help"} size={18} /> {label}
            </button>
          ))}
        </div>

        {step && (
          <p className="rounded-2xl bg-card px-4 py-2 text-[15px] text-ink-2">
            About the step: <strong className="text-ink">{step.text}</strong>
          </p>
        )}

        <label className="sr-only" htmlFor="post-body">
          {kind === "win" ? "What did you do?" : "What do you need help with?"}
        </label>
        <textarea
          id="post-body"
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setReview(null);
          }}
          rows={4}
          maxLength={500}
          placeholder={kind === "win" ? "What did you do? It can be small." : "What's tricky? Say it however you like."}
          className="rounded-2xl border border-line bg-card p-4 text-[18px] placeholder:text-ink-3"
        />

        {photo ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- a local preview before sharing */}
            <img src={photo} alt="Your photo" className="max-h-56 w-full rounded-2xl object-cover" />
            <button onClick={() => setPhoto(null)} className="absolute right-2 top-2 rounded-full bg-card px-3 py-1 text-[14px] font-semibold">
              Remove
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer items-center gap-2 self-start rounded-full border border-line px-4 py-2 font-semibold text-ink-2">
            <RaftIcon name="photo" size={20} /> Add a photo of your work
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) setPhoto(await shrinkPhoto(file).catch(() => null));
              }}
            />
          </label>
        )}
        <p className="text-[14px] text-ink-3">Photos of the work, not of people. Only your raft will see this.</p>

        {review && (
          <section className="flex flex-col gap-2 rounded-2xl border border-[#e8c547] bg-[#fbf1c7] p-4 text-[#1f1c18]">
            <p className="text-[16px]">
              <strong>Before you share:</strong> {review.why}
            </p>
            {review.kinderVersion && (
              <>
                <p className="text-[16px]">
                  Try: <em>&ldquo;{review.kinderVersion}&rdquo;</em>
                </p>
                <div className="flex gap-2">
                  <Button
                    look="main"
                    disabled={busy}
                    onClick={() => {
                      setBody(review.kinderVersion!);
                      share(review.kinderVersion!);
                    }}
                  >
                    Use that
                  </Button>
                  <Button onClick={() => setReview(null)}>Change it myself</Button>
                </div>
              </>
            )}
          </section>
        )}

        {error && <p className="text-ink-2">{error}</p>}

        {!review && (
          <Button look="main" className="h-14" disabled={busy || !body.trim()} onClick={() => share()}>
            {busy ? "Otto is checking it" : kind === "win" ? "Share with my raft" : "Ask my raft"}
          </Button>
        )}
        <p className="text-center text-[14px] text-ink-3">Otto checks every post to keep the raft kind and safe.</p>
      </div>
    </div>
  );
}
