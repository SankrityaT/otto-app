'use client';

/*
 * Written by Havi (@Havishea) for the Ayin team, from https://github.com/Havishea/Ayin.
 * We changed only the default asset folder.
 */
/**
 * AyinOtter: the calm floating otter, rendered live in the browser with WebGL.
 *
 * Motion (see ayin-otter-engine.ts for the details):
 *  - gentle pond bob and blinks through the 11 solid eyelid drawings (from v5)
 *  - curious head tilts at random moments
 *  - a gentle tail sway, and every 15–20s a big swing to the left that makes the
 *    otter and the pond dip and rock harder in the water
 *
 * Assets (put them in /public/ayin, or pass assetBase):
 *   otter-base.png     512×512 artwork, also used for reduced motion and SSR
 *   otter-eyelids.png  the 11 eyelid states (eye region only)
 *   otter-tail.png     the tail on its own, plus the pond behind it
 */

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type CSSProperties } from 'react';
import { createOtterMotion, createOtterRenderer, SRC, type OtterMotion, type OtterPose, type OtterRenderer } from './ayin-otter-engine';

export { createOtterMotion } from './ayin-otter-engine';
export type { OtterPose } from './ayin-otter-engine';

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
}

/** Imperative controls, via `ref`. */
export type AyinOtterHandle = {
  /** Swing the tail to the left now, with the pond splash. */
  swingTail: () => void;
  /** Do a curious head tilt now. */
  tiltHead: () => void;
  /** Blink once now. */
  blink: () => void;
};

export type AyinOtterProps = {
  /** Rendered width and height. A number means px; any CSS length works (e.g. "min(60vw, 320px)"). Default 256. */
  size?: number | string;
  /** Pause the animation and hold the current pose. */
  paused?: boolean;
  /** Playback speed multiplier. Default 1. */
  speed?: number;
  /** Seed for the random tilts, blinks and tail swings. The same seed always plays the same way. Default: random per mount. */
  seed?: number;
  /** Folder (under /public) that holds the otter PNGs. Default "/ayin". */
  assetBase?: string;
  /** Explicit image URLs (for example data: URLs). Overrides assetBase. */
  sources?: { base: string; eyes: string; tail: string };
  /**
   * 'idle' (default): the always-on loop (float, blinks, tilts, tail swings).
   * 'reactive': no ambient motion; the otter moves only when you call swingTail(), tiltHead() or blink().
   */
  motion?: 'reactive' | 'idle';
  /**
   * Fur colour as a hue shift in degrees, 0 to 360. 0 (the default) is the painted brown.
   * Only the fur changes: the belly, eyes, nose, stone, water and every movement stay the same.
   */
  furHue?: number;
  /** Show the static image when the OS "reduce motion" setting is on. Default true. */
  respectReducedMotion?: boolean;
  /** Accessible description. Pass "" when the otter is purely decorative. */
  alt?: string;
  /** Called every animation frame with the otter's current pose, so other UI (like the pond) can follow it. */
  onPose?: (pose: OtterPose, time: number) => void;
  className?: string;
  style?: CSSProperties;
};

const AyinOtter = forwardRef<AyinOtterHandle, AyinOtterProps>(function AyinOtter({
  size = 256,
  paused = false,
  speed = 1,
  seed,
  assetBase = '/otter',
  sources,
  motion = 'idle',
  furHue = 0,
  respectReducedMotion = true,
  alt = 'An otter floating calmly with a celadon stone, blinking, tilting its head curiously and swishing its tail.',
  onPose,
  className,
  style,
}, ref) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<OtterRenderer | null>(null);
  const motionRef = useRef<OtterMotion | null>(null);
  const [ready, setReady] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const still = respectReducedMotion && reducedMotion;

  // Playback clock that survives pauses, speed changes and going offscreen.
  const clock = useRef({ elapsed: 0, last: 0 });
  const live = useRef({ paused, speed, visible: true });
  const poseCb = useRef(onPose);
  poseCb.current = onPose;
  live.current.paused = paused;
  live.current.speed = speed;

  // A new seed restarts the timeline.
  useEffect(() => {
    motionRef.current = createOtterMotion(seed ?? Math.floor(Math.random() * 2 ** 31), { mode: motion });
    clock.current.elapsed = 0;
    drawNow();
     
  }, [seed, motion]);

  useImperativeHandle(ref, () => ({
    swingTail: () => motionRef.current?.trigger('swing', clock.current.elapsed),
    tiltHead: () => motionRef.current?.trigger('curious', clock.current.elapsed),
    blink: () => motionRef.current?.trigger('blink', clock.current.elapsed),
  }), []);

  const stillRef = useRef(still);
  stillRef.current = still;
  const furRef = useRef(furHue);
  furRef.current = furHue;

  const drawNow = () => {
    if (!rendererRef.current || !motionRef.current) return;
    const pose = motionRef.current.pose(clock.current.elapsed);
    // Reduce Motion: one still frame with the water exactly as painted.
    rendererRef.current.draw(stillRef.current ? { ...pose, ripples: undefined } : pose);
  };

  // Fur colour: recolour in the shader and redraw. Motion is untouched.
  useEffect(() => {
    rendererRef.current?.setFurHue(furHue);
    drawNow();
     
  }, [furHue]);

  // Create the renderer once the images are loaded.
  useEffect(() => {
    let cancelled = false;
    const urls = sources
      ? [sources.base, sources.eyes, sources.tail]
      : ['otter-base.png', 'otter-eyelids.png', 'otter-tail.png'].map((f) => `${assetBase}/${f}`);
    Promise.all(urls.map(loadImage))
      .then(([base, eyes, tail]) => {
        if (cancelled || !canvasRef.current) return;
        try {
          rendererRef.current = createOtterRenderer(canvasRef.current, { base, eyes, tail });
        } catch (err) {
          console.warn('[AyinOtter] WebGL unavailable, showing static image.', err);
        }
        if (rendererRef.current) {
          rendererRef.current.resize(bufferSize(wrapRef.current));
          rendererRef.current.setFurHue(furRef.current);
          drawNow();
          setReady(true);
        }
      })
      .catch((err) => console.warn('[AyinOtter]', err));

    const canvas = canvasRef.current;
    const onLost = (e: Event) => {
      e.preventDefault();
      rendererRef.current = null;
      setReady(false);
    };
    canvas?.addEventListener('webglcontextlost', onLost);
    return () => {
      cancelled = true;
      canvas?.removeEventListener('webglcontextlost', onLost);
      rendererRef.current?.dispose();
      rendererRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetBase, sources?.base]);

  // Switching Reduce Motion on or off redraws the current frame in the right style.
  useEffect(() => {
    drawNow();
     
  }, [still]);

  // Keep the drawing buffer sharp at the displayed size, and pause while offscreen.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => {
      rendererRef.current?.resize(bufferSize(wrap));
      drawNow();
    });
    const io = new IntersectionObserver(([entry]) => {
      live.current.visible = entry.isIntersecting;
    });
    ro.observe(wrap);
    io.observe(wrap);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  // Animation loop.
  useEffect(() => {
    if (!ready || still) return;
    let raf = 0;
    clock.current.last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - clock.current.last) / 1000); // clamp after tab switches
      clock.current.last = now;
      const { paused: p, speed: s, visible } = live.current;
      if (!p && visible) {
        const t = clock.current.elapsed;
        clock.current.elapsed += dt * s;
        // In reactive mode, only draw while a move is playing (plus one frame to settle).
        if (motionRef.current?.isMoving(t) || motionRef.current?.isMoving(clock.current.elapsed)) drawNow();
        if (poseCb.current && motionRef.current) poseCb.current(motionRef.current.pose(clock.current.elapsed), clock.current.elapsed);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready, still]);

  const showCanvas = ready;
  const fill: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%' };

  return (
    <div
      ref={wrapRef}
      className={className}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      style={{
        position: 'relative',
        width: typeof size === 'number' ? `${size}px` : size,
        aspectRatio: '1 / 1',
        ...style,
      }}
    >
      {/* Static frame: server render, first paint, reduced motion and no-WebGL fallback. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={sources?.base ?? `${assetBase}/otter-base.png`}
        alt=""
        aria-hidden
        draggable={false}
        width={SRC}
        height={SRC}
        style={{ ...fill, visibility: showCanvas ? 'hidden' : 'visible' }}
      />
      <canvas ref={canvasRef} aria-hidden style={{ ...fill, visibility: showCanvas ? 'visible' : 'hidden' }} />
    </div>
  );
});

export default AyinOtter;

function bufferSize(el: HTMLElement | null) {
  const css = el?.clientWidth || SRC;
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  return Math.max(64, Math.min(2048, Math.round(css * dpr)));
}
