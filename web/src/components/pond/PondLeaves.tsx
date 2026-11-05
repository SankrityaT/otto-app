'use client';

/*
 * Written by Havi (@Havishea) for the Ayin team, from https://github.com/Havishea/Ayin.
 * We kept the leaf, its colours and the ripples; Today lists tasks as leaves under the pond.
 */
/** The pond's leaf colours. Each task keeps one colour. */
export const LEAF_TONES = ['home', 'study', 'errands', 'health', 'care', 'people', 'work', 'money'] as const;
export type LeafTone = (typeof LEAF_TONES)[number];

/** Each task keeps the same leaf colour every time, picked from its id. */
export function toneFor(id: string): LeafTone {
  const sum = [...id].reduce((total, char) => total + char.charCodeAt(0), 0);
  return LEAF_TONES[sum % LEAF_TONES.length];
}

/** A wavy ellipse line, like the ripples under the otter but small. */
function wavyRing(rx: number, ry: number, waves: number, amp: number, phase: number) {
  const pts: string[] = [];
  const n = 72;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const w = 1 + amp * Math.sin(a * waves + phase);
    pts.push(`${(50 + Math.cos(a) * rx * w).toFixed(2)},${(20 + Math.sin(a) * ry * w).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}
const RINGS = [wavyRing(40, 13, 5, 0.045, 0), wavyRing(40, 13, 4, 0.05, 1.7)];

/** Two small rings that spread out and fade under a leaf or the bin, one after the other. */
export function Ripples({ className = '' }: { className?: string }) {
  return (
    <svg className={`ripples ${className}`} viewBox="0 0 100 40" aria-hidden>
      {RINGS.map((d, k) => (
        <path key={k} className="ripples__ring" d={d} style={{ ['--k' as string]: k }} />
      ))}
    </svg>
  );
}

export function LeafShape({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden>
      <path className="leaf__blade" d="M7 41C6 25 14 9 41 6c2 19-9 34-34 35z" />
      <path className="leaf__vein" d="M8 40C17 30 25 21 37 10M17 31l-1-8M24 24l7 1M24 24l-1-8M17 31l7 1" />
    </svg>
  );
}
