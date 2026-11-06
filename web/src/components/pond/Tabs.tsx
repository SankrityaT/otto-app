'use client';

/*
 * Written by Havi (@Havishea) for the Otto team, from https://github.com/Havishea/Otto.
 * Unchanged.
 */
import { useLayoutEffect, useRef, useState } from 'react';

/**
 * The section switcher. One pill sits behind the active tab and glides to the
 * one you pick, rather than jumping. With Reduce Motion it moves instantly.
 */
export default function Tabs<V extends string>({ items, value, onChange }: { items: [V, string][]; value: V; onChange: (v: V) => void }) {
  const nav = useRef<HTMLElement>(null);
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const measure = () => {
      const btn = nav.current?.querySelector<HTMLButtonElement>(`[data-tab="${value}"]`);
      if (btn) setPill({ x: btn.offsetLeft, w: btn.offsetWidth });
    };
    measure();
    // Only animate after the first placement, so it doesn't slide in on load.
    const id = requestAnimationFrame(() => setReady(true));
    const ro = new ResizeObserver(measure);
    if (nav.current) ro.observe(nav.current);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => {
      cancelAnimationFrame(id);
      ro.disconnect();
    };
  }, [value]);

  return (
    <nav ref={nav} className="tabs" aria-label="Sections">
      {pill && (
        <span
          className={`tabs__pill ${ready ? 'is-ready' : ''}`}
          style={{ transform: `translateX(${pill.x}px)`, width: pill.w }}
          aria-hidden
        />
      )}
      {items.map(([v, label]) => (
        <button
          key={v}
          data-tab={v}
          className={`tabs__btn ${value === v ? 'is-on' : ''}`}
          aria-current={value === v ? 'page' : undefined}
          onClick={() => onChange(v)}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
