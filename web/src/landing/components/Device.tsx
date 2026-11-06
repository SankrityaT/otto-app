import { Accessibility, CameraOff, MousePointerClick } from "lucide-react";
import { OtterViewer } from "./OtterViewer";
import { Reveal } from "./Reveal";
import { Section } from "./Section";

const POINTS = [
  { icon: CameraOff, title: "A privacy shutter", body: "Slide it shut and the camera can't see a thing. You can tell at a glance." },
  { icon: MousePointerClick, title: "Big, friendly buttons", body: "Done, Help and Show me, right on the otter. Great for students who prefer not to speak." },
  { icon: Accessibility, title: "Nothing to wear", body: "It sits on the counter. No headsets, glasses or straps that feel scratchy or tight." },
];

export function Device() {
  return (
    <Section
      label="The otter on the counter"
      title={
        <>
          Your coach can also
          <br />
          <span className="italic text-cel-deep">sit on the counter.</span>
        </>
      }
      intro="Otto works on any phone or tablet. For work stations, we're building a 3D-printed otter that holds a little camera in its pebble, so your hands stay free."
      className="bg-card/60"
    >
      <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
        <Reveal>
          <OtterViewer />
        </Reveal>
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-cel-wash px-3.5 py-1.5 text-[15px] font-semibold text-cel-deep">
            <span className="size-2 rounded-full bg-cel" aria-hidden />
            In the workshop
          </span>
          <ul className="mt-6 grid gap-6">
            {POINTS.map(({ icon: Icon, title, body }, i) => (
              <Reveal key={title} delay={i * 80}>
                <li className="flex gap-4">
                  <span className="grid size-11 flex-none place-items-center rounded-2xl bg-card text-ink shadow-[0_0_0_1px_var(--line)]">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-[20px] font-semibold">{title}</h3>
                    <p className="mt-1 text-ink-2">{body}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ul>
          <p className="mt-8 text-[16px] text-ink-3">
            The camera version works today. The version with buttons is built but still being tested, so it isn&apos;t ready for
            classrooms yet.
          </p>
        </div>
      </div>
    </Section>
  );
}
