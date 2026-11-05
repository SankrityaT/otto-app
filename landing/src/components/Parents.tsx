import { Ban, Camera, EyeOff, Lock, MapPinOff, ShieldCheck, Smile, Users } from "lucide-react";
import { Reveal } from "./Reveal";
import { Section } from "./Section";

const PROMISES = [
  { icon: Camera, label: "Camera only when asked" },
  { icon: EyeOff, label: "No photos ever saved" },
  { icon: Users, label: "Closed groups, set up by staff" },
  { icon: MapPinOff, label: "No location" },
  { icon: Lock, label: "Preset words, no open chat" },
  { icon: ShieldCheck, label: "Pictures can't run code" },
  { icon: Ban, label: "No ads" },
  { icon: Smile, label: "No red, no guilt, no streaks" },
];

/** What our research found, and what it changed. Sources are in docs/research.md. */
const WHY = [
  {
    big: "Fewer prompts",
    body: "Our partner school's own goal is students needing fewer prompts. At a first job, nobody prompts each step. So Ayin's help is built to fade.",
    source: "Arizona Autism Charter Schools",
  },
  {
    big: "−17%",
    body: "When AI did the work for students, their scores dropped 17% once it was taken away. Hint-only help did no harm. So Ayin gives hints, not answers.",
    source: "Bastani et al., PNAS 2025",
    href: "https://www.pnas.org/doi/10.1073/pnas.2422633122",
  },
  {
    big: "4 in 10",
    body: "About 40% of neurodivergent young adults in one large study hadn't met up with a friend in a year. So Ayin comes with a raft.",
    source: "NLTS2, via Washington University",
    href: "https://source.washu.edu/2013/05/new-study-examines-social-isolation-of-young-adults-with-autism-spectrum-disorder/",
  },
];

export function Parents() {
  return (
    <Section
      id="parents"
      label="For parents and carers"
      title={
        <>
          Built carefully,
          <br />
          <span className="italic text-cel-deep">so you can relax.</span>
        </>
      }
      intro="Ayin was shaped by time with students, teachers and job coaches at our partner school, and by First Place AZ. Here's what we promise, and why we built it this way."
    >
      <Reveal>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {PROMISES.map(({ icon: Icon, label }) => (
            <li key={label} className="card flex items-center gap-3 px-4 py-4 text-[16px] font-semibold">
              <span className="grid size-9 flex-none place-items-center rounded-xl bg-cel-wash text-cel-deep">
                <Icon className="size-[18px]" aria-hidden />
              </span>
              {label}
            </li>
          ))}
        </ul>
      </Reveal>

      <div className="mt-14 grid gap-4 md:grid-cols-3">
        {WHY.map((w, i) => (
          <Reveal key={w.big} delay={i * 80}>
            <article className="h-full rounded-[22px] bg-ink p-7 text-ground">
              <p className="font-display text-[48px] leading-none">{w.big}</p>
              <p className="mt-4 opacity-85">{w.body}</p>
              <p className="mt-5 text-[14px] opacity-60">
                {w.href ? (
                  <a href={w.href} className="underline decoration-1 underline-offset-4 hover:opacity-100">
                    {w.source}
                  </a>
                ) : (
                  w.source
                )}
              </p>
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
