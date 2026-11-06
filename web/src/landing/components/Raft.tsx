import { HandHeart, Heart, Repeat, Users } from "lucide-react";
import { ringColor } from "@/lib/fur";
import { RaftScene } from "./RaftScene";
import { Reveal } from "./Reveal";
import { Section } from "./Section";

/**
 * A pretend raft for the picture, with otter nicknames. `hue` is each otter's fur colour,
 * and its ring uses the same colour. Rings fill with steps done on your own this week.
 */
const CREW = [
  { name: "You", hue: 0, done: 9, target: 12 },
  { name: "Kelp", hue: 120, done: 12, target: 12 },
  { name: "Pebble", hue: 190, done: 5, target: 10, pose: "upright" as const },
];
const CHEERS = ["Nice work!", "You got this", "Way to go!", "High five"];

const IDEAS = [
  { icon: Users, title: "A small, safe group", body: "Three to six students from the same program. Staff set it up. No strangers, ever." },
  { icon: Heart, title: "One shared pond", body: "Every step anyone does on their own raises the water. Everyone fills it together." },
  { icon: Repeat, title: "Practice buddies", body: "Otto pairs you with a crewmate, so you can each show the other a step you've mastered." },
  { icon: HandHeart, title: "Cheers in kind words", body: "Send a cheer with one tap, from friendly words staff picked. Ask someone who's done the step before." },
];

const NOS = ["No leaderboards", "No streaks to break", "No strangers", "No open chat", "No \"overdue\""];

function Ring({ done, target, color }: { done: number; target: number; color: string }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 40 40" className="size-12 -rotate-90" aria-hidden>
      <circle cx="20" cy="20" r={r} fill="none" stroke="var(--clay)" strokeWidth="6" />
      <circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(done / target, 1))} />
    </svg>
  );
}

export function Raft() {
  const total = CREW.reduce((sum, m) => sum + m.done, 0);
  const goal = 32;

  return (
    <Section
      id="raft"
      label="Your raft"
      title={
        <>
          A raft is a group of otters
          <br />
          <span className="italic text-cel-deep">floating together.</span>
        </>
      }
      intro="Real otters hold paws so they don't drift apart. Your raft is a few friends from your program who cheer each other on and help when someone's stuck."
    >
      <Reveal>
        <div className="card overflow-hidden p-5 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[14px] font-semibold uppercase tracking-[0.08em] text-ink-3">Café raft · this week</p>
              <p className="mt-1 font-display text-[34px] leading-none">The pond is filling up</p>
            </div>
            <p className="text-[16px] text-ink-2">
              {total} of {goal} steps on their own, together
            </p>
          </div>
          <div className="mt-8 px-[3%]">
            <RaftScene members={CREW} />
          </div>
          {/* The shared goal: every step anyone does on their own raises the water. */}
          <div className="mt-8 h-3 overflow-hidden rounded-full bg-clay" aria-hidden>
            <div className="h-full rounded-full bg-water" style={{ width: `${(total / goal) * 100}%` }} />
          </div>
        </div>
      </Reveal>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.1fr]">
        <Reveal>
          <div className="card p-6 md:p-8">
            <p className="font-display text-[30px] leading-none">Everyone&apos;s ring</p>
            <ul className="mt-5 grid grid-cols-3 gap-3">
              {CREW.map((m) => (
                <li key={m.name} className="flex flex-col items-center gap-2 rounded-2xl bg-ground p-3 text-center">
                  <Ring done={m.done} target={m.target} color={ringColor(m.hue)} />
                  <div>
                    <p className="font-semibold">{m.name}</p>
                    <p className="text-[14px] text-ink-3">{m.done === m.target ? "Ring full!" : `${m.done} on ${m.name === "You" ? "your" : "their"} own`}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              {CHEERS.map((c) => (
                <span key={c} className="rounded-full border border-line bg-card px-3.5 py-1.5 text-[15px]">
                  {c}
                </span>
              ))}
            </div>
            <p className="mt-4 text-[15px] text-ink-3">Rings quietly start fresh every Monday. Nothing to lose, nothing to break.</p>
          </div>
        </Reveal>

        <div>
          <ul className="grid gap-5 sm:grid-cols-2">
            {IDEAS.map(({ icon: Icon, title, body }, i) => (
              <Reveal key={title} delay={(i % 2) * 80}>
                <li>
                  <span className="grid size-11 place-items-center rounded-2xl bg-cel-wash text-cel-deep">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-[20px] font-semibold">{title}</h3>
                  <p className="mt-1.5 text-ink-2">{body}</p>
                </li>
              </Reveal>
            ))}
          </ul>
          <Reveal>
            <div className="mt-10 rounded-[22px] border border-dashed border-line p-6">
              <p className="font-hand text-[22px] text-ink-2">Things we left out on purpose:</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {NOS.map((n) => (
                  <li key={n} className="rounded-full bg-clay px-3.5 py-1.5 text-[15px] text-ink-2 line-through decoration-ink-3/60">
                    {n}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[16px] text-ink-3">
                The help you don&apos;t need from Otto anymore is exactly what you can now share with a friend.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
