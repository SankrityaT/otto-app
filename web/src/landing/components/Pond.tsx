"use client";

import { forwardRef, type CSSProperties } from "react";
import AyinOtter, { type AyinOtterHandle } from "@/components/otter/AyinOtter";

/** A wavy ellipse line, like the painted ripples under the otter (from Havi's PondLeaves). */
function wavyRing(rx: number, ry: number, waves: number, amp: number, phase: number) {
  const pts: string[] = [];
  const n = 72;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const w = 1 + amp * Math.sin(a * waves + phase);
    pts.push(`${(50 + Math.cos(a) * rx * w).toFixed(2)},${(20 + Math.sin(a) * ry * w).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}
const RINGS = [wavyRing(40, 13, 5, 0.045, 0), wavyRing(40, 13, 4, 0.05, 1.7)];

/** Two small rings that spread out and fade, one after the other. */
export function Ripples({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 40" aria-hidden>
      {RINGS.map((d, k) => (
        <path key={k} className="ripples__ring" d={d} style={{ ["--k" as string]: k }} />
      ))}
    </svg>
  );
}

/** Havi's pond with the otter floating in it. */
export const Pond = forwardRef<AyinOtterHandle, { furHue?: number; className?: string; style?: CSSProperties; alt?: string }>(
  function Pond({ furHue = 0, className = "", style, alt }, ref) {
    return (
      <div className={`pond ${className}`} style={style}>
        <svg className="pond__water" viewBox="0 0 400 260" preserveAspectRatio="none" aria-hidden>
          <ellipse cx="200" cy="130" rx="198" ry="128" fill="var(--bank)" />
          <ellipse cx="200" cy="132" rx="184" ry="116" fill="var(--water-edge)" />
          <ellipse cx="200" cy="134" rx="176" ry="109" fill="var(--water)" />
        </svg>
        <Ripples className="pond__ripples" />
        <div className="pond__otter">
          <AyinOtter ref={ref} size="100%" furHue={furHue} alt={alt} />
        </div>
      </div>
    );
  },
);
