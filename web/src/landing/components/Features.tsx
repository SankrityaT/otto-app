import { Box, Hand, Hourglass, MessagesSquare, MonitorUp, Split } from "lucide-react";
import { Reveal } from "./Reveal";
import { Section } from "./Section";

const FEATURES = [
  {
    icon: Hand,
    title: "Hands-free",
    body: "Hands wet or full? Just say \"done\". Or say \"watch for me\" and Otto checks every few seconds by itself.",
    tone: "var(--sky)",
  },
  {
    icon: MessagesSquare,
    title: "Just ask",
    body: "\"Is this the right way up?\" Ask out loud. Otto looks and answers in a sentence or two, like a coach beside you.",
    tone: "var(--celadon)",
  },
  {
    icon: Box,
    title: "Show me in 3D",
    body: "Stuck on a part? It becomes a simple 3D model you can spin around, with the bit to touch glowing.",
    tone: "var(--lavender)",
  },
  {
    icon: Hourglass,
    title: "Calm timers",
    body: "\"Wash your hands for 20 seconds\" gets a soft ring timer you can see. It never turns red and never beeps at you.",
    tone: "var(--mustard)",
  },
  {
    icon: Split,
    title: "Smaller steps",
    body: "A step feels too big? Tap once and Otto splits it into two to four smaller ones.",
    tone: "var(--apricot)",
  },
  {
    icon: MonitorUp,
    title: "No camera? No problem",
    body: "For tasks on a computer, Otto can look at a shared screen instead. Or just tap \"I did it\".",
    tone: "var(--plum)",
  },
];

export function Features() {
  return (
    <Section
      label="Little things"
      title={
        <>
          Little things
          <br />
          <span className="italic text-cel-deep">that help a lot.</span>
        </>
      }
      intro="Made with students, teachers and job coaches, so Otto fits the way real work happens: messy hands, noisy rooms and all."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body, tone }, i) => (
          <Reveal key={title} delay={(i % 3) * 80}>
            <article className="card h-full p-7">
              <div className="flex items-center justify-between">
                <span
                  className="grid size-12 place-items-center rounded-2xl text-ink"
                  style={{ background: `color-mix(in srgb, ${tone} 35%, var(--surface))` }}
                >
                  <Icon className="size-6" aria-hidden />
                </span>
                <span className="font-display text-[28px] text-ink-3">0{i + 1}</span>
              </div>
              <h3 className="mt-6 text-[22px] font-semibold">{title}</h3>
              <p className="mt-2 text-ink-2">{body}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
