"use client";

import { useState } from "react";
import { Button } from "./Button";
import UprightOtter from "./otter/UprightOtter";

const PAGES = [
  {
    title: "A group of otters is called a raft",
    body: "Otters hold paws while they rest, so nobody drifts away. Your raft does the same for you.",
  },
  {
    title: "Your raft is people you know",
    body: "Students from your work site, chosen by staff. No strangers, and nobody can find you who isn't in your raft.",
  },
  {
    title: "Fill the pond together",
    body: "Every step you do on your own raises the water for everyone. Help a buddy, cheer a win. There are no rankings and no streaks.",
  },
];

/** Colours for the little raft of otters on each page: brown, rose, sky, sea green. */
const RAFT = [0, 300, 210, 150];

/** A short, calm introduction the first time a student opens their raft. */
export function RaftIntro({ onDone }: { onDone: () => void }) {
  const [page, setPage] = useState(0);
  const last = page === PAGES.length - 1;

  return (
    <section className="page flex min-h-[70svh] items-center justify-center" aria-labelledby="raft-intro-title">
      <div className="flex w-full max-w-md flex-col gap-6 text-center">
        <div className="flex justify-center -space-x-6" aria-hidden>
          {RAFT.slice(0, page + 2).map((hue) => (
            <UprightOtter key={hue} className="h-28 w-28" furHue={hue} active={false} />
          ))}
        </div>
        <h1 id="raft-intro-title" className="page__h">
          {PAGES[page].title}
        </h1>
        <p className="text-[19px] leading-relaxed text-ink-2">{PAGES[page].body}</p>
        <ol className="flex justify-center gap-2" aria-label={`Page ${page + 1} of ${PAGES.length}`}>
          {PAGES.map((p, i) => (
            <li key={p.title} className={`h-2 w-2 rounded-full ${i === page ? "bg-ink" : "bg-clay-2"}`} />
          ))}
        </ol>
        <Button look="main" className="h-14" onClick={() => (last ? onDone() : setPage(page + 1))}>
          {last ? "See my raft" : "Next"}
        </Button>
        {!last && (
          <button onClick={onDone} className="btn btn--text self-center">
            Skip
          </button>
        )}
      </div>
    </section>
  );
}
