'use client';

/*
 * Written by Havi (@Havishea) for the Ayin team, from https://github.com/Havishea/Ayin.
 * We wired it to Ayin's tasks instead of mock data and removed plain mode.
 */
import { forwardRef, useImperativeHandle, useRef, type CSSProperties } from 'react';
import AyinOtter, { type AyinOtterHandle } from '../otter/AyinOtter';
import UprightOtter from '../otter/UprightOtter';
import PondLeaves, { Ripples, type LeafItem } from './PondLeaves';

export type OtterReaction = 'listen' | 'acknowledge' | 'happy' | 'curious' | 'none';
export type PondStatus = 'idle' | 'listening' | 'thinking';

export type PondHandle = { react: (r: OtterReaction) => void };

type Props = {
  motion: 'reactive' | 'idle';
  /** Fur colour as a hue shift in degrees (0 = the painted brown). */
  furHue?: number;
  agentStatus: PondStatus;
  style?: CSSProperties;
  /** Tasks to practise float as leaves; finished ones collect in the bin beside the pond. */
  open?: LeafItem[];
  done?: LeafItem[];
  onLeafSelect?: (id: string) => void;
  onBin?: () => void;
  /** Sit up (while you ask something or a task is being explained) instead of floating. */
  upright?: boolean;
};

/**
 * The pond in the middle of the page, with the otter floating in it.
 * The painted ripples around the otter move with it (see the otter engine):
 * a gentle one as it settles into the water, a stronger one when its tail swings.
 * With Reduce Motion, everything is still.
 */
const Pond = forwardRef<PondHandle, Props>(function Pond({ motion, furHue = 0, agentStatus, style, open, done, onLeafSelect, onBin, upright = false }, ref) {
  const otter = useRef<AyinOtterHandle>(null);

  useImperativeHandle(ref, () => ({
    react(r) {
      if (upright) return;
      switch (r) {
        case 'listen':
        case 'curious':
          otter.current?.tiltHead();
          break;
        case 'acknowledge':
          otter.current?.blink();
          break;
        case 'happy':
          otter.current?.swingTail();
          break;
        default:
          break;
      }
    },
  }), [upright]);

  return (
    <div className={`pond pond--${agentStatus}`} style={style}>
      <svg className="pond__water" viewBox="0 0 400 260" preserveAspectRatio="none" aria-hidden>
        <ellipse cx="200" cy="130" rx="198" ry="128" fill="var(--bank)" />
        <ellipse cx="200" cy="132" rx="184" ry="116" fill="var(--water-edge)" />
        <ellipse cx="200" cy="134" rx="176" ry="109" fill="var(--water)" />
      </svg>
      <div className={`pond__center ${upright ? 'is-hidden' : ''}`}>
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
        <UprightOtter className="pond__upright-otter" furHue={furHue} active={upright} />
        {upright && <span className="sr-only">Your otter sits up to talk with you.</span>}
      </div>
      {open && done && <PondLeaves open={open} done={done} onSelect={onLeafSelect} onBin={onBin} />}
      <span className="sr-only" aria-live="polite">
        {agentStatus === 'listening' ? 'Listening' : agentStatus === 'thinking' ? 'Thinking' : ''}
      </span>
    </div>
  );
});

export default Pond;

