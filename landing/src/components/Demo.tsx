import { Play } from "lucide-react";
import { site } from "@/lib/site";
import { OtterSays } from "./OtterSays";
import { Reveal } from "./Reveal";

/** YouTube and Vimeo links become embeds; anything else is played as a video file. */
function embedFor(url: string): { kind: "iframe" | "video"; src: string } {
  const youtube = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (youtube) return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${youtube[1]}?rel=0` };
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return { kind: "iframe", src: `https://player.vimeo.com/video/${vimeo[1]}?dnt=1` };
  return { kind: "video", src: url };
}

/** The 30-second demo. Until NEXT_PUBLIC_DEMO_VIDEO_URL is set, a friendly "coming soon" card holds its place. */
export function Demo() {
  const video = site.demoVideoUrl ? embedFor(site.demoVideoUrl) : null;

  return (
    <section id="demo" className="px-5 pb-8 sm:px-8">
      <Reveal className="mx-auto max-w-5xl">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <span className="label">See it in action</span>
          <span className="text-[16px] text-ink-3">30 seconds, no sound needed</span>
        </div>
        <div className={`card relative overflow-hidden p-0 ${video ? "aspect-video" : "aspect-[4/5] sm:aspect-video"}`}>
          {video?.kind === "iframe" && (
            <iframe
              src={video.src}
              title="Ayin in 30 seconds"
              className="absolute inset-0 size-full"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              loading="lazy"
            />
          )}
          {video?.kind === "video" && (
            <video src={video.src} controls playsInline preload="metadata" className="absolute inset-0 size-full bg-black object-contain">
              <track kind="captions" />
            </video>
          )}
          {!video && (
            <div className="absolute inset-0 grid place-items-center bg-cel-wash">
              <div className="flex flex-col items-center gap-5 px-6 text-center">
                <div className="relative">
                  <span className="grid size-20 place-items-center rounded-full bg-card text-ink shadow-[0_2px_0_var(--shadow)]">
                    <Play className="ml-1 size-8" aria-hidden />
                  </span>
                </div>
                <div>
                  <p className="font-display text-[clamp(30px,4.5vw,46px)] leading-none">The demo is on its way</p>
                  <p className="mt-3 text-ink-2">We&apos;re filming a short video of Ayin at work. Check back soon!</p>
                </div>
                <OtterSays className="rotate-[-2deg]" tailX="50%">
                  Practising my lines...
                </OtterSays>
              </div>
            </div>
          )}
        </div>
      </Reveal>
    </section>
  );
}
