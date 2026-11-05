'use client';

/**
 * Written by Havi (@Havishea) for the Ayin team and copied from
 * https://github.com/Havishea/Ayin. We changed the default asset folder, moved the fur tint into useMemo to satisfy
 * our lint rules, and draw the layers at a fixed size so 2048 px art stays sharp. We added reactions (see below)
 * so it responds to the student instead of playing the same loop.
 *
 * UprightOtter: the otter sitting up, holding its stone. Shown while you ask
 * something or while Ayin is explaining a task.
 *
 * It is drawn live on a canvas at the screen's frame rate from three layers
 * (1024×1024, made from Havishea's upright drawing):
 *   upright-body.png  the otter without its tail
 *   upright-tail.png  the tail on its own, swung from its base
 *   upright-eyes.png  closed eyes, faded in for blinks
 *
 * Motion is kept small: slow breathing, a very slight bob and lean,
 * a gentle tail sway, and a blink every few seconds.
 *
 * On top of that it reacts, using springs so every move eases in and settles:
 *   it leans toward the student's finger or cursor,
 *   leans in while listening and sways slowly while thinking,
 *   gives a small hop on each word it says (`beat` changes per word),
 *   and a tap gets a happy bounce, a wiggle and a squeezed-shut smile.
 * With Reduce Motion it holds still.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

export type UprightSources = { body: string; tail: string; eyes: string };
export type OtterMood = 'idle' | 'listening' | 'thinking' | 'talking';

/** A spring that eases a value toward a target: stiffness, and how quickly it stops wobbling. */
type Spring = { x: number; v: number };
function step(sp: Spring, target: number, dt: number, stiffness = 120, damping = 14) {
  sp.v += (-(sp.x - target) * stiffness - sp.v * damping) * dt;
  sp.x += sp.v * dt;
}

/** The drawing's coordinate space. The art files can be larger; they are drawn into this space. */
const SIZE = 1024;
/** The sharpest the canvas gets, matching the 2048 px art. */
const MAX_PIXELS = 2048;
/** The otter breathes and leans from the middle of its seat. */
const SEAT = { x: 512, y: 880 };
/** The tail swings from where it meets the hip. */
const TAIL_PIVOT = { x: 770, y: 790 };

export const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });

/** The same fur-only hue shift as the floating otter's shader (hue 2–58°, enough colour and light). */
export function tint(img: HTMLImageElement, hue: number): CanvasImageSource {
  if (!hue) return img;
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext('2d', { willReadFrequently: true });
  if (!g) return img;
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height);
  const p = d.data;
  const ss = (a: number, b: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const shift = hue / 360;
  for (let i = 0; i < p.length; i += 4) {
    if (p[i + 3] < 3) continue;
    const r = p[i] / 255, gg = p[i + 1] / 255, b = p[i + 2] / 255;
    const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), dl = mx - mn;
    let h = 0;
    if (dl) h = mx === r ? ((gg - b) / dl) % 6 : mx === gg ? (b - r) / dl + 2 : (r - gg) / dl + 4;
    h = ((h * 60) + 360) % 360;
    const s = mx ? dl / mx : 0, v = mx;
    const m = ss(2, 10, h) * (1 - ss(48, 58, h)) * ss(0.12, 0.19, s) * ss(0.1, 0.22, v);
    if (m <= 0) continue;
    const nh = (((h / 360 + shift) % 1) * 6);
    const k = (n: number) => {
      const kk = (n + nh) % 6;
      return v - v * s * Math.max(0, Math.min(kk, 4 - kk, 1));
    };
    const tr = k(5), tg = k(3), tb = k(1);
    p[i] = (r + (tr - r) * m) * 255;
    p[i + 1] = (gg + (tg - gg) * m) * 255;
    p[i + 2] = (b + (tb - b) * m) * 255;
  }
  g.putImageData(d, 0, 0);
  return c;
}

export default function UprightOtter({
  sources,
  assetBase = '/otter',
  furHue = 0,
  active = true,
  mood = 'idle',
  beat = 0,
  className,
}: {
  sources?: UprightSources;
  assetBase?: string;
  furHue?: number;
  /** Only animate while shown; it rests (and costs nothing) otherwise. */
  active?: boolean;
  /** What Ayin is doing right now, so its body can show it. */
  mood?: OtterMood;
  /** Changes on every word Ayin says, for a small hop per word. */
  beat?: number;
  className?: string;
}) {
  // Read inside the animation loop without restarting it.
  const moodRef = useRef(mood);
  const beatRef = useRef(beat);
  useEffect(() => {
    moodRef.current = mood;
    beatRef.current = beat;
  }, [mood, beat]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [imgs, setImgs] = useState<{ body: HTMLImageElement; tail: HTMLImageElement; eyes: HTMLImageElement } | null>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const up = () => setReduced(mq.matches);
    up();
    mq.addEventListener('change', up);
    return () => mq.removeEventListener('change', up);
  }, []);

  useEffect(() => {
    let live = true;
    const s = sources ?? { body: `${assetBase}/upright-body.png`, tail: `${assetBase}/upright-tail.png`, eyes: `${assetBase}/upright-eyes.png` };
    Promise.all([loadImage(s.body), loadImage(s.tail), loadImage(s.eyes)])
      .then(([body, tail, eyes]) => live && setImgs({ body, tail, eyes }))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [assetBase, sources]);

  const layers = useMemo(
    () => imgs && { body: tint(imgs.body, furHue), tail: tint(imgs.tail, furHue), eyes: tint(imgs.eyes, furHue) },
    [imgs, furHue],
  );

  useEffect(() => {
    const cv = canvas.current;
    if (!cv || !layers) return;
    const g = cv.getContext('2d');
    if (!g) return;

    const fit = () => {
      const px = Math.min(MAX_PIXELS, Math.round(cv.clientWidth * (window.devicePixelRatio || 1)));
      if (px > 0 && cv.width !== px) {
        cv.width = px;
        cv.height = px;
      }
    };

    // Blinks: a quick close and open every 2.8–5.5s, now and then a double blink.
    let nextBlink = 1.6;
    let blinkStart = -10;
    let doubleAt = -1;

    // Reactions. `look` is where the finger or cursor is, from -1 (left) to 1 (right).
    const lean = { x: 0, v: 0 };
    const shift = { x: 0, v: 0 };
    const hop = { x: 0, v: 0 };
    const squash = { x: 0, v: 0 };
    let look = 0;
    let lastBeat = beatRef.current;
    let happyUntil = -1;
    let last = 0;

    const onPointer = (e: PointerEvent) => {
      const box = cv.getBoundingClientRect();
      const dx = (e.clientX - (box.left + box.width / 2)) / Math.max(240, window.innerWidth / 2);
      look = Math.max(-1, Math.min(1, dx));
    };
    const onTap = () => {
      hop.v -= 520;
      squash.v += 6;
      lean.v += 2.4;
      happyUntil = performance.now() / 1000 + 0.7;
    };
    window.addEventListener('pointermove', onPointer);
    cv.addEventListener('pointerdown', onTap);

    const draw = (t: number) => {
      fit();
      const k = cv.width / SIZE;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, cv.width, cv.height);
      g.imageSmoothingQuality = 'high';

      const still = reduced || !active;
      const TAU = Math.PI * 2;
      const dt = Math.min(0.05, Math.max(0, t - last));
      last = t;
      const mood = moodRef.current;

      if (!still) {
        // A new word: a small hop with a squash, like a nod.
        if (beatRef.current !== lastBeat) {
          lastBeat = beatRef.current;
          hop.v -= 150;
          squash.v += 1.6;
        }
        const leanTarget =
          mood === 'thinking' ? 0.06 * Math.sin((t / 2.6) * TAU) : mood === 'listening' ? 0.07 + look * 0.04 : look * 0.07;
        step(lean, leanTarget, dt, 60, 9);
        step(shift, look * 18, dt, 40, 10);
        step(hop, 0, dt, 260, 16);
        step(squash, mood === 'listening' ? 0.02 : 0, dt, 300, 12);
      }
      // Slow breath (3.8s): a touch taller and narrower on the in-breath.
      const breath = still ? 0 : Math.sin((t / 3.8) * TAU);
      const sy = 1 + 0.011 * breath;
      const sx = 1 - 0.005 * breath;
      // A very small bob that follows the breath, and a slow lean.
      const bob = still ? 0 : -2.2 * Math.sin((t / 3.8) * TAU + 0.5);
      const sway = still ? 0 : 0.008 * Math.sin((t / 6.4) * TAU) + 0.004 * Math.sin((t / 2.9) * TAU + 1);
      // Tail: a gentle sway with a slower drift on top.
      // The tail wags faster while Ayin talks or is happy.
      const lively = !still && (mood === 'talking' || t < happyUntil);
      const tail = still
        ? 0
        : lively
          ? 0.11 * Math.sin((t / 0.7) * TAU)
          : 0.05 * Math.sin((t / 2.7) * TAU) + 0.018 * Math.sin((t / 1.25) * TAU + 0.7);

      if (!still && t >= nextBlink) {
        blinkStart = t;
        doubleAt = Math.random() < 0.2 ? t + 0.32 : -1;
        nextBlink = t + 2.8 + Math.random() * 2.7;
      }
      if (!still && doubleAt > 0 && t >= doubleAt) {
        blinkStart = t;
        doubleAt = -1;
      }
      const bt = t - blinkStart;
      // Happy: eyes squeezed shut for a moment, like a smile.
      const shut =
        !still && t < happyUntil ? 1 : bt < 0 || bt > 0.2 ? 0 : bt < 0.06 ? bt / 0.06 : bt < 0.12 ? 1 : 1 - (bt - 0.12) / 0.08;

      g.scale(k, k);
      g.translate(SEAT.x + (still ? 0 : shift.x), SEAT.y + bob + (still ? 0 : hop.x));
      g.rotate(sway + (still ? 0 : lean.x));
      // Squash: wider and shorter on landing, then back.
      g.scale(sx * (1 + 0.04 * squash.x), sy * (1 - 0.05 * squash.x));
      g.translate(-SEAT.x, -SEAT.y);

      g.save();
      g.translate(TAIL_PIVOT.x, TAIL_PIVOT.y);
      g.rotate(tail);
      g.translate(-TAIL_PIVOT.x, -TAIL_PIVOT.y);
      g.drawImage(layers.tail, 0, 0, SIZE, SIZE);
      g.restore();

      g.drawImage(layers.body, 0, 0, SIZE, SIZE);
      if (shut > 0) {
        g.globalAlpha = shut;
        g.drawImage(layers.eyes, 0, 0, SIZE, SIZE);
        g.globalAlpha = 1;
      }
    };

    const stopListening = () => {
      window.removeEventListener('pointermove', onPointer);
      cv.removeEventListener('pointerdown', onTap);
    };

    if (reduced || !active) {
      draw(0);
      const onResize = () => draw(0);
      window.addEventListener('resize', onResize);
      return () => {
        window.removeEventListener('resize', onResize);
        stopListening();
      };
    }

    let raf = 0;
    const loop = (now: number) => {
      draw(now / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      stopListening();
    };
  }, [layers, reduced, active]);

  return <canvas ref={canvas} className={className} aria-hidden />;
}
