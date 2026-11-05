"use client";

import { useState } from "react";
import UprightOtter from "./otter/UprightOtter";

/**
 * The picture for one step. The first time a step is shown, Claude draws it, which
 * takes a few seconds, so the otter waits with the student until it arrives.
 */
export function StepPicture({ stepId, alt, shown, furHue }: { stepId: string; alt: string; shown: boolean; furHue: number }) {
  const [state, setState] = useState<{ stepId: string; status: "loading" | "ready" | "missing" }>({
    stepId,
    status: "loading",
  });
  const status = state.stepId === stepId ? state.status : "loading";

  if (!shown) {
    return (
      <Frame>
        <UprightOtter className="h-40 w-40" furHue={furHue} active={false} />
        <p className="text-ink-3">The picture is resting. Tap Show me to see it.</p>
      </Frame>
    );
  }

  return (
    <Frame>
      {status !== "ready" && (
        <div className="flex flex-col items-center gap-2">
          <UprightOtter className="h-40 w-40" furHue={furHue} active={status === "loading"} />
          <p className="text-ink-3">{status === "loading" ? "Ayin is drawing this step" : "No picture for this step"}</p>
        </div>
      )}
      {status !== "missing" && (
        // eslint-disable-next-line @next/next/no-img-element -- an SVG drawn per step and served by our API
        <img
          key={stepId}
          src={`/api/steps/${stepId}/picture`}
          alt={alt}
          onLoad={() => setState({ stepId, status: "ready" })}
          onError={() => setState({ stepId, status: "missing" })}
          className={status === "ready" ? "h-full w-full object-contain" : "hidden"}
        />
      )}
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-[var(--radius-card)] border border-line bg-[#fbf8f2] text-center text-[#6b6359]">
      {children}
    </div>
  );
}
