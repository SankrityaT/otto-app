'use client';

/*
 * Written by Havi (@Havishea) for the Otto team, from https://github.com/Havishea/Ayin.
 * We wired it to Otto's tasks instead of mock data, removed plain mode, and made the otter
 * respond: tap it to start talking, and it shows what it's doing while it sits up.
 */
import { useRef, type CSSProperties } from 'react';
import AyinOtter, { type AyinOtterHandle } from '../otter/AyinOtter';
import UprightOtter, { type OtterMood } from '../otter/UprightOtter';
import PondLeaves, { Ripples, type BinItem, type LeafItem } from './PondLeaves';

export type PondStatus = 'idle' | 'listening' | 'thinking';

type Props = {
  motion: 'reactive' | 'idle';
  /** Fur colour as a hue shift in degrees (0 = the painted brown). */
  furHue?: number;
  agentStatus: PondStatus;
  style?: CSSProperties;
  /** Open things float as leaves; finished ones collect in the bin beside the pond. */
  open?: LeafItem[];
  done?: BinItem[];
  onLeafSelect?: (id: string) => void;
  onBin?: () => void;
  /** Sit up (while you ask something or a task is being explained) instead of floating. */
  upright?: boolean;
  /** While sitting up: what Otto is doing, and a beat that changes on every word it says. */
  mood?: OtterMood;
  beat?: number;
  /** Tapping the floating otter: it swings its tail and tilts its head, then this runs. */
  onOtter?: () => void;
};

/**
 * The pond in the middle of the page, with the otter floating in it.
 * The painted ripples around the otter move with it (see the otter engine):
 * a gentle one as it settles into the water, a stronger one when its tail swings.
 * With Reduce Motion, everything is still.
 */
export default function Pond({ motion, furHue = 0, agentStatus, style, open, done, onLeafSelect, onBin, upright = false, mood, beat, onOtter }: Props) {
  const otter = useRef<AyinOtterHandle>(null);

  return (
    <div className={`pond pond--${agentStatus}`} style={style}>
      <svg className="pond__water" viewBox="0 0 400 260" preserveAspectRatio="none" aria-hidden>
        <ellipse cx="200" cy="130" rx="198" ry="128" fill="var(--bank)" />
        <ellipse cx="200" cy="132" rx="184" ry="116" fill="var(--water-edge)" />
        <ellipse cx="200" cy="134" rx="176" ry="109" fill="var(--water)" />
      </svg>
      <div
        className={`pond__center ${upright ? 'is-hidden' : ''} ${onOtter ? 'is-tappable' : ''}`}
        onClick={() => {
          otter.current?.swingTail();
          otter.current?.tiltHead();
          onOtter?.();
        }}
      >
        <AyinOtter
          ref={otter}
          motion={motion}
          furHue={furHue}
          size="100%"
          alt="Your otter, floating in the pond with a celadon stone."
        />
      </div>
      {/* The otter sits up while you ask or while it explains a task, and floats again after. */}
      <div className={`pond__upright ${upright ? 'is-shown' : ''}`} aria-hidden={!upright}>
        <Ripples className="pond__upright-ripples" />
        <UprightOtter className="pond__upright-otter" furHue={furHue} active={upright} mood={mood} beat={beat} />
        {upright && <span className="sr-only">Your otter sits up to talk with you.</span>}
      </div>
      {open && done && <PondLeaves open={open} done={done} onSelect={onLeafSelect} onBin={onBin} />}
      <span className="sr-only" aria-live="polite">
        {agentStatus === 'listening' ? 'Listening' : agentStatus === 'thinking' ? 'Thinking' : ''}
      </span>
    </div>
  );
}

