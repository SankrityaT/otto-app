"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ringColor } from "@/lib/fur";
import AyinOtter, { type AyinOtterHandle } from "./otter/AyinOtter";
import { OtterSays } from "./OtterSays";
import { RaftLeaves } from "./RaftLeaves";
import { Ripples } from "./Pond";
import UprightOtter from "./otter/UprightOtter";

export type RaftMember = {
  name: string;
  /** Fur colour as a hue shift. The same shift colours this otter's ring. */
  hue: number;
  /** Float on its back (the default), or sit up in the water. */
  pose?: "float" | "upright";
};

/**
 * Where each otter floats, as % of the scene: a zigzag chain in the middle of the pond with
 * neighbours cuddled up. The first two meet head to head, and the last two tail to tail.
 */
const SPOTS = [
  { x: 14, y: 16, flip: true, seed: 3 },
  { x: 35, y: -5, flip: false, seed: 11 },
  { x: 56, y: 16, flip: true, seed: 23 },
];
/** Each otter's width, as % of the scene. */
const OTTER_W = 30;
/** The scene is 2.3 times wider than tall, so an otter is this tall, as % of the scene. */
const OTTER_H = OTTER_W * 2.3;
/** Where the head sits in Havi's drawings, as a fraction of the otter's box (before any flip). */
const HEADS = { float: { x: 0.33, y: 0.32 }, upright: { x: 0.46, y: 0.4 } };
/**
 * The upright drawing fills more of its frame than the floating one, so it is drawn in a smaller
 * box, nudged so it sits in the water where a floating otter would: [size, left, top] of the box.
 */
const UPRIGHT_BOX = { size: 85, left: 5.7, top: 10 };
/** A small happy hop for a sitting otter: a squash, up, and a soft landing. */
const HOP: Keyframe[] = [
  { transform: "none" },
  { transform: "translateY(0) scale(1.03, 0.96)", offset: 0.14 },
  { transform: "translateY(-8%) scale(0.98, 1.03)", offset: 0.45 },
  { transform: "translateY(0) scale(1.03, 0.97)", offset: 0.78 },
  { transform: "none" },
];

type Bubble = { who: number; text: string; key: number };
type Emoji = { x: number; y: number; char: string; key: number };

/** Each beat is a little moment between the otters: [ms after the beat starts, what happens]. */
type Api = {
  swing: (i: number) => void;
  tilt: (i: number) => void;
  blink: (i: number) => void;
  say: (i: number, text: string) => void;
  nudge: (a: number, b: number) => void;
  /** Float an emoji up from between two otters. (One otter's emoji goes in its speech bubble.) */
  emoji: (between: [number, number], char: string) => void;
};
const BEATS: ((o: Api) => [number, () => void][])[] = [
  // Two crewmates bump heads and grin.
  (o) => [[0, () => o.nudge(0, 1)], [550, () => (o.emoji([0, 1], "😊"), o.blink(0), o.blink(1))], [900, () => o.say(1, "Hey, you!")]],
  // A tail splash in the middle, and the neighbour turns to look and laughs.
  (o) => [[0, () => o.swing(1)], [600, () => o.tilt(2)], [800, () => o.say(2, "Nice work! 😄")]],
  // A cheer passes back down the raft, with a clap.
  (o) => [[0, () => o.say(2, "You got this! 👏")], [350, () => o.tilt(1)], [1500, () => o.swing(0)]],
  // The raft wave: tails swish one after another, then a little party.
  (o) => [[0, () => o.say(0, "Raft wave! 🌊")], [500, () => o.swing(0)], [900, () => o.swing(1)], [1300, () => o.swing(2)], [1700, () => o.emoji([1, 2], "🎉")]],
  // The other pair bumps for a high five.
  (o) => [[0, () => o.nudge(1, 2)], [550, () => (o.emoji([1, 2], "🙌"), o.blink(1), o.blink(2))], [1000, () => o.say(2, "High five!")]],
];
/** A quiet pause after each beat, so it never feels busy. */
const REST_MS = 2600;
const BUBBLE_MS = 1900;
const NUDGE_MS = 1100;

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)");
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
}

/** The raft's otters floating together, each in its own fur colour, cheering and bumping each other. */
export function RaftScene({ members }: { members: RaftMember[] }) {
  const still = usePrefersReducedMotion();
  const scene = useRef<HTMLDivElement>(null);
  const otters = useRef<(AyinOtterHandle | null)[]>([]);
  const [visible, setVisible] = useState(false);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [emojis, setEmojis] = useState<Emoji[]>([]);
  // Sitting otters hop by animating this element directly, so the otter's canvas is never remounted.
  const hoppers = useRef<(HTMLDivElement | null)[]>([]);
  const [nudged, setNudged] = useState<[number, number] | null>(null);

  // Only play while the raft is on screen.
  useEffect(() => {
    const el = scene.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (still || !visible) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    let key = 0;
    const pose = (i: number) => members[i]?.pose ?? "float";
    const head = (i: number) => {
      const h = HEADS[pose(i)];
      return [SPOTS[i].x + OTTER_W * (SPOTS[i].flip ? 1 - h.x : h.x), SPOTS[i].y + OTTER_H * h.y];
    };
    // A sitting otter has no tail swish or head tilt to play, so it does a little happy hop instead.
    const hopOr = (i: number, move: () => void) => {
      if (pose(i) !== "upright") return move();
      hoppers.current[i]?.animate(HOP, { duration: 760, easing: "cubic-bezier(0.33, 0, 0.25, 1)" });
    };

    const api: Api = {
      swing: (i) => hopOr(i, () => otters.current[i]?.swingTail()),
      tilt: (i) => hopOr(i, () => otters.current[i]?.tiltHead()),
      blink: (i) => otters.current[i]?.blink(),
      say(i, text) {
        const k = ++key;
        setBubble({ who: i, text, key: k });
        later(BUBBLE_MS, () => setBubble((b) => (b?.key === k ? null : b)));
      },
      nudge(a, b) {
        setNudged([a, b]);
        later(NUDGE_MS, () => setNudged(null));
      },
      emoji([a, b], char) {
        const k = ++key;
        // Halfway between the two otters' heads, a little above them.
        const [ax, ay] = head(a);
        const [bx, by] = head(b);
        const x = (ax + bx) / 2;
        const y = (ay + by) / 2 - 18;
        setEmojis((e) => [...e, { x, y, char, key: k }]);
        later(2200, () => setEmojis((e) => e.filter((p) => p.key !== k)));
      },
    };

    const play = (beat: number) => {
      const steps = BEATS[beat % BEATS.length](api);
      for (const [ms, fn] of steps) later(ms, fn);
      const last = Math.max(...steps.map(([ms]) => ms));
      later(last + REST_MS, () => play(beat + 1));
    };
    later(900, () => play(0));

    return () => {
      timers.forEach(clearTimeout);
      setBubble(null);
      setEmojis([]);
      setNudged(null);
    };
  }, [still, visible, members]);

  /** How far an otter leans toward its neighbour during a bump, as % of its own width. */
  const lean = (i: number) => {
    if (!nudged || !nudged.includes(i)) return 0;
    return i === Math.min(...nudged) ? 7 : -7;
  };

  return (
    <div
      ref={scene}
      className="relative aspect-[2.3/1] w-full"
      role="group"
      aria-label={`${members.length} otters floating together in one pond, each in its own colour, bumping and cheering each other on, with this week's tasks drifting by as leaves.`}
    >
      {/* The shared pond */}
      <svg className="absolute inset-x-[-3%] inset-y-[-4%] h-[108%] w-[106%]" viewBox="0 0 400 180" preserveAspectRatio="none" aria-hidden>
        <ellipse cx="200" cy="90" rx="199" ry="89" fill="var(--bank)" />
        <ellipse cx="200" cy="91" rx="188" ry="81" fill="var(--water-edge)" />
        <ellipse cx="200" cy="92" rx="181" ry="76" fill="var(--water)" />
      </svg>

      <RaftLeaves />

      {members.slice(0, SPOTS.length).map((m, i) => {
        const spot = SPOTS[i];
        const upright = m.pose === "upright";
        const h = HEADS[upright ? "upright" : "float"];
        return (
          <div
            key={m.name}
            className="absolute transition-transform duration-500 ease-[cubic-bezier(0.3,0.7,0.3,1)]"
            style={{ left: `${spot.x}%`, top: `${spot.y}%`, width: `${OTTER_W}%`, transform: `translateX(${lean(i)}%)`, zIndex: spot.y > 5 ? 2 : 1 }}
          >
            <div className="raft-float" style={{ animationDelay: `${i * -1.7}s`, animationDuration: `${7 + i * 0.6}s` }}>
              <div style={{ transform: spot.flip ? "scaleX(-1)" : undefined, filter: "var(--otter-dim, none)" }}>
                {upright ? (
                  <div className="relative aspect-square w-full">
                    <div
                      ref={(el) => {
                        hoppers.current[i] = el;
                      }}
                      className="absolute origin-[56%_86%] will-change-transform"
                      style={{ width: `${UPRIGHT_BOX.size}%`, left: `${UPRIGHT_BOX.left}%`, top: `${UPRIGHT_BOX.top}%` }}
                    >
                      <Ripples className="pointer-events-none absolute left-[56%] top-[86%] w-[78%] -translate-x-1/2 -translate-y-1/2 overflow-visible" />
                      <UprightOtter className="relative block aspect-square w-full" furHue={m.hue} active={visible && !still} />
                    </div>
                  </div>
                ) : (
                  <AyinOtter
                    ref={(handle) => {
                      otters.current[i] = handle;
                    }}
                    size="100%"
                    seed={spot.seed}
                    furHue={m.hue}
                    alt=""
                  />
                )}
              </div>
            </div>
            <span className="absolute bottom-[4%] left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-card/90 px-2.5 py-1 text-[13px] font-semibold text-ink-2 shadow-[0_0_0_1px_var(--line)] md:text-[14px]">
              <span className="size-2.5 rounded-full" style={{ background: ringColor(m.hue) }} aria-hidden />
              {m.name}
            </span>
            {bubble?.who === i && (
              <div
                key={bubble.key}
                className="bubble-pop absolute top-[-8%] z-10 -translate-x-1/2 whitespace-nowrap"
                style={{ left: `${(spot.flip ? 1 - h.x : h.x) * 100}%` }}
              >
                <OtterSays className="!px-3 !py-1.5 !text-[17px] md:!text-[20px]" tailX="50%">
                  {bubble.text}
                </OtterSays>
              </div>
            )}
          </div>
        );
      })}

      {emojis.map((e) => (
        <span
          key={e.key}
          className="emoji-pop absolute z-10 -translate-x-1/2 text-[clamp(24px,3.4vw,46px)] leading-none"
          style={{ left: `${e.x}%`, top: `${e.y}%` }}
          aria-hidden
        >
          {e.char}
        </span>
      ))}
    </div>
  );
}
