"use client";

import type { ReactNode, Ref } from "react";
import { OtterView } from "./OtterView";

/**
 * What Otto sees, big and always on screen, so the student never has to trust a camera they
 * can't see: this device's camera, a shared screen, or the otter's. The ring lights up while
 * Otto is looking, and `note` says when it looks (or holds a button, like sharing a screen).
 */
export function OttoSees({
  videoRef,
  otter,
  looking,
  note,
  className = "",
}: {
  videoRef: Ref<HTMLVideoElement>;
  otter: boolean;
  looking: boolean;
  note?: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label="What Otto sees"
      className={`relative w-full overflow-hidden rounded-[var(--radius-card)] bg-clay ring-4 transition-shadow ${looking ? "ring-cel" : "ring-transparent"} ${className}`}
    >
      {otter ? <OtterView /> : <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />}
      <p className="absolute left-3 top-3 rounded-full bg-card/90 px-3 py-1 text-[14px] font-semibold text-ink">
        {looking ? "Otto is looking" : "What Otto sees"}
      </p>
      {note && (
        <div className="absolute inset-x-3 bottom-3 flex justify-center">
          <div className="rounded-full bg-card/90 px-3 py-1 text-center text-[14px] text-ink-2">{note}</div>
        </div>
      )}
    </section>
  );
}

/**
 * A task screen with what Otto sees, big: beside the task on a laptop or tablet, above it on a
 * phone. `fixed` keeps everything on one screen (no scrolling), for the Watch stage.
 */
export function WithEyes({ eyes, fixed = false, children }: { eyes: ReactNode; fixed?: boolean; children: ReactNode }) {
  return (
    <div
      className={`mx-auto flex w-full max-w-md flex-col md:max-w-6xl md:flex-row md:items-start md:gap-8 md:px-8 md:py-5 ${fixed ? "h-dvh" : "min-h-dvh"}`}
    >
      <div className="shrink-0 px-5 pt-5 md:sticky md:top-5 md:w-[55%] md:px-0 md:pt-0">{eyes}</div>
      {children}
    </div>
  );
}
