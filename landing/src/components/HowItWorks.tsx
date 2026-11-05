import { Camera, Footprints, Lightbulb, MessageSquareText } from "lucide-react";
import { Reveal } from "./Reveal";
import { Section } from "./Section";
import { StepDemo } from "./StepDemo";

const HOW = [
  {
    icon: MessageSquareText,
    title: "Say what you want to do",
    body: "Say it, type it or show it: \"make an iced latte\", \"fold a T-shirt\", \"pack a box\". Ayin turns it into small steps.",
  },
  {
    icon: Footprints,
    title: "See one step at a time",
    body: "A picture and a few short words, read out loud. No long lists. Just the one thing to do now.",
  },
  {
    icon: Camera,
    title: "Show Ayin when it's done",
    body: "Ayin takes one quick look and tells you what it sees: on to the next step, or the one small thing to fix.",
  },
  {
    icon: Lightbulb,
    title: "Ask for help when you want it",
    body: "A nudge first, then a hint, then \"show me\". Help only comes when you ask, and only as much as you need.",
  },
];

export function HowItWorks() {
  return (
    <Section
      id="how"
      number="01"
      label="one step"
      title={
        <>
          A coach that shows you
          <br />
          <span className="italic text-cel-deep">just the next step.</span>
        </>
      }
      intro="Big tasks can feel like a lot. Ayin breaks them into small steps and stays with you for each one, like a calm coach beside you."
    >
      <div className="grid items-center gap-14 md:grid-cols-[1fr_auto]">
        <ol className="grid gap-4">
          {HOW.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 80}>
              <li className="card flex gap-5 p-6">
                <span className="grid size-12 flex-none place-items-center rounded-2xl bg-cel-wash text-cel-deep">
                  <Icon className="size-6" aria-hidden />
                </span>
                <div>
                  <h3 className="text-[20px] font-semibold">
                    <span className="mr-2 text-ink-3">0{i + 1}</span>
                    {title}
                  </h3>
                  <p className="mt-1.5 text-ink-2">{body}</p>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>
        <Reveal>
          <StepDemo />
        </Reveal>
      </div>
    </Section>
  );
}
