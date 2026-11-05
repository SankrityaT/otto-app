"use client";

import UprightOtter from "./otter/UprightOtter";

/**
 * The crew's shared goal as a pond the otters fill together. Every step anyone does on
 * their own raises the water a little. Everyone's otter sits in it, in their own colour.
 * The water only ever rises; a new week starts with a fresh pond.
 */
export function CrewPond({
  fill,
  members,
}: {
  fill: number;
  members: { id: string; name: string; furHue: number; onOwn: number }[];
}) {
  const waterTop = 260 - 260 * Math.min(Math.max(fill, 0), 1);
  return (
    <div className="relative mx-auto aspect-[400/260] w-full max-w-[560px]">
      <svg viewBox="0 0 400 260" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <clipPath id="crew-pond-water">
            <rect x="0" y={waterTop} width="400" height={260 - waterTop} />
          </clipPath>
        </defs>
        <ellipse cx="200" cy="130" rx="198" ry="128" fill="var(--bank)" />
        <ellipse cx="200" cy="134" rx="176" ry="109" fill="var(--clay)" />
        <ellipse cx="200" cy="134" rx="176" ry="109" fill="var(--water)" clipPath="url(#crew-pond-water)" />
        <ellipse cx="200" cy="132" rx="184" ry="116" fill="none" stroke="var(--water-edge)" strokeWidth="6" />
      </svg>
      <ul className="absolute inset-x-[10%] top-[18%] flex justify-around">
        {members.map((member) => (
          <li key={member.id} className="flex w-[22%] flex-col items-center">
            <UprightOtter className="aspect-square w-full" furHue={member.furHue} active={false} />
            <span className="rounded-full bg-card px-2.5 py-0.5 text-[15px] font-semibold">{member.name}</span>
            <span className="mt-0.5 text-[13px] font-medium text-ink-2">
              {member.onOwn} {member.onOwn === 1 ? "step" : "steps"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
