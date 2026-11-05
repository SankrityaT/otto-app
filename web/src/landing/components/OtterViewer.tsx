"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Hand } from "lucide-react";

// three.js and the model only load when this section comes near the screen.
const OtterModel3D = dynamic(() => import("./OtterModel3D").then((m) => m.OtterModel3D), { ssr: false });

/** A card holding the 3D otter, with a friendly line while the model loads. */
export function OtterViewer() {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="card relative aspect-square cursor-grab overflow-hidden bg-[radial-gradient(circle_at_50%_40%,var(--surface),var(--clay))] p-0 active:cursor-grabbing">
      {!ready && (
        <p className="absolute inset-0 grid place-items-center font-hand text-[22px] text-ink-3" aria-hidden>
          Waking the otter up...
        </p>
      )}
      {near && <OtterModel3D onReady={() => setReady(true)} />}
      <span className="pointer-events-none absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-card/90 px-4 py-2 text-[15px] font-semibold text-ink-2 shadow-[0_0_0_1px_var(--line)]">
        <Hand className="size-4" aria-hidden />
        Drag to spin me around
      </span>
    </div>
  );
}
