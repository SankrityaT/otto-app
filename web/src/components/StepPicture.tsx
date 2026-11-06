"use client";

import { useState } from "react";
import UprightOtter from "./otter/UprightOtter";

/**
 * The diagram for one step. Diagrams are drawn when a task is made, so they're usually ready;
 * if one is still being drawn, the step is explained in words until it arrives.
 * `fill` makes it fill its space instead of keeping a 4:3 shape.
 */
export function StepPicture({
  stepId,
  alt,
  shown,
  furHue,
  fill = false,
}: {
  stepId: string;
  alt: string;
  shown: boolean;
  furHue: number;
  fill?: boolean;
}) {
  const [state, setState] = useState<{ stepId: string; status: "loading" | "ready" | "missing" }>({
    stepId,
    status: "loading",
  });
  const status = state.stepId === stepId ? state.status : "loading";

  if (!shown) {
    return (
      <Frame fill={fill}>
        <UprightOtter className="h-40 w-40" furHue={furHue} active={false} />
        <p className="text-ink-3">The picture is resting. Tap Show me to see it.</p>
      </Frame>
    );
  }

  return (
    <Frame fill={fill}>
      {status !== "ready" && (
        <div className="flex flex-col items-center gap-2 px-6">
          <UprightOtter className="h-28 w-28" furHue={furHue} active={status === "loading"} />
          <p className="text-[18px] text-[#3a342d]">{alt}</p>
          {status === "loading" && <p className="text-[14px]">Ayin is drawing this step</p>}
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

function Frame({ children, fill = false }: { children: React.ReactNode; fill?: boolean }) {
  return (
    <div className={`flex w-full flex-col ${fill ? "h-full" : "aspect-[4/3]"} items-center justify-center gap-2 overflow-hidden rounded-[var(--radius-card)] border border-line bg-[#fbf8f2] text-center text-[#6b6359]`}>
      {children}
    </div>
  );
}
