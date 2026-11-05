'use client';

/*
 * Written by Havi (@Havishea) for the Ayin team, from https://github.com/Havishea/Ayin.
 * We use Ayin's tasks for the leaves and label the bin "Done this week".
 */
import { useEffect, useState } from 'react';
/** A task floating in the pond. `tone` picks one of the pond's leaf colours. */
export type LeafItem = { id: string; title: string; line: string; tone: LeafTone };
export const LEAF_TONES = ['home', 'study', 'errands', 'health', 'care', 'people', 'work', 'money'] as const;
export type LeafTone = (typeof LEAF_TONES)[number];

/**
 * Open tasks float in the pond as leaves, each in its routine colour.
 * Hover (or focus) a leaf to see the task; click it to bring that card to the top.
 * When a task is done its leaf drifts over to the bin at the side of the pond.
 * A task you let go of just sinks away. With Reduce Motion the leaves hold still.
 */

/** Where leaves rest, as % of the pond box. They stay clear of the otter in the middle. */
const SLOTS: [number, number][] = [
  [5, 28], [95, 12], [5, 74], [17, 97], [40, 101], [64, 101], [94, 92], [26, 2], [76, 0], [4, 51],
];
/** The bin sits on the right edge of the pond. */
const BIN: [number, number] = [105, 56];
const LEAVE_MS = 1000;

type Leaf = { thing: LeafItem; slot: number; leaving?: 'bin' | 'away' };

function slotPos(slot: number): [number, number] {
  const [x, y] = SLOTS[slot % SLOTS.length];
  const lap = Math.floor(slot / SLOTS.length);
  return [x + lap * 5, y - lap * 6];
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

export default function PondLeaves({ open, done, onSelect, onBin }: { open: LeafItem[]; done: LeafItem[]; onSelect?: (id: string) => void; onBin?: () => void }) {
  const [leaves, setLeaves] = useState<Leaf[]>(() => open.map((thing, slot) => ({ thing, slot })));
  const [binBump, setBinBump] = useState(0);

  // Keep the leaves in step with the open list: new tasks get the first free spot,
  // finished ones head for the bin, let-go ones sink.
  useEffect(() => {
    setLeaves((prev) => {
      const doneIds = new Set(done.map((t) => t.id));
      const next: Leaf[] = prev.map((l) => {
        const still = open.find((t) => t.id === l.thing.id);
        if (still) return { ...l, thing: still, leaving: undefined };
        return l.leaving ? l : { ...l, leaving: doneIds.has(l.thing.id) ? 'bin' : 'away' };
      });
      const used = new Set(next.map((l) => l.slot));
      for (const t of open) {
        if (next.some((l) => l.thing.id === t.id)) continue;
        let s = 0;
        while (used.has(s)) s++;
        used.add(s);
        next.push({ thing: t, slot: s });
      }
      return next;
    });
  }, [open, done]);

  // Once a leaf has reached the bin (or sunk), take it out.
  const leaving = leaves.some((l) => l.leaving);
  useEffect(() => {
    if (!leaving) return;
    const id = setTimeout(() => {
      setLeaves((p) => {
        if (p.some((l) => l.leaving === 'bin')) setBinBump((b) => b + 1);
        return p.filter((l) => !l.leaving);
      });
    }, LEAVE_MS);
    return () => clearTimeout(id);
  }, [leaving]);

  return (
    <>
      <ul className="leaves" aria-label="Open tasks in the pond">
        {leaves.map((l) => {
          const [x, y] = l.leaving === 'bin' ? BIN : slotPos(l.slot);
          const t = l.thing;
          return (
            <li
              key={t.id}
              className={`leaf routine--${t.tone} ${l.leaving ? `is-${l.leaving}` : ''} ${x > 55 ? 'leaf--tip-left' : ''} ${y < 30 ? 'leaf--tip-below' : ''}`}
              style={{ left: `${x}%`, top: `${y}%`, ['--drift' as string]: `${15 + ((l.slot * 7) % 9)}s`, ['--delay' as string]: `${-((l.slot * 3.7) % 12)}s`, ['--tilt' as string]: `${((l.slot * 47) % 70) - 35}deg` }}
            >
              <Ripples className="leaf__ripples" />
              <button
                className="leaf__btn"
                aria-label={`${t.title}. ${t.line}`}
                tabIndex={l.leaving ? -1 : 0}
                onClick={() => onSelect?.(t.id)}
              >
                <span className="leaf__float">
                  <LeafShape className="leaf__svg" />
                </span>
              </button>
              <span className="leaf__tip" aria-hidden>
                <strong className="leaf__title">{t.title}</strong>
                <span className="leaf__line">{t.line}</span>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="bin" style={{ left: `${BIN[0]}%`, top: `${BIN[1]}%` }}>
        <Ripples className="bin__ripples" />
        <button className="bin__btn" onClick={onBin} aria-label={`Done this week: ${done.length} ${done.length === 1 ? 'task' : 'tasks'}`}>
          <span key={binBump} className={`bin__body ${binBump ? 'is-bumped' : ''}`}>
            <span className="bin__pile" aria-hidden>
              {done.slice(0, 5).map((t, k) => (
                <span key={t.id} className={`bin__leaf routine--${t.tone}`} style={{ ['--k' as string]: k }}>
                  <LeafShape />
                </span>
              ))}
            </span>
            <svg className="bin__basket" viewBox="0 0 56 44" aria-hidden>
              <path className="bin__rim" d="M4 10h48l-2 6H6z" />
              <path className="bin__side" d="M7 16h42l-5 24a4 4 0 0 1-4 3H16a4 4 0 0 1-4-3z" />
              <path className="bin__weave" d="M10 24h36M12 32h32M20 16l2 26M28 16v26M36 16l-2 26" />
            </svg>
            <span className="bin__count" aria-hidden>{done.length}</span>
          </span>
        </button>
        <span className="bin__tip" aria-hidden>
          <strong>Done this week</strong>
          {done.length === 0 ? <span className="leaf__line">Nothing yet</span> : done.slice(0, 4).map((t) => <span key={t.id} className="leaf__line">{t.title}</span>)}
          {done.length > 4 && <span className="leaf__line">and {done.length - 4} more</span>}
        </span>
      </div>
    </>
  );
}
