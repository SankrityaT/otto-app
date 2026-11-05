import { Leaf } from "./Leaf";
import { Ripples } from "./Pond";

/** Tasks the raft is working on this week, floating as leaves like on the app's home pond. */
const TASKS = [
  { title: "Make an iced latte", line: "Café · 6 steps", tone: "var(--mustard)", x: 15, y: 18, r: -25 },
  { title: "Fold T-shirts", line: "Shirt studio · 5 steps", tone: "var(--sky)", x: 54, y: 16, r: 35 },
  { title: "Pack a box", line: "Shipping store · 7 steps", tone: "var(--apricot)", x: 37, y: 80, r: 120 },
  { title: "Wipe the counter", line: "Café · 4 steps", tone: "var(--plum)", x: 85, y: 76, r: 70 },
  { title: "Restock the cups", line: "Café · 3 steps", tone: "var(--lavender)", x: 6, y: 50, r: -70 },
];

/**
 * The raft's tasks drift between the otters. Hover or focus a leaf to see the task.
 * With Reduce Motion the leaves hold still (see globals.css).
 */
export function RaftLeaves() {
  return (
    <ul className="contents">
      {TASKS.map((t, i) => (
        <li key={t.title} className="group absolute z-[3] w-[5%] -translate-x-1/2 -translate-y-1/2" style={{ left: `${t.x}%`, top: `${t.y}%` }}>
          <Ripples className="pointer-events-none absolute left-1/2 top-[62%] w-[230%] -translate-x-1/2 -translate-y-1/2 overflow-visible" />
          <button type="button" className="relative block w-full cursor-pointer rounded-full transition-transform duration-300 group-hover:scale-125 group-focus-within:scale-125" aria-label={`${t.title}, ${t.line}`}>
            <Leaf
              color={t.tone}
              className="drift block w-full"
              style={{ ["--r" as string]: `${t.r}deg`, animationDelay: `${i * -1.9}s` }}
            />
          </button>
          <span className="pointer-events-none absolute bottom-[130%] left-1/2 z-20 w-max -translate-x-1/2 rounded-2xl border border-line bg-card px-3 py-2 text-left opacity-0 shadow-[0_6px_18px_-8px_var(--shadow)] transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
            <span className="block text-[14px] font-semibold text-ink">{t.title}</span>
            <span className="block text-[12px] text-ink-3">{t.line}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
