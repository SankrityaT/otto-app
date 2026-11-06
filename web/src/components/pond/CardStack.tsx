'use client';

/*
 * Written by Havi (@Havishea) for the Otto team, from https://github.com/Havishea/Ayin.
 * We use Otto's tasks and reminders for the cards.
 */
import { useLayoutEffect, useRef, useState } from 'react';
import type { ThingAction } from '@/lib/client/api';
import type { Thing } from '@/lib/today';
import FocusCard from './FocusCard';

type Props = {
  open: Thing[];
  index: number;
  onNext: () => void;
  onPrimary: (thing: Thing) => void;
  act: (thing: Thing, action: ThingAction, line: string) => void;
};

/** How many cards show behind the top one before the rest are summed up as "+N". */
const MAX_VISIBLE = 4;
const MOVE_MS = 560;

/**
 * The open things as a stack of same-size cards. The top card is the one to act on;
 * the others sit behind it, each peeking out a little, so you can see how many are left.
 *
 * Next: the top card slides out to the side, tucks in behind the others and settles at
 * the back while the rest move up. Done, Later or Not now: the card slides away and the
 * one underneath moves up into its place.
 */
export default function CardStack({ open, index, onNext, onPrimary, act }: Props) {
  // Order the stack from the current card round to the one before it.
  const order = open.length ? [...open.slice(index), ...open.slice(0, index)] : [];
  const current = order[0];

  const prevTop = useRef<Thing | undefined>(current);
  const [cycling, setCycling] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<{ thing: Thing; key: number } | null>(null);
  const n = useRef(0);

  // Layout effect: the move starts in the same frame as the change, so nothing jumps first.
  useLayoutEffect(() => {
    const before = prevTop.current;
    prevTop.current = current;
    if (!before || (current && before.id === current.id && before.later === current.later)) return;
    const still = open.find((t) => t.id === before.id);
    if (still && still.later === before.later) {
      // Moved to the back with Next.
      setCycling(before.id);
      const t = setTimeout(() => setCycling(null), MOVE_MS);
      return () => clearTimeout(t);
    }
    // Done, let go, or put off: it leaves the top of the stack.
    setLeaving({ thing: before, key: ++n.current });
    const t = setTimeout(() => setLeaving(null), MOVE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, current?.later]);

  if (!current && !leaving) {
    return (
      <section className="card card--empty">
        <p className="card__title">Nothing is open.</p>
        <p className="card__line">Tell Otto what you want to do, and it will keep it here.</p>
      </section>
    );
  }

  const visible = Math.min(order.length, MAX_VISIBLE);
  const extra = order.length - visible;

  return (
    <div className="stack" style={{ ['--depth' as string]: Math.max(0, visible - 1) }}>
      {order.map((t, pos) => (
        <div
          key={t.id}
          className={`stack__card ${pos === 0 ? 'is-top' : ''} ${pos >= MAX_VISIBLE ? 'is-hidden' : ''} ${cycling === t.id ? 'is-cycling' : ''}`}
          style={{ ['--pos' as string]: Math.min(pos, MAX_VISIBLE - 1) }}
          inert={pos !== 0}
          aria-hidden={pos !== 0}
        >
          <FocusCard thing={t} total={order.length} onNext={onNext} onPrimary={onPrimary} act={act} />
        </div>
      ))}
      {leaving && (
        <div key={leaving.key} className="stack__card is-leaving" style={{ ['--pos' as string]: 0 }} inert aria-hidden>
          <FocusCard thing={leaving.thing} total={1} onNext={() => {}} onPrimary={() => {}} act={() => {}} />
        </div>
      )}
      {extra > 0 && <p className="stack__more">+{extra} more underneath</p>}
    </div>
  );
}
