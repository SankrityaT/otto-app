"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Routine } from "@/lib/data/routines";
import { api } from "@/lib/client/api";
import { Button } from "./Button";

/** A paper copy of a task's steps, to keep at the station. Low-tech backup for the app. */
export function StepCard() {
  const { id } = useParams<{ id: string }>();
  const [routine, setRoutine] = useState<Routine | null>(null);

  useEffect(() => {
    api.routine(id).then((r) => setRoutine(r.routine));
  }, [id]);

  if (!routine) return <p className="p-6 text-center">Loading</p>;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 bg-white p-8 text-[#1f1c18] print:p-0">
      <div className="flex gap-3 print:hidden">
        <Button look="main" onClick={() => window.print()}>
          Print this card
        </Button>
        <Button onClick={() => history.back()}>Back</Button>
      </div>
      <h1 className="font-display text-[44px] leading-none">{routine.title}</h1>
      <ol className="grid grid-cols-2 gap-4">
        {routine.steps.map((step, i) => (
          <li key={step.id} className="flex break-inside-avoid flex-col gap-2 rounded-2xl border-2 border-[#ddd3c4] p-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- the SVG drawn for this step */}
            <img src={`/api/steps/${step.id}/picture`} alt="" className="aspect-[4/3] w-full object-contain" />
            <p className="text-[20px] font-bold leading-snug">
              {i + 1}. {step.text}
            </p>
          </li>
        ))}
      </ol>
    </main>
  );
}
