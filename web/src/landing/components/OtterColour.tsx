"use client";

import { useState } from "react";
import { FUR_STOPS, furColor, furName } from "@/landing/lib/fur";
import { OtterSays } from "./OtterSays";
import { Pond } from "./Pond";
import { Reveal } from "./Reveal";
import { Section } from "./Section";

/** A few colours to tap, as hue shifts. */
const PRESETS = [0, 20, 130, 175, 220, 260, 300];

/** What the otter thinks of each colour. */
const OPINIONS: Record<string, string> = {
  "Natural brown": "A classic. Very me.",
  Rose: "Rosy! I feel fancy.",
  Caramel: "Sweet choice.",
  Honey: "Golden hour, all day.",
  Olive: "Very calm. Very leafy.",
  Sage: "Pond-coloured. I approve.",
  Seafoam: "Seafoam? Bold. I love it.",
  Sky: "Now I match the sky.",
  Periwinkle: "Is this... my best look?",
  Lilac: "Lilac! Twirl-worthy.",
  Mauve: "Mysterious and cosy.",
};

export function OtterColour() {
  const [hue, setHue] = useState(0);
  const name = furName(hue);

  return (
    <Section
      id="otter"
      label="Your otter"
      title={
        <>
          Meet your otter.
          <br />
          <span className="italic text-cel-deep">Make it yours.</span>
        </>
      }
      intro="Every student gets their own otter. It floats in your pond at home, your tasks drift by as leaves, and finished ones pile up in a little basket."
      className="bg-cel-wash/60"
    >
      <Reveal>
        <div className="grid items-center gap-10 md:grid-cols-[1.1fr_1fr]">
          <div className="relative mx-auto w-full max-w-[520px] pt-16">
            <div className="absolute right-[4%] top-0 z-10">
              <OtterSays className="rotate-[2deg]" tailX="30%">
                {OPINIONS[name]}
              </OtterSays>
            </div>
            <Pond furHue={hue} alt={`Your otter, with ${name.toLowerCase()} fur, floating in the pond.`} />
          </div>

          <div className="card p-7">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="fur-hue" className="text-[20px] font-semibold">
                Pick a fur colour
              </label>
              <span className="inline-flex items-center gap-2 text-ink-2">
                <span className="size-4 rounded-full border border-line" style={{ background: furColor(hue) }} aria-hidden />
                {name}
              </span>
            </div>
            <input
              id="fur-hue"
              className="fur__range mt-3"
              type="range"
              min={0}
              max={359}
              step={1}
              value={hue}
              aria-valuetext={name}
              style={{ ["--track" as string]: `linear-gradient(90deg, ${FUR_STOPS})`, ["--thumb" as string]: furColor(hue) }}
              onChange={(e) => setHue(Number(e.target.value))}
            />
            <div className="mt-4 flex flex-wrap gap-2.5" role="group" aria-label="Quick colours">
              {PRESETS.map((shift) => (
                <button
                  key={shift}
                  type="button"
                  onClick={() => setHue(shift)}
                  aria-label={furName(shift)}
                  aria-pressed={hue === shift}
                  className={`size-10 rounded-full border-[3px] transition-transform hover:scale-110 ${hue === shift ? "border-ink" : "border-card"}`}
                  style={{ background: furColor(shift), boxShadow: "0 0 0 1px var(--line)" }}
                />
              ))}
            </div>
            <p className="mt-5 text-[16px] text-ink-3">
              Only the fur changes. Your otter still blinks, tilts its head and swishes its tail the same way, in every colour.
            </p>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
