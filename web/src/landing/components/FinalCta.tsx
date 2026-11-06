import { site } from "@/landing/lib/site";
import { Leaf } from "./Leaf";
import { OtterSays } from "./OtterSays";
import { Reveal } from "./Reveal";
import UprightOtter from "@/components/otter/UprightOtter";

const TELL_SCHOOL = `mailto:?subject=${encodeURIComponent("Have you seen Otto?")}&body=${encodeURIComponent(
  "Hi! I found Otto, a calm step-by-step coach that helps students learn job tasks and do them on their own. Could it work at our school?\n\n",
)}`;

export function FinalCta() {
  return (
    <section className="px-5 py-20 sm:px-8 md:py-28">
      <Reveal className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-[36px] bg-water px-6 py-16 text-center md:px-16 md:py-24">
          <Leaf color="var(--mustard)" className="drift absolute left-[8%] top-[18%] w-12" style={{ ["--r" as string]: "-15deg" }} />
          <Leaf color="var(--plum)" className="drift absolute bottom-[14%] left-[16%] w-9" style={{ ["--r" as string]: "60deg", animationDelay: "-3s" }} />
          <Leaf color="var(--sky)" className="drift absolute right-[10%] top-[26%] w-10" style={{ ["--r" as string]: "130deg", animationDelay: "-5s" }} />
          {/* The otter sits up to wait with you. Its drawing has empty space above and to the left,
              so the margins trim that off and centre the otter itself. */}
          <div className="mx-auto w-52 md:w-64">
            <UprightOtter className="-mb-[8%] -mt-[22%] block aspect-square w-full -translate-x-[5.7%]" />
          </div>
          <OtterSays className="rotate-[-2deg]" tailX="45%">
            No rush. I&apos;ll wait.
          </OtterSays>
          <h2 className="mx-auto mt-8 max-w-3xl font-display text-[clamp(44px,7vw,80px)] leading-[0.98] text-[#1f1c18]">
            Ready for your first step?
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-xl text-[#1f1c18]/80">
            Try Otto on a phone or tablet, or tell your school about it. We&apos;d love to float alongside you.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <a href={site.appUrl} className="btn bg-[#1f1c18] text-[#f3eee6]">
              Try Otto
            </a>
            <a href={TELL_SCHOOL} className="btn border-[#1f1c18]/20 bg-[#fffcf7] text-[#1f1c18]">
              Tell your school
            </a>
            {site.contactEmail && (
              <a href={`mailto:${site.contactEmail}`} className="btn border-[#1f1c18]/20 bg-[#fffcf7] text-[#1f1c18]">
                Get in touch
              </a>
            )}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
