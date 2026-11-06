'use client';

/*
 * Written by Havi (@Havishea) for the Otto team, from https://github.com/Havishea/Ayin.
 * Unchanged.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

/**
 * A section that starts folded, so the screen shows less until you ask for more.
 * The heading is the button; the count says what's inside without showing it.
 * Your choice is remembered on this device.
 */
export default function Fold({ id, title, summary, children, toggleSignal = 0 }: { id: string; title: string; summary: string; children: ReactNode; /** Bump this number to open or close the fold from elsewhere (e.g. the pond's bin). */ toggleSignal?: number }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLElement>(null);
  const panel = useId();
  const key = `ayin.fold.${id}`;

  useEffect(() => {
    try {
      if (localStorage.getItem(key) === 'open') setOpen(true);
    } catch {}
  }, [key]);

  useEffect(() => {
    if (!toggleSignal) return;
    setOpen((o) => {
      try {
        localStorage.setItem(key, o ? 'closed' : 'open');
      } catch {}
      if (!o) root.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return !o;
    });
  }, [toggleSignal, key]);

  const toggle = () =>
    setOpen((o) => {
      try {
        localStorage.setItem(key, o ? 'closed' : 'open');
      } catch {}
      return !o;
    });

  return (
    <section ref={root} className={`fold ${open ? 'is-open' : ''}`}>
      <h2 className="fold__h">
        <button className="fold__btn" aria-expanded={open} aria-controls={panel} onClick={toggle}>
          <span className="fold__title">{title}</span>
          <span className="fold__summary">{summary}</span>
          <svg className="fold__chev" viewBox="0 0 16 16" width="16" height="16" aria-hidden>
            <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </h2>
      {/* The panel slides open by animating its grid row from 0 to its full height. */}
      <div id={panel} className="fold__panel" inert={!open} aria-hidden={!open}>
        <div className="fold__inner">{children}</div>
      </div>
    </section>
  );
}
