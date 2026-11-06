'use client';

/*
 * Written by Havi (@Havishea) for the Otto team, from https://github.com/Havishea/Ayin.
 * We kept the three kinds Otto can really know from a student's log.
 */
import type { Evidence } from '@/lib/today';

const LABEL: Record<Evidence, string> = {
  saw: 'Otto saw it',
  confirmed: 'You confirmed',
  said: 'You said',
};

/** "How Otto knows". Shape, not colour, tells them apart. */
export default function EvidenceTag({ kind, detail }: { kind: Evidence; detail: string }) {
  return (
    <span className={`evidence evidence--${kind}`}>
      <span className="evidence__mark" aria-hidden />
      <span className="evidence__text">
        <span className="sr-only">{LABEL[kind]}: </span>
        {detail}
      </span>
    </span>
  );
}
