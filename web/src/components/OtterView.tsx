"use client";

import { useEffect, useState } from "react";

/** How often the preview from the otter's camera refreshes. */
const REFRESH_MS = 3000;

/** A live-ish preview from the otter's camera: a fresh photo every few seconds. */
export function OtterView() {
  const [tick, setTick] = useState(0);
  const [reachable, setReachable] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  if (!reachable) {
    return <p className="grid h-full place-items-center p-2 text-center text-[12px] text-ink-3">Can&apos;t reach the otter</p>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a camera frame, not a static asset
    <img src={`/api/otter/photo?frame=${tick}`} alt="What the otter's camera sees" onError={() => setReachable(false)} className="h-full w-full object-cover" />
  );
}
