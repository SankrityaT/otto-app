import type { Reaction } from "@/lib/raftWords";

// Hand-drawn reaction stickers and icons for the raft, in the same style as Havi's pond
// (soft fills, warm brown outline). No stock emoji: everything comes from the otter's world.

const OUTLINE = "#5a4636";
const FUR = "#b08a66";
const PAD = "#6f5240";
const PEBBLE = "#8fb7a3";
const LEAF = "#cdb45a";

/** Words that go with each reaction, read by screen readers and shown under the sticker. */
export const REACTION_WORDS: Record<Reaction, string> = {
  clap: "Nice work",
  proud: "So proud",
  "me-too": "Me too",
  wow: "Wow",
};

function Paw({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) ${flip ? "scale(-1 1)" : ""}`}>
      <ellipse cx="0" cy="4" rx="9" ry="10" fill={FUR} stroke={OUTLINE} strokeWidth="1.6" />
      <ellipse cx="0" cy="7" rx="4.5" ry="3.6" fill={PAD} />
      <circle cx="-4.6" cy="-1" r="1.8" fill={PAD} />
      <circle cx="0" cy="-3" r="1.9" fill={PAD} />
      <circle cx="4.6" cy="-1" r="1.8" fill={PAD} />
    </g>
  );
}

/** One reaction sticker, drawn at any size. */
export function Sticker({ kind, size = 28 }: { kind: Reaction; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label={REACTION_WORDS[kind]}>
      {kind === "clap" && (
        <>
          <Paw x={17} y={24} />
          <Paw x={31} y={24} flip />
          <path d="M24 5v6M14 8l3 5M34 8l-3 5" stroke={OUTLINE} strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      {kind === "proud" && (
        <>
          {/* Ayin's celadon stone, shaped like a heart */}
          <path
            d="M24 41C12 33 6 26 6 18.5 6 12.6 10.5 8 16 8c3.6 0 6.4 1.8 8 4.6C25.6 9.8 28.4 8 32 8c5.5 0 10 4.6 10 10.5C42 26 36 33 24 41Z"
            fill={PEBBLE}
            stroke={OUTLINE}
            strokeWidth="1.8"
          />
          <ellipse cx="15.5" cy="16" rx="4.5" ry="2.6" fill="#fff" opacity="0.55" transform="rotate(-25 15.5 16)" />
        </>
      )}
      {kind === "me-too" && (
        <>
          {/* two otter heads, side by side */}
          {[16, 32].map((cx, i) => (
            <g key={cx}>
              <circle cx={cx - 8} cy="15" r="4" fill={i ? "#9d8bb8" : FUR} stroke={OUTLINE} strokeWidth="1.4" />
              <circle cx={cx + 8} cy="15" r="4" fill={i ? "#9d8bb8" : FUR} stroke={OUTLINE} strokeWidth="1.4" />
              <circle cx={cx} cy="26" r="12" fill={i ? "#9d8bb8" : FUR} stroke={OUTLINE} strokeWidth="1.6" />
              <ellipse cx={cx} cy="31" rx="7" ry="5" fill="#f4ece0" />
              <circle cx={cx - 4} cy="24" r="1.7" fill={OUTLINE} />
              <circle cx={cx + 4} cy="24" r="1.7" fill={OUTLINE} />
              <ellipse cx={cx} cy="29" rx="2" ry="1.4" fill={OUTLINE} />
            </g>
          ))}
        </>
      )}
      {kind === "wow" && (
        <>
          <path d="M9 40C8 26 15 13 38 10c2 17-8 30-29 30Z" fill={LEAF} stroke={OUTLINE} strokeWidth="1.8" />
          <path d="M10 39C18 30 25 23 35 13" stroke={OUTLINE} strokeWidth="1.4" fill="none" />
          <path d="M39 22l1.6 3.6L44 27l-3.4 1.4L39 32l-1.6-3.6L34 27l3.4-1.4Z" fill="#f2c94c" stroke={OUTLINE} strokeWidth="1.2" />
        </>
      )}
    </svg>
  );
}

type IconName = "win" | "help" | "people" | "together" | "report" | "photo" | "goal" | "card" | "print";

/** Line icons for the raft, drawn to match the stickers. */
export function RaftIcon({ name, size = 22 }: { name: IconName; size?: number }) {
  const line = { stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      {name === "win" && (
        <>
          {/* a leaf landing in the basket */}
          <path d="M5 13h14l-1.6 7.2a1.6 1.6 0 0 1-1.6 1.3H8.2a1.6 1.6 0 0 1-1.6-1.3Z" {...line} />
          <path d="M9 13 8.4 21M15 13l.6 8M6 16.5h12" {...line} />
          <path d="M9 10C9 6 11.5 3 17 2.5c.3 4.4-2.3 7.5-8 7.5Z" {...line} />
        </>
      )}
      {name === "help" && (
        <>
          {/* a life ring floating on the water */}
          <circle cx="12" cy="11" r="7.5" {...line} />
          <circle cx="12" cy="11" r="3.5" {...line} />
          <path d="M6.8 5.8l2.7 2.7M17.2 5.8l-2.7 2.7M6.8 16.2l2.7-2.7M17.2 16.2l-2.7-2.7" {...line} />
          <path d="M3 21c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0 3 1 4.5 0" {...line} />
        </>
      )}
      {name === "people" && (
        <>
          <circle cx="8.5" cy="10" r="4" {...line} />
          <circle cx="16" cy="11" r="3.4" {...line} />
          <path d="M5.6 6.8 5 5.6M11.4 6.8l.6-1.2M2.5 21c.6-3.4 3-5.5 6-5.5s5.4 2.1 6 5.5M14.5 15.6c2.8-.3 5.6 1.4 6.5 5.4" {...line} />
        </>
      )}
      {name === "together" && (
        <>
          {/* two paws holding */}
          <path d="M3.5 15.5c1.5-3 4-4.5 7-4.5l2 1.2M20.5 15.5c-1.5-3-4-4.5-7-4.5" {...line} />
          <ellipse cx="9.5" cy="15.5" rx="3" ry="3.4" {...line} />
          <ellipse cx="14.5" cy="15.5" rx="3" ry="3.4" {...line} />
          <path d="M12 4.5v3M7.5 6l1.4 2.2M16.5 6l-1.4 2.2" {...line} />
        </>
      )}
      {name === "report" && <path d="M6 21V4M6 4.5c4-2 8 2 12 0v8.5c-4 2-8-2-12 0" {...line} />}
      {name === "photo" && (
        <>
          <rect x="3" y="7" width="18" height="13" rx="3" {...line} />
          <path d="M8.5 7 10 4.5h4L15.5 7" {...line} />
          <circle cx="12" cy="13.5" r="3.5" {...line} />
        </>
      )}
      {name === "goal" && (
        <>
          {/* a flag on Ayin's stone */}
          <ellipse cx="12" cy="18.5" rx="8" ry="3" {...line} />
          <path d="M11 17V3.5l7 3-7 3" {...line} />
        </>
      )}
      {name === "card" && (
        <>
          <rect x="3" y="5" width="18" height="14" rx="3" {...line} />
          <circle cx="8.5" cy="11" r="2.3" {...line} />
          <path d="M5.5 16c.6-1.6 1.7-2.4 3-2.4s2.4.8 3 2.4M14 10h4M14 13.5h3" {...line} />
        </>
      )}
      {name === "print" && (
        <>
          <path d="M7 8V3.5h10V8M7 17H4.5A1.5 1.5 0 0 1 3 15.5v-6A1.5 1.5 0 0 1 4.5 8h15A1.5 1.5 0 0 1 21 9.5v6a1.5 1.5 0 0 1-1.5 1.5H17" {...line} />
          <rect x="7" y="13" width="10" height="7.5" rx="1" {...line} />
        </>
      )}
    </svg>
  );
}
