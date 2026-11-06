'use client';

/*
 * Written by Havi (@Havishea) for the Otto team, from https://github.com/Havishea/Ayin.
 * We show Otto's real tasks and reminders, with a ring for a task already started, and the
 * Later choices come from the student's own clock.
 */
import { useState } from 'react';
import type { ThingAction } from '@/lib/client/api';
import { laterChoices, notNow, type Later, type Thing } from '@/lib/today';
import EvidenceTag from './EvidenceTag';
import { LeafShape, toneFor } from './PondLeaves';

type Props = {
  thing: Thing;
  total: number;
  onNext: () => void;
  onPrimary: (thing: Thing) => void;
  act: (thing: Thing, action: ThingAction, line: string) => void;
};

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** The words on a card and on its leaf: what this thing is, in one plain line. */
export function lineFor(thing: Thing): string {
  if (thing.later) return `Back ${thing.later}`;
  if (thing.run) return `Step ${Math.min(thing.run.done + 1, thing.run.total)} of ${thing.run.total}`;
  if (thing.kind === 'reminder') return 'A reminder';
  return `${thing.stepCount} ${thing.stepCount === 1 ? 'step' : 'steps'}`;
}

/** The main button: the action itself, in the same place on every card. */
function primaryLabel(thing: Thing): string {
  if (thing.kind === 'reminder') return 'Done';
  return thing.run ? 'Carry on' : 'Start';
}

/** One thing at a time. Buttons only where you can act, always in the same place. */
export default function FocusCard({ thing, total, onNext, onPrimary, act }: Props) {
  const [choices, setChoices] = useState<Later[] | null>(null);

  const putOff = (later: Later, line: string) => {
    setChoices(null);
    act(thing, { action: 'later', until: later.until, moment: later.moment }, line);
  };

  return (
    <section className={`card routine--${toneFor(thing.id)} ${thing.kind === 'reminder' ? 'card--said' : ''}`} aria-labelledby={`t-${thing.id}`}>
      <div className="card__body">
        {thing.run ? <LeafRing part={thing.run.total ? thing.run.done / thing.run.total : 0} /> : <LeafShape className="leaf__svg card__leaf" />}
        <div className="card__text">
          <h3 id={`t-${thing.id}`} className="card__title">{thing.title}</h3>
          <p className="card__line">{lineFor(thing)}</p>
          {thing.saidAt && !thing.later && <EvidenceTag kind="said" detail={`You said this at ${clock(thing.saidAt)}`} />}
        </div>
      </div>

      {choices ? (
        <div className="card__actions" role="group" aria-label="When is better?">
          <p className="card__ask">When is better?</p>
          {choices.map((later) => (
            <button key={later.moment} className="btn btn--quiet" onClick={() => putOff(later, `Okay. It comes back ${later.moment}.`)}>
              {later.moment.charAt(0).toUpperCase() + later.moment.slice(1)}
            </button>
          ))}
          <button className="btn btn--text" onClick={() => setChoices(null)}>Back</button>
        </div>
      ) : thing.later ? (
        <div className="card__actions">
          <button className="btn btn--primary" onClick={() => onPrimary(thing)}>{primaryLabel(thing)}</button>
          <button className="btn btn--text" onClick={() => act(thing, { action: 'let-go' }, `Let go of "${thing.title}".`)}>Let go</button>
        </div>
      ) : (
        <div className="card__actions">
          <button className="btn btn--primary" onClick={() => onPrimary(thing)}>{primaryLabel(thing)}</button>
          <button className="btn btn--quiet" onClick={() => setChoices(laterChoices(new Date()))}>Later</button>
          <button className="btn btn--text" onClick={() => putOff(notNow(new Date()), "Okay. I won't ask again today.")}>Not now</button>
        </div>
      )}

      {total > 1 && (
        <div className="card__pager">
          <span>{total - 1} more underneath</span>
          <button className="btn btn--text" onClick={onNext} aria-label="Show the next open thing">Next</button>
        </div>
      )}
    </section>
  );
}

/** A leaf inside a ring that fills as the task goes on. */
function LeafRing({ part }: { part: number }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative grid h-14 w-14 shrink-0 place-items-center" aria-hidden>
      <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="var(--line)" strokeWidth="4" />
        <circle cx="24" cy="24" r={r} fill="none" stroke="var(--routine)" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${c * part} ${c}`} />
      </svg>
      <LeafShape className="leaf__svg card__ring-leaf" />
    </span>
  );
}
