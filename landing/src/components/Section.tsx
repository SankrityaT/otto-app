import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

/** A page section with its small label, big heading and a short line under it. */
export function Section({
  id,
  label,
  title,
  intro,
  children,
  className = "",
}: {
  id?: string;
  label: string;
  title: ReactNode;
  intro?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`px-5 py-20 sm:px-8 md:py-28 ${className}`}>
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-2xl">
          <span className="label">{label}</span>
          <h2 className="mt-3 font-display text-[clamp(38px,6vw,64px)] leading-[1.02] tracking-[-0.01em]">{title}</h2>
          {intro && <p className="mt-5 text-xl text-ink-2">{intro}</p>}
        </Reveal>
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}
