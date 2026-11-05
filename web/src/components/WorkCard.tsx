"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Profile } from "@/lib/data/raft";
import { api } from "@/lib/client/api";
import { STAGES } from "@/lib/stages";
import { tipsFor } from "@/lib/workCard";
import { Button } from "./Button";
import UprightOtter from "./otter/UprightOtter";

/**
 * "My work card": one page a student can choose to share with a job coach or supervisor.
 * It comes from their real progress, and it tells the person they work with how to help.
 */
export function WorkCard() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    api.profile(id).then((r) => setProfile(r.profile));
  }, [id]);

  if (!profile) return <p className="p-6 text-center">Loading</p>;
  const tips = tipsFor(profile.workStyle);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 bg-white p-8 text-[#1f1c18] print:p-0">
      <div className="flex gap-3 print:hidden">
        <Button look="main" onClick={() => window.print()}>
          Print or save as PDF
        </Button>
        <Button onClick={() => history.back()}>Back</Button>
      </div>

      <header className="flex items-center gap-5 border-b border-[#ddd3c4] pb-5">
        <UprightOtter className="h-24 w-24" furHue={profile.furHue} active={false} />
        <div>
          <h1 className="font-display text-[44px] leading-none">{profile.name}</h1>
          <p className="text-[18px] text-[#48423b]">How to work with me</p>
        </div>
      </header>

      {profile.goal && (
        <section>
          <h2 className="text-[15px] font-bold text-[#69625a]">My goal</h2>
          <p className="text-[20px]">{profile.goal.text}</p>
        </section>
      )}

      {tips.length > 0 && (
        <section>
          <h2 className="text-[15px] font-bold text-[#69625a]">Tips for giving me instructions</h2>
          <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-[18px]">
            {tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-[15px] font-bold text-[#69625a]">What I can do on my own</h2>
        <p className="mt-1 text-[18px]">{profile.canHelpWith.length ? profile.canHelpWith.join(" · ") : "Still learning my first tasks."}</p>
      </section>

      {profile.learning.length > 0 && (
        <section>
          <h2 className="text-[15px] font-bold text-[#69625a]">What I&apos;m learning</h2>
          <ul className="mt-1 flex flex-col gap-1 text-[18px]">
            {profile.learning.map((l) => (
              <li key={l.title}>
                {l.title}: <span className="text-[#48423b]">{STAGES[l.stage - 1].name.toLowerCase()}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="border-t border-[#ddd3c4] pt-4 text-[14px] text-[#69625a]">
        {profile.name} chose to share this card. It comes from their practice with Ayin, a step-by-step coach.
      </footer>
    </main>
  );
}
