import { Plus } from "lucide-react";
import { Reveal } from "./Reveal";
import { Section } from "./Section";

const FAQ = [
  {
    q: "Who is Otto for?",
    a: "Teens and young adults, about 16 to 22, who are learning job and life skills. It's made especially for neurodivergent learners who like to see one clear step at a time.",
  },
  {
    q: "What kinds of tasks can it help with?",
    a: "Anything you do with your hands, step by step: making a drink, folding shirts, packing a box, cleaning a station. Type or say the task and Otto makes the steps.",
  },
  {
    q: "Does it need a camera?",
    a: "No. The camera lets Otto check a step, but you can share a screen instead, or just tap \"I did it\" and move on.",
  },
  {
    q: "Are photos saved anywhere?",
    a: "Never. Otto takes one photo only when you tap Done, Help or Show me. It's used for that one answer and then thrown away.",
  },
  {
    q: "Who can my child talk to in the raft?",
    a: "Only a few students from their own program, added by staff. Messages use friendly preset words, so there's no open chat and no strangers.",
  },
  {
    q: "What if speaking out loud is hard?",
    a: "Everything works by tapping too. The otter device also has real buttons for Done, Help and Show me.",
  },
  {
    q: "Won't they just rely on Otto forever?",
    a: "That's the one thing we built against. After a few tries on their own, pictures rest and Otto steps back. The goal is for Otto to be needed less and less.",
  },
];

export function Faq() {
  return (
    <Section label="Questions" title="Good questions.">
      <div className="mx-auto grid max-w-4xl gap-3">
        {FAQ.map(({ q, a }, i) => (
          <Reveal key={q} delay={Math.min(i, 3) * 50}>
            <details className="faq card group px-6 py-5">
              <summary className="flex items-center justify-between gap-4 text-[20px] font-semibold">
                {q}
                <span className="faq__plus grid size-9 flex-none place-items-center rounded-full bg-clay">
                  <Plus className="size-5" aria-hidden />
                </span>
              </summary>
              <p className="mt-3 max-w-3xl text-ink-2">{a}</p>
            </details>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
