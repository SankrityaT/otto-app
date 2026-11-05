"use client";

/*
 * Havi's raft (@Havishea), from the landing page, made live: the same pond, otters, bubbles and
 * emoji, but every move is set off by something a raftmate really did, never a script.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CrewView } from "@/lib/data/crew";
import { ringColor } from "@/lib/fur";
import AyinOtter, { type AyinOtterHandle } from "../otter/AyinOtter";
import UprightOtter from "../otter/UprightOtter";
import { LeafShape, Ripples, toneFor } from "../pond/PondLeaves";

type Member = CrewView["members"][number];

/**
 * Where each otter floats, as % of the scene: a zigzag chain with neighbours cuddled up,
 * every other one turned to face its neighbour.
 */
const SPOTS = [
  { x: 4, y: 16, flip: true, seed: 3 },
  { x: 25, y: -4, flip: false, seed: 11 },
  { x: 46, y: 16, flip: true, seed: 23 },
  { x: 67, y: -2, flip: false, seed: 7 },
];
/** Each otter's width, as % of the scene. The scene is 2.3 times wider than tall. */
const OTTER_W = 28;
const OTTER_H = OTTER_W * 2.3;
/** Where the head sits in Havi's drawings, as a fraction of the otter's box (before any flip). */
const HEADS = { float: { x: 0.33, y: 0.32 }, upright: { x: 0.46, y: 0.4 } };
/** The sitting drawing fills more of its frame, so it gets a smaller box: [size, left, top] in %. */
const UPRIGHT_BOX = { size: 85, left: 5.7, top: 10 };
/** A small happy hop for a sitting otter: a squash, up, and a soft landing. */
const HOP: Keyframe[] = [
  { transform: "none" },
  { transform: "translateY(0) scale(1.03, 0.96)", offset: 0.14 },
  { transform: "translateY(-8%) scale(0.98, 1.03)", offset: 0.45 },
  { transform: "translateY(0) scale(1.03, 0.97)", offset: 0.78 },
  { transform: "none" },
];
const BUBBLE_MS = 2400;
const NUDGE_MS = 1100;
const EMOJI_MS = 2200;

type Bubble = { who: string; text: string; key: number };
type Emoji = { x: number; y: number; char: string; key: number };

function useStill(): boolean {
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

/** What changed since the last look at the raft, as moments the otters act out. */
type Moment =
  | { kind: "step"; who: string }
  | { kind: "finished"; who: string }
  | { kind: "cheer"; from: string; to: string; phrase: string }
  | { kind: "together"; a: string; b: string };

function momentsBetween(before: CrewView, after: CrewView): Moment[] {
  const moments: Moment[] = [];
  const idByName = new Map(after.members.map((m) => [m.name, m.id]));
  for (const m of after.members) {
    const was = before.members.find((b) => b.id === m.id);
    if (!was) continue;
    if ((m.now?.done ?? 0) > (was.now?.done ?? 0) || m.onOwn > was.onOwn) moments.push({ kind: "step", who: m.id });
    if (m.justFinished && !was.justFinished) moments.push({ kind: "finished", who: m.id });
  }
  for (const win of after.wins) {
    const seen = before.wins.find((w) => w.runId === win.runId)?.cheers.length ?? 0;
    for (const cheer of win.cheers.slice(seen)) {
      const from = idByName.get(cheer.fromName);
      if (from) moments.push({ kind: "cheer", from, to: win.studentId, phrase: cheer.phrase });
    }
  }
  for (const invite of after.invites) {
    const was = before.invites.find((i) => i.id === invite.id);
    if (invite.status === "yes" && was?.status === "waiting") {
      const a = idByName.get(invite.fromName);
      const b = idByName.get(invite.toName);
      if (a && b) moments.push({ kind: "together", a, b });
    }
  }
  return moments;
}

/**
 * The raft's otters floating together, each in its own colour. A raftmate who asked for help
 * sits up and says so; a step done on your own splashes a tail; a cheer is said out loud with a
 * head bump; a finished task pops a party. The task someone is on drifts beside them as a leaf.
 */
export function RaftScene({
  raft,
  meId,
  invitingIds,
  onPick,
}: {
  raft: CrewView;
  meId: string;
  /** Raftmates waiting for this student to join them. */
  invitingIds: string[];
  onPick: (member: Member) => void;
}) {
  const still = useStill();
  const members = raft.members.slice(0, SPOTS.length);
  const otters = useRef(new Map<string, AyinOtterHandle | null>());
  const hoppers = useRef(new Map<string, HTMLDivElement | null>());
  const previous = useRef<CrewView | null>(null);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [emojis, setEmojis] = useState<Emoji[]>([]);
  const [nudged, setNudged] = useState<[string, string] | null>(null);

  const spotOf = (id: string) => SPOTS[members.findIndex((m) => m.id === id)];
  const sitsUp = (m: Member) => Boolean(m.asking);

  // Act out whatever changed since the last time the raft was checked.
  useEffect(() => {
    const before = previous.current;
    previous.current = raft;
    if (!before || still) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    let key = Date.now();

    const head = (id: string): [number, number] => {
      const spot = spotOf(id);
      const member = members.find((m) => m.id === id);
      if (!spot || !member) return [50, 30];
      const h = HEADS[sitsUp(member) ? "upright" : "float"];
      return [spot.x + OTTER_W * (spot.flip ? 1 - h.x : h.x), spot.y + OTTER_H * h.y];
    };
    const splash = (id: string) => {
      const member = members.find((m) => m.id === id);
      if (member && sitsUp(member)) hoppers.current.get(id)?.animate(HOP, { duration: 760, easing: "cubic-bezier(0.33, 0, 0.25, 1)" });
      else otters.current.get(id)?.swingTail();
    };
    const emoji = (a: string, b: string, char: string) => {
      const k = ++key;
      const [ax, ay] = head(a);
      const [bx, by] = head(b);
      setEmojis((e) => [...e, { x: (ax + bx) / 2, y: (ay + by) / 2 - 18, char, key: k }]);
      later(EMOJI_MS, () => setEmojis((e) => e.filter((p) => p.key !== k)));
    };
    const say = (who: string, text: string) => {
      const k = ++key;
      setBubble({ who, text, key: k });
      later(BUBBLE_MS, () => setBubble((b) => (b?.key === k ? null : b)));
    };
    const nudge = (a: string, b: string) => {
      setNudged([a, b]);
      later(NUDGE_MS, () => setNudged(null));
    };
    const neighbour = (id: string) => {
      const i = members.findIndex((m) => m.id === id);
      return members[i + 1 < members.length ? i + 1 : i - 1]?.id ?? id;
    };

    momentsBetween(before, raft).forEach((moment, i) => {
      const at = i * 1600;
      if (moment.kind === "step") later(at, () => splash(moment.who));
      if (moment.kind === "finished") later(at, () => (splash(moment.who), emoji(moment.who, neighbour(moment.who), "🎉")));
      if (moment.kind === "cheer") later(at, () => (nudge(moment.from, moment.to), say(moment.from, moment.phrase)));
      if (moment.kind === "together") later(at, () => (nudge(moment.a, moment.b), emoji(moment.a, moment.b, "🤝")));
    });
    return () => timers.forEach(clearTimeout);
    // `members` and the helpers come from `raft`, which is what this effect follows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raft, still]);

  /** How far an otter leans toward its neighbour during a head bump, as % of its own width. */
  const lean = (id: string) => {
    if (!nudged?.includes(id)) return 0;
    const [a, b] = nudged.map((n) => members.findIndex((m) => m.id === n));
    const mine = members.findIndex((m) => m.id === id);
    return mine === Math.min(a, b) ? 7 : -7;
  };

  return (
    <div className="relative aspect-[2.3/1] w-full" role="group" aria-label="Your raft, floating together in one pond">
      <svg className="absolute inset-x-[-3%] inset-y-[-4%] h-[108%] w-[106%]" viewBox="0 0 400 180" preserveAspectRatio="none" aria-hidden>
        <ellipse cx="200" cy="90" rx="199" ry="89" fill="var(--bank)" />
        <ellipse cx="200" cy="91" rx="188" ry="81" fill="var(--water-edge)" />
        <ellipse cx="200" cy="92" rx="181" ry="76" fill="var(--water)" />
      </svg>

      {/* The task each raftmate is on, drifting beside them as a leaf. */}
      {members.map((m, i) => {
        if (!m.now) return null;
        const spot = SPOTS[i];
        return (
          <button
            key={`leaf-${m.id}`}
            onClick={() => onPick(m)}
            className={`group routine--${toneFor(m.now.routineId)} absolute z-[1] w-[5%] -translate-x-1/2 -translate-y-1/2`}
            style={{ left: `${spot.x + OTTER_W * (spot.flip ? 0.12 : 0.88)}%`, top: `${spot.y + OTTER_H * 0.8}%` }}
            aria-label={`${m.id === meId ? "You" : m.name}: ${m.now.title}, step ${Math.min(m.now.done + 1, m.now.total)} of ${m.now.total}`}
          >
            <Ripples className="pointer-events-none absolute left-1/2 top-[62%] w-[230%] -translate-x-1/2 -translate-y-1/2" />
            <LeafShape className="leaf__svg drift relative block w-full transition-transform group-hover:scale-125" />
            <span className="pointer-events-none absolute bottom-[130%] left-1/2 z-20 w-max -translate-x-1/2 rounded-2xl border border-line bg-card px-3 py-1.5 text-left opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <span className="block text-[13px] font-semibold text-ink">{m.now.title}</span>
              <span className="block text-[12px] text-ink-3">
                Step {Math.min(m.now.done + 1, m.now.total)} of {m.now.total}
              </span>
            </span>
          </button>
        );
      })}

      {members.map((m, i) => {
        const spot = SPOTS[i];
        const upright = sitsUp(m);
        const h = HEADS[upright ? "upright" : "float"];
        const lasting = m.asking ? "Can someone help?" : invitingIds.includes(m.id) ? "Join me?" : null;
        const said = bubble?.who === m.id ? bubble : lasting ? { text: lasting, key: `lasting-${m.id}` } : null;
        return (
          <div
            key={m.id}
            className="absolute transition-transform duration-500 ease-[cubic-bezier(0.3,0.7,0.3,1)]"
            style={{
              left: `${spot.x}%`,
              top: `${spot.y}%`,
              width: `${OTTER_W}%`,
              transform: `translateX(${lean(m.id)}%)`,
              zIndex: said ? 20 : spot.y > 5 ? 3 : 2,
            }}
          >
            <div className="raft-float" style={{ animationDelay: `${i * -1.7}s`, animationDuration: `${7 + i * 0.6}s` }}>
              <div style={{ transform: spot.flip ? "scaleX(-1)" : undefined, filter: "var(--otter-dim, none)" }}>
                {upright ? (
                  <div className="relative aspect-square w-full">
                    <div
                      ref={(el) => void hoppers.current.set(m.id, el)}
                      className="absolute origin-[56%_86%] will-change-transform"
                      style={{ width: `${UPRIGHT_BOX.size}%`, left: `${UPRIGHT_BOX.left}%`, top: `${UPRIGHT_BOX.top}%` }}
                    >
                      <Ripples className="pointer-events-none absolute left-[56%] top-[86%] w-[78%] -translate-x-1/2 -translate-y-1/2" />
                      <UprightOtter className="relative block aspect-square w-full" furHue={m.furHue} active={!still} />
                    </div>
                  </div>
                ) : (
                  <AyinOtter ref={(handle) => void otters.current.set(m.id, handle)} size="100%" seed={spot.seed} furHue={m.furHue} alt="" />
                )}
              </div>
            </div>
            {/* The whole otter is the button: tap it to see what they're up to. */}
            <button
              onClick={() => onPick(m)}
              aria-label={`${m.id === meId ? "You" : m.name}${m.asking ? ", asking for help" : m.now ? `, doing ${m.now.title}` : ""}`}
              className="absolute inset-x-[15%] inset-y-[20%] rounded-full focus-visible:outline-2 focus-visible:outline-cel-deep"
            />
            <span className="pointer-events-none absolute bottom-[2%] left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-card/90 px-2 py-0.5 text-[11px] font-semibold text-ink-2 shadow-[0_0_0_1px_var(--line)] sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-[13px]">
              <span className="size-2 rounded-full sm:size-2.5" style={{ background: ringColor(m.furHue) }} aria-hidden />
              {m.id === meId ? "You" : m.name}
            </span>
            {said && (
              <div
                key={said.key}
                className="bubble-pop pointer-events-none absolute top-[-10%] z-10 -translate-x-1/2"
                style={{ left: `${(spot.flip ? 1 - h.x : h.x) * 100}%` }}
                aria-live="polite"
              >
                <span className="says">{said.text}</span>
              </div>
            )}
          </div>
        );
      })}

      {emojis.map((e) => (
        <span
          key={e.key}
          className="emoji-pop pointer-events-none absolute z-10 -translate-x-1/2 text-[clamp(24px,3.4vw,40px)] leading-none"
          style={{ left: `${e.x}%`, top: `${e.y}%` }}
          aria-hidden
        >
          {e.char}
        </span>
      ))}
    </div>
  );
}
