"use client";

import { useState } from "react";
import EvidenceTag from "./pond/EvidenceTag";
import Fold from "./pond/Fold";
import { LeafShape, toneFor } from "./pond/PondLeaves";
import type { DoneThing, Memory } from "@/lib/today";

/** Memories shown before "Show all", so the section stays short. */
const FIRST_MEMORIES = 3;

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function when(iso: string) {
  const then = new Date(iso);
  const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 86_400_000);
  if (days === 0) return `Today at ${clock(iso)}`;
  if (days === 1) return "Yesterday";
  return then.toLocaleDateString([], { month: "short", day: "numeric" });
}

/** The day so far: a shelf, nothing to count. Tapping the bin in the pond opens it. */
export function DoneToday({ done, toggleSignal, onAgain }: { done: DoneThing[]; toggleSignal: number; onAgain: (routineId: string) => void }) {
  return (
    <Fold id="done" toggleSignal={toggleSignal} title="Done today" summary={done.length === 0 ? "Nothing yet" : `${done.length} ${done.length === 1 ? "thing" : "things"}`}>
      {done.length === 0 ? (
        <p className="shelf__empty">Finished things land here, and in the bin by the pond.</p>
      ) : (
        <ul className="shelf__row">
          {done.map((thing) => (
            <li key={thing.id} className={`shelf__item routine--${toneFor(thing.thingId)}`}>
              <LeafShape className="leaf__svg shelf__leaf" />
              <span className="shelf__text">
                <span className="shelf__title">{thing.title}</span>
                <span className="shelf__time">{thing.line ? `${clock(thing.at)} · ${thing.line}` : clock(thing.at)}</span>
                {thing.routineId && (
                  <button className="shelf__again" onClick={() => onAgain(thing.routineId!)}>
                    Do it again
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Fold>
  );
}

/** What Otto knows, and how it knows. The student can make it forget anything they told it. */
export function OttoRemembers({ memories, onForget }: { memories: Memory[]; onForget: (memoryId: string) => void }) {
  const [all, setAll] = useState(false);
  const shown = all ? memories : memories.slice(0, FIRST_MEMORIES);
  return (
    <Fold id="remembers" title="Otto remembers" summary={memories.length === 0 ? "Nothing yet" : `${memories.length} recent`}>
      {memories.length === 0 ? (
        <p className="shelf__empty">Say &ldquo;remember&rdquo; and what you want to keep, like where the lids are.</p>
      ) : (
        <ul className="peek__list">
          {shown.map((memory) => (
            <li key={memory.id} className="peek__item">
              <p className="mem__title">{memory.title}</p>
              {memory.detail && <p className="mem__detail">{memory.detail}</p>}
              {memory.evidence && <EvidenceTag kind={memory.evidence.kind} detail={memory.evidence.detail} />}
              <p className="mem__when">
                {when(memory.at)}
                {memory.canForget && (
                  <button className="mem__forget" onClick={() => onForget(memory.id)}>
                    Forget this
                  </button>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
      {!all && memories.length > FIRST_MEMORIES && (
        <button className="btn btn--text fold__more" onClick={() => setAll(true)}>
          Show all
        </button>
      )}
    </Fold>
  );
}
