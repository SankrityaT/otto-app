'use client';

/**
 * Written by Havi (@Havishea) for the Ayin team and copied from
 * https://github.com/Havishea/Ayin. We changed the default asset folder, moved the fur tint into useMemo to satisfy
 * our lint rules, and draw the layers at a fixed size so 2048 px art stays sharp. On the landing page the whole
 * tail is one layer that swings from its root, so the pivot moved; the layers are shrunk to the canvas once
 * instead of every frame, so it stays smooth; and blinks are a solid eyelid closing, like the floating otter's,
 * instead of a fade.
 *
 * UprightOtter: the otter sitting up, holding its stone. Shown while you ask
 * something or while Ayin is explaining a task.
 *
 * It is drawn live on a canvas at the screen's frame rate from three layers
 * (1024×1024, made from Havishea's upright drawing):
 *   upright-body.png  the otter without its tail
 *   upright-tail.png  the tail on its own, swung from its base
 *   upright-eyes.png  the closed eyelids' fur; revealed from the top down for blinks
 *   upright-lash.png  the closed-eye lines, which ride the eyelid's edge down
 *
 * Motion is kept small: slow breathing, a very slight bob and lean,
 * a gentle tail sway, and a blink every few seconds.
 * With Reduce Motion it holds still.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { asset } from '@/landing/lib/site';

export type UprightSources = { body: string; tail: string; eyes: string; lash: string };

/** The drawing's coordinate space. The art files can be larger; they are drawn into this space. */
const SIZE = 1024;
/** The sharpest the canvas gets, matching the 2048 px art. */
const MAX_PIXELS = 2048;
/** The otter breathes and leans from the middle of its seat. */
const SEAT = { x: 512, y: 880 };
/** The tail swings from its root, where it leaves the hip along the floor (see scripts/fix_upright_tail.py). */
const TAIL_PIVOT = { x: 739, y: 830 };
/** The eyelid's travel: from just above the eyes to the bottom of the closed-eyes layer (printed by scripts/redraw_closed_eyes.py). */
const LID = { top: 401, bottom: 494 };
/** Where the closed-eye lines rest. They ride the eyelid's edge down until they get here. */
const LASH_Y = 440;

const smoothstep = (lo: number, hi: number, x: number) => {
  const u = Math.max(0, Math.min(1, (x - lo) / (hi - lo)));
  return u * u * (3 - 2 * u);
};
/** The floating otter's blink: close in 0.20s, hold 0.08s, reopen in 0.28s. */
const blinkClosure = (d: number) => {
  if (d < 0 || d >= 0.56) return 0;
  if (d < 0.2) return smoothstep(0, 0.2, d);
  if (d < 0.28) return 1;
  return 1 - smoothstep(0.28, 0.56, d);
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });

/** The same fur-only hue shift as the floating otter's shader (hue 2–58°, enough colour and light). */
function tint(img: HTMLImageElement, hue: number): CanvasImageSource {
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
  assetBase = asset('/otter'),
  furHue = 0,
  active = true,
  className,
}: {
  sources?: UprightSources;
  assetBase?: string;
  furHue?: number;
  /** Only animate while shown; it rests (and costs nothing) otherwise. */
  active?: boolean;
  className?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [imgs, setImgs] = useState<{ body: HTMLImageElement; tail: HTMLImageElement; eyes: HTMLImageElement; lash: HTMLImageElement } | null>(null);
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
    const s = sources ?? {
      body: `${assetBase}/upright-body.png`,
      tail: `${assetBase}/upright-tail.png`,
      eyes: `${assetBase}/upright-eyes.png`,
      lash: `${assetBase}/upright-lash.png`,
    };
    Promise.all([loadImage(s.body), loadImage(s.tail), loadImage(s.eyes), loadImage(s.lash)])
      .then(([body, tail, eyes, lash]) => live && setImgs({ body, tail, eyes, lash }))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [assetBase, sources]);

  const layers = useMemo(
    () => imgs && { body: tint(imgs.body, furHue), tail: tint(imgs.tail, furHue), eyes: tint(imgs.eyes, furHue), lash: imgs.lash },
    [imgs, furHue],
  );

  useEffect(() => {
    const cv = canvas.current;
    if (!cv || !layers) return;
    const g = cv.getContext('2d');
    if (!g) return;

    // Shrinking 2048 px layers on every frame is slow and makes the motion stutter.
    // Shrink them to the canvas size once (and again only if the size changes).
    let sized: { px: number; body: CanvasImageSource; tail: CanvasImageSource; eyes: CanvasImageSource; lash: CanvasImageSource } | null = null;
    const shrink = (img: CanvasImageSource, px: number) => {
      const c = document.createElement('canvas');
      c.width = c.height = px;
      const cg = c.getContext('2d');
      if (!cg) return img;
      cg.imageSmoothingQuality = 'high';
      cg.drawImage(img, 0, 0, px, px);
      return c;
    };
    const fit = () => {
      const px = Math.min(MAX_PIXELS, Math.round(cv.clientWidth * (window.devicePixelRatio || 1)));
      if (px > 0 && cv.width !== px) {
        cv.width = px;
        cv.height = px;
      }
      if (cv.width > 0 && sized?.px !== cv.width) {
        const px = cv.width;
        sized = { px, body: shrink(layers.body, px), tail: shrink(layers.tail, px), eyes: shrink(layers.eyes, px), lash: shrink(layers.lash, px) };
      }
      return sized ?? layers;
    };

    // Blinks: a quick close and open every 2.8–5.5s, now and then a double blink.
    let nextBlink = 1.6;
    let blinkStart = -10;
    let doubleAt = -1;

    const draw = (t: number) => {
      const art = fit();
      const k = cv.width / SIZE;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, cv.width, cv.height);
      g.imageSmoothingQuality = 'high';

      const still = reduced || !active;
      const TAU = Math.PI * 2;
      // Slow breath (3.8s): a touch taller and narrower on the in-breath.
      const breath = still ? 0 : Math.sin((t / 3.8) * TAU);
      const sy = 1 + 0.011 * breath;
      const sx = 1 - 0.005 * breath;
      // A very small bob that follows the breath, and a slow lean.
      const bob = still ? 0 : -2.2 * Math.sin((t / 3.8) * TAU + 0.5);
      const lean = still ? 0 : 0.008 * Math.sin((t / 6.4) * TAU) + 0.004 * Math.sin((t / 2.9) * TAU + 1);
      // Tail: a gentle sway with a slower drift on top.
      const tail = still ? 0 : 0.05 * Math.sin((t / 2.7) * TAU) + 0.018 * Math.sin((t / 1.25) * TAU + 0.7);

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
      const shut = still ? 0 : blinkClosure(bt);

      g.scale(k, k);
      g.translate(SEAT.x, SEAT.y + bob);
      g.rotate(lean);
      g.scale(sx, sy);
      g.translate(-SEAT.x, -SEAT.y);

      g.save();
      g.translate(TAIL_PIVOT.x, TAIL_PIVOT.y);
      g.rotate(tail);
      g.translate(-TAIL_PIVOT.x, -TAIL_PIVOT.y);
      g.drawImage(art.tail, 0, 0, SIZE, SIZE);
      g.restore();

      g.drawImage(art.body, 0, 0, SIZE, SIZE);
      // The eyelid: solid fur, shown from the top down as the eye shuts. Its edge carries the
      // closed-eye lines down, which stop where the closed eye rests while the lid finishes.
      if (shut > 0) {
        const edge = LID.top + (LID.bottom - LID.top) * shut;
        g.save();
        g.beginPath();
        g.rect(0, LID.top, SIZE, edge - LID.top);
        g.clip();
        g.drawImage(art.eyes, 0, 0, SIZE, SIZE);
        g.restore();
        g.drawImage(art.lash, 0, Math.min(edge, LASH_Y) - LASH_Y, SIZE, SIZE);
      }
    };

    if (reduced || !active) {
      draw(0);
      const onResize = () => draw(0);
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }

    let raf = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      draw((now - t0) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [layers, reduced, active]);

  return <canvas ref={canvas} className={className} aria-hidden />;
}
