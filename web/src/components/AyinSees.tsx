"use client";

import type { Ref } from "react";
import { OtterView } from "./OtterView";

/**
 * What Ayin sees, always on screen, so the student never has to trust a camera they can't see:
 * this device's camera, or the otter's. The ring lights up while Ayin is looking.
 */
export function AyinSees({
  videoRef,
  otter,
  looking,
  className = "",
}: {
  videoRef: Ref<HTMLVideoElement>;
  otter: boolean;
  looking: boolean;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-xl bg-clay ring-4 transition-shadow ${looking ? "ring-cel" : "ring-transparent"} ${className}`}>
      {otter ? <OtterView /> : <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />}
    </div>
  );
}
