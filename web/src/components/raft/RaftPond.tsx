"use client";

import type { CrewView } from "@/lib/data/crew";
import UprightOtter from "../otter/UprightOtter";

type Member = CrewView["members"][number];

/**
 * The raft as one pond: everyone's otter floating together, in their own colour. A bubble
 * over an otter shows they're doing a task right now ("Step 3/6") or that they asked for
 * help. Tap an otter to do a task with them, or to see how they work best.
 */
export function RaftPond({ members, meId, onPick }: { members: Member[]; meId: string; onPick: (member: Member) => void }) {
  return (
    <div className="relative mx-auto aspect-[400/230] w-full max-w-[560px]">
      <svg viewBox="0 0 400 230" className="absolute inset-0 h-full w-full" aria-hidden>
        <ellipse cx="200" cy="120" rx="198" ry="108" fill="var(--bank)" />
        <ellipse cx="200" cy="122" rx="184" ry="97" fill="var(--water-edge)" />
        <ellipse cx="200" cy="124" rx="176" ry="90" fill="var(--water)" />
      </svg>
      <ul className="absolute inset-0" aria-label="Your raft">
        {members.map((member, i) => {
          const left = ((i + 1) / (members.length + 1)) * 100;
          const me = member.id === meId;
          const bubble = member.now
            ? `Step ${Math.min(member.now.done + 1, member.now.total)}/${member.now.total}`
            : member.asking
              ? "Needs help"
              : null;
          return (
            <li key={member.id} className="absolute top-[12%] flex w-[24%] -translate-x-1/2 flex-col items-center" style={{ left: `${left}%` }}>
              <span className={`mb-1 h-7 max-w-full truncate rounded-full px-2 py-1 text-[13px] font-semibold leading-tight ${bubble ? (member.now ? "bg-card text-ink" : "bg-[var(--r-study)] text-[#1f1c18]") : "invisible"}`}>
                {bubble ?? "·"}
              </span>
              <button
                onClick={() => onPick(member)}
                aria-label={`${me ? "You" : member.name}${member.now ? `: ${member.now.title}, ${bubble}` : bubble ? `: ${bubble}` : ""}`}
                className="w-full rounded-full focus-visible:outline-2 focus-visible:outline-cel-deep"
              >
                <UprightOtter className="aspect-square w-full" furHue={member.furHue} mood={member.now ? "talking" : "idle"} />
              </button>
              <span className={`-mt-2 rounded-full px-2.5 py-0.5 text-[14px] font-semibold ${me ? "bg-ink text-card" : "bg-card text-ink"}`}>
                {me ? "You" : member.name}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
