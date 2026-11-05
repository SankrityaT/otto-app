/*
 * Written by Havi (@Havishea) for the Ayin team, from https://github.com/Havishea/Ayin.
 * Unchanged.
 */
/**
 * Motion and WebGL renderer for the Ayin calm otter (v6 motion).
 * Framework-free. The React wrapper lives in AyinOtter.tsx.
 *
 * Built on render-v5.swift (same pond bob, neck-localized head warp, 11 solid
 * eyelid drawings), plus:
 *  - curious head tilts: a head cock of about +6..8.5° (sometimes −4..6° the other way),
 *    held for a moment with a small settle, every ~6–11s at random
 *  - tail: a continuous gentle sway (about ±4°), and every 15–20s a big swing to the
 *    left (−22°) that springs back with a damped wobble
 *  - when the tail swings, the whole otter and pond dip and rock harder in the water
 *    (extra bob up to ~6px plus a ±1.6° roll, settling over about 4s)
 *  - blinks at random intervals of 2.8–6s, with an occasional double blink
 *
 * Events come from a seeded random generator, so a given seed always plays the same way.
 */

// ---------------------------------------------------------------------------
// Motion
// ---------------------------------------------------------------------------

export type OtterPose = {
  bobPx: number;
  rollDegrees: number;
  headTiltDegrees: number;
  tailDegrees: number; // negative swings the tail to the left
  eyelidFrame: number; // 0 open .. 10 closed
  /** Water ripples: [drift clock s (−1 = still), unused, seconds since the tail swing (−1 = none), swing strength]. */
  ripples?: [number, number, number, number];
};

type Ev = { kind: 'blink' | 'curious' | 'swing'; at: number; dur: number; amp: number };

const smoothstep = (lo: number, hi: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Blink: close 0.20s, hold 0.08s, reopen 0.28s (as in v5).
const blinkClosure = (d: number) => {
  if (d < 0) return 0;
  if (d < 0.2) return smoothstep(0, 0.2, d);
  if (d < 0.28) return 1;
  if (d < 0.56) return 1 - smoothstep(0.28, 0.56, d);
  return 0;
};

// Curious head cock: quick lean in, a small settle while holding, slow return.
const curiousTilt = (d: number, dur: number, amp: number) => {
  if (d < 0 || d > dur) return 0;
  const env = smoothstep(0, 0.5, d) * (1 - smoothstep(dur - 0.9, dur, d));
  const settle = 0.1 * Math.sin((2 * Math.PI * (d - 0.5)) / 1.1) * smoothstep(0.45, 0.7, d) * (1 - smoothstep(dur - 1.2, dur - 0.8, d));
  return amp * (env + settle);
};

// Tail swing: whip to the left, then spring back with a damped wobble.
const swingTail = (d: number, amp: number) => {
  if (d < 0 || d > 4) return 0;
  if (d < 0.45) return amp * smoothstep(0, 0.45, d);
  const u = d - 0.45;
  return amp * Math.exp(-u / 0.6) * Math.cos((2 * Math.PI * u) / 1.3) * (1 - smoothstep(3.3, 4, d));
};

// The pond reacts to the swing: a dip and a rock that settle over ~4s.
const SPLASH_DELAY = 0.25;
const splash = (d: number) => {
  const u = d - SPLASH_DELAY;
  if (u <= 0 || u > 5) return { bob: 0, roll: 0 };
  const env = Math.exp(-u / 1.3) * (1 - smoothstep(4, 5, u));
  return {
    bob: 6 * env * Math.sin((2 * Math.PI * u) / 1.6),
    roll: 1.6 * env * Math.sin((2 * Math.PI * u) / 1.6 + 0.8) * smoothstep(0, 0.3, u),
  };
};

export type OtterMotion = {
  pose: (time: number) => OtterPose;
  /** Play a tail swing (with the pond splash), a curious head tilt or a blink now. The random schedule continues afterwards. */
  trigger: (kind: 'swing' | 'curious' | 'blink', time: number) => void;
  /** True while a triggered or scheduled move is still playing at `time`. */
  isMoving: (time: number) => boolean;
};

export type OtterMotionOptions = {
  /**
   * 'idle' (default): the original loop, with bob, sway, blinks, tilts and tail swings on a schedule.
   * 'reactive': no ambient motion at all. The otter holds still and moves only when trigger() is called.
   */
  mode?: 'idle' | 'reactive';
};

/** Create a motion timeline. Times are seconds since the animation started. */
export function createOtterMotion(seed = 7, options: OtterMotionOptions = {}): OtterMotion {
  const ambient = (options.mode ?? 'idle') === 'idle';
  const rand = mulberry32(seed);
  const between = (a: number, b: number) => a + (b - a) * rand();
  const events: Ev[] = [];
  let nextSwing = 4.5; // show the first swing early, then every 15-20s
  let nextCurious = 2.2;
  let nextBlink = 1.2;
  let horizon = 0;

  // Keep curious tilts clear of tail swings so each moment reads on its own.
  const busy = (from: number, to: number) =>
    events.some((e) => e.kind === 'swing' && from < e.at + 4.5 && to > e.at - 0.5);

  const extend = (until: number) => {
    if (!ambient) {
      horizon = until;
      for (let i = events.length - 1; i >= 0; i--) if (events[i].at + events[i].dur < until - 60) events.splice(i, 1);
      return;
    }
    while (nextSwing < until + 30) {
      const at = nextSwing;
      events.push({ kind: 'swing', at, dur: 6, amp: -22 });
      for (let i = events.length - 1; i >= 0; i--) {
        const e = events[i];
        if (e.kind === 'curious' && e.at < at + 4.5 && e.at + e.dur > at - 0.5) events.splice(i, 1);
      }
      nextSwing += between(15, 20);
    }
    while (nextCurious < until) {
      const dur = between(2.4, 3.4);
      if (busy(nextCurious, nextCurious + dur)) {
        nextCurious += 1.5;
        continue;
      }
      const amp = rand() < 0.7 ? between(6, 8.5) : -between(4, 6);
      events.push({ kind: 'curious', at: nextCurious, dur, amp });
      nextCurious += dur + between(4, 8);
    }
    while (nextBlink < until) {
      events.push({ kind: 'blink', at: nextBlink, dur: 0.56, amp: 1 });
      if (rand() < 0.2) {
        events.push({ kind: 'blink', at: nextBlink + 0.62, dur: 0.56, amp: 1 });
        nextBlink += 0.62;
      }
      nextBlink += between(2.8, 6);
    }
    horizon = until;
    // Forget events that finished long ago.
    for (let i = events.length - 1; i >= 0; i--) if (events[i].at + events[i].dur < until - 60) events.splice(i, 1);
  };

  return {
    trigger(kind, time) {
      if (time + 10 > horizon) extend(time + 20);
      if (kind === 'swing') {
        if (events.some((e) => e.kind === 'swing' && time - e.at >= 0 && time - e.at < 2)) return;
        for (let i = events.length - 1; i >= 0; i--) {
          const e = events[i];
          if ((e.kind === 'swing' && e.at > time) || (e.kind === 'curious' && e.at > time - 0.5 && e.at < time + 4.5)) events.splice(i, 1);
        }
        events.push({ kind: 'swing', at: time, dur: 6, amp: -22 });
        nextSwing = time + between(15, 20);
        horizon = 0; // regenerate the schedule after this swing
      } else if (kind === 'blink') {
        if (events.some((e) => e.kind === 'blink' && time >= e.at && time <= e.at + e.dur)) return;
        events.push({ kind: 'blink', at: time, dur: 0.56, amp: 1 });
      } else {
        if (events.some((e) => e.kind !== 'blink' && time >= e.at - 0.5 && time <= e.at + e.dur)) return;
        const dur = between(2.4, 3.4);
        events.push({ kind: 'curious', at: time, dur, amp: rand() < 0.7 ? between(6, 8.5) : -between(4, 6) });
        nextCurious = Math.max(nextCurious, time + dur + between(4, 8));
      }
    },
    isMoving(time: number) {
      return ambient || events.some((e) => time >= e.at && time <= e.at + e.dur);
    },
    pose(time: number): OtterPose {
      if (time + 10 > horizon) extend(time + 20);
      const a = ambient ? 1 : 0;
      let bob = a * 4 * Math.sin((2 * Math.PI * time) / 6);
      let roll = 0;
      let head = a * 0.5 * Math.sin((2 * Math.PI * time) / 7.3); // faint idle drift
      let tail = a * (3.2 * Math.sin((2 * Math.PI * time) / 3.2) + 1.0 * Math.sin((2 * Math.PI * time) / 1.7 + 1));
      let closure = 0;
      for (const e of events) {
        const d = time - e.at;
        if (d < 0 || d > e.dur) continue;
        if (e.kind === 'blink') closure = Math.max(closure, blinkClosure(d));
        else if (e.kind === 'curious') head += curiousTilt(d, e.dur, e.amp);
        else {
          tail += swingTail(d, e.amp);
          const s = splash(d);
          bob += s.bob;
          roll += s.roll;
        }
      }
      // Ripples: the painted water lines drift outward in a slow, steady cycle,
      // and a tail swing sends out bigger, faster rings.
      let swingAge = -1;
      for (const e of events) if (e.kind === 'swing' && time >= e.at && time - e.at < 5.5) swingAge = time - e.at - 0.2;
      return {
        ripples: [ambient ? time : -1, 0, swingAge, swingAge >= 0 ? 1 : 0],
        bobPx: bob,
        rollDegrees: roll,
        headTiltDegrees: head,
        tailDegrees: tail,
        eyelidFrame: Math.min(10, Math.max(0, Math.round(closure * 10))),
      };
    },
  };
}

// ---------------------------------------------------------------------------
// WebGL renderer
// ---------------------------------------------------------------------------

export const SRC = 512; // artwork size in pixels
const EYE = { x: 128, y: 200, w: 136, h: 72, frames: 11 }; // otter-eyelids.png tiles
const TAIL = { x: 380, y: 200, w: 132, h: 200, px: 440, py: 340 }; // otter-tail.png tiles + root pivot

const VERT = `attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `precision highp float;
uniform sampler2D uBase;
uniform sampler2D uEyes;
uniform sampler2D uTail;  // left tile: pond with the tail removed, right tile: tail alone
uniform float uScale;     // canvas pixels per artwork pixel
uniform float uHeight;    // canvas height in pixels
uniform float uBob;       // px, positive moves down
uniform float uRoll;      // whole-scene rock, radians
uniform float uAngle;     // head tilt, radians
uniform float uTailA;     // tail angle, radians
uniform float uEye;       // eyelid frame 0..10
uniform vec4 uRip;        // ripples: drift clock, -, swing age, swing strength
uniform float uFur;       // fur colour: hue shift in turns (0 = the painted brown)

vec2 rot(vec2 v, float a) { return vec2(cos(a) * v.x - sin(a) * v.y, sin(a) * v.x + cos(a) * v.y); }

vec4 tile(vec2 q, float col) {
  q = clamp(q, vec2(0.5), vec2(${TAIL.w}.0 - 0.5, ${TAIL.h}.0 - 0.5));
  return texture2D(uTail, vec2((q.x + col * ${TAIL.w}.0) / ${TAIL.w * 2}.0, q.y / ${TAIL.h}.0));
}

// Fur colour: only the brown fur (and its darker paw pads) is shifted in hue.
// Cream belly, eyes, nose, stone and water are left exactly as painted.
vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-10)), d / (q.x + 1e-10), q.x);
}
vec3 hsv2rgb(vec3 c) {
  vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
  return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}
vec4 tintFur(vec4 c) {
  if (uFur == 0.0 || c.a < 0.01) return c;
  vec3 u = c.rgb / c.a;
  vec3 h = rgb2hsv(u);
  float deg = h.x * 360.0;
  float m = smoothstep(2.0, 10.0, deg) * (1.0 - smoothstep(48.0, 58.0, deg))
          * smoothstep(0.12, 0.19, h.y) * smoothstep(0.1, 0.22, h.z);
  vec3 t = hsv2rgb(vec3(fract(h.x + uFur), h.y, h.z));
  return vec4(mix(u, t, m) * c.a, c.a);
}

vec4 scene(vec2 s) {
  vec4 col = vec4(0.0);
  if (s.x >= 0.0 && s.y >= 0.0 && s.x < ${SRC - 1}.0 && s.y < ${SRC - 1}.0) {
    vec2 e = s - vec2(${EYE.x}.0, ${EYE.y}.0);
    vec2 t = s - vec2(${TAIL.x}.0, ${TAIL.y}.0);
    if (e.x >= 1.0 && e.y >= 1.0 && e.x <= ${EYE.w - 2}.0 && e.y <= ${EYE.h - 2}.0) {
      col = texture2D(uEyes, vec2((e.x + 0.5) / ${EYE.w}.0, (uEye * ${EYE.h}.0 + e.y + 0.5) / ${EYE.h * EYE.frames}.0));
    } else if (t.x >= 0.0 && t.y >= 0.0 && t.x < ${TAIL.w}.0 && t.y < ${TAIL.h}.0) {
      col = tile(t + 0.5, 0.0);
    } else {
      col = texture2D(uBase, (s + 0.5) / ${SRC}.0);
    }
  }

  return col;
}

// Painted water highlight (pale, green-leaning) or empty pond.
bool isWater(vec4 c) {
  if (c.a < 0.04) return true;
  vec3 u = c.rgb / c.a;
  float l = (u.r + u.g + u.b) / 3.0;
  return u.g >= u.r - 0.005 && l > 0.85;
}

const vec2 RIP_C = vec2(262.0, 372.0);   // middle of the water around the otter
const vec2 RIP_T = vec2(440.0, 356.0);   // where the tail meets the water

bool inStone(vec2 s) { return s.x > 208.0 && s.x < 310.0 && s.y > 266.0 && s.y < 340.0; }

// Only the painted white water lines, nothing else.
vec4 lines(vec2 s) {
  if (inStone(s) || s.y < 322.0) return vec4(0.0); // water only: skip eye glints and the stone's shine
  vec4 c = scene(s);
  if (c.a < 0.04) return vec4(0.0);
  vec3 u = c.rgb / c.a;
  float l = (u.r + u.g + u.b) / 3.0;
  return (u.g >= u.r - 0.005 && l > 0.85) ? c : vec4(0.0);
}

// One ripple: a clean line of even width around an ellipse (the pond is wider than
// it is tall), with a few long, wide waves along it that slowly travel.
const float FLAT = 2.5;
const vec3 RIP_COL = vec3(0.95, 0.98, 0.96);
float ring(vec2 s, vec2 c, float R, float amp, float t, float seed) {
  vec2 e = (s - c) * vec2(1.0, FLAT);
  float r = length(e);
  float ang = atan(e.y, e.x);
  float sq = sin(ang * 3.0 + t * 0.6 + seed) * 0.7 + sin(ang * 5.0 - t * 0.4 + seed * 2.0) * 0.3;
  // Distance to the wavy line, corrected for the squash so the width stays even.
  float d = abs(r - (R + sq * amp));
  float g = length(vec2(e.x, e.y * FLAT)) / max(r, 1.0);
  d /= max(g, 1.0);
  // Water only, below the otter's arms: the line softly fades in at the top.
  float m = smoothstep(326.0, 352.0, s.y);
  return (1.0 - smoothstep(1.4, 2.6, d)) * m;
}

// Soft fade at the edges of the canvas so rings never end in a hard line.
float edgeFade(vec2 p) {
  return smoothstep(0.0, 46.0, p.x) * smoothstep(${SRC}.0, ${SRC - 46}.0, p.x) * smoothstep(${SRC}.0, ${SRC - 30}.0, p.y);
}

void main() {
  // Raster coordinates in artwork space (x right, y down), as in render-v5.swift.
  vec2 p = vec2(gl_FragCoord.x / uScale - 0.5, (uHeight - gl_FragCoord.y) / uScale - 0.5);

  // Whole scene: bob, then a gentle rock around the middle of the pond.
  p.y -= uBob;
  p = vec2(256.0, 340.0) + rot(p - vec2(256.0, 340.0), -uRoll);

  // Neck-localized head warp (unchanged from v5).
  float w = (1.0 - smoothstep(269.0, 328.0, p.y)) * (1.0 - smoothstep(275.0, 331.0, p.x));
  vec2 s = vec2(209.0, 289.0) + rot(p - vec2(209.0, 289.0), -uAngle * w);

  vec4 col = scene(s);
  // Ripples: replace the still water lines with copies that drift outward and fade.
  // The otter itself is never touched.
  if (isWater(col) && !inStone(s) && uRip.x >= 0.0) {
    float acc = 0.0;
    float fade = edgeFade(p);
    // Calm cycle: two rings, each taking 8s to drift a long way out.
    for (int i = 0; i < 2; i++) {
      float u = fract(uRip.x / 8.0 + float(i) / 2.0);
      float a = smoothstep(0.0, 0.15, u) * pow(1.0 - u, 1.3) * 0.75;
      acc = max(acc, ring(s, RIP_C, 110.0 + 150.0 * u, 7.0 + 14.0 * u, uRip.x, float(i) * 2.1) * a);
    }
    // Tail swing: two bigger rings, one from the tail and one around the otter.
    if (uRip.z >= 0.0) {
      for (int j = 0; j < 2; j++) {
        float u = clamp((uRip.z - float(j) * 0.7) / 3.4, 0.0, 1.0);
        float a = uRip.w * smoothstep(0.0, 0.06, u) * pow(1.0 - u, 1.1) * (u < 1.0 ? 1.0 : 0.0) * 0.9;
        float R = j == 0 ? 30.0 + 220.0 * u : 120.0 + 200.0 * u;
        acc = max(acc, ring(s, j == 0 ? RIP_T : RIP_C, R, 10.0 + 18.0 * u, uRip.z * 2.0, 4.0 + float(j)) * a);
      }
    }
    acc *= fade;
    col = vec4(RIP_COL * acc, acc);
  }

  // Tail layer: rotates around its root, bending more toward the tip.
  vec2 pv = vec2(${TAIL.px}.0, ${TAIL.py}.0);
  vec2 dv = p - pv;
  // The root stays attached: no bend near the cut beside the foot (lower left).
  float root = (1.0 - smoothstep(410.0, 445.0, p.x)) * smoothstep(295.0, 335.0, p.y);
  float bend = smoothstep(20.0, 90.0, length(dv)) * (1.0 - root);
  vec2 ts = pv + rot(dv, -uTailA * bend) - vec2(${TAIL.x}.0, ${TAIL.y}.0);
  if (ts.x >= 0.0 && ts.y >= 0.0 && ts.x < ${TAIL.w}.0 && ts.y < ${TAIL.h}.0) {
    vec4 tc = tile(ts + 0.5, 1.0);
    col = tc + col * (1.0 - tc.a);
  }
  gl_FragColor = tintFur(col);
}`;

export type OtterRenderer = {
  draw: (pose: OtterPose) => void;
  /** Fur hue shift in degrees (0 = the painted brown). Takes effect on the next draw. */
  setFurHue: (degrees: number) => void;
  resize: (pixels: number) => void;
  dispose: () => void;
};

export function createOtterRenderer(
  canvas: HTMLCanvasElement,
  images: { base: HTMLImageElement; eyes: HTMLImageElement; tail: HTMLImageElement },
): OtterRenderer | null {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) return null;

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link');
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  // Premultiplied sampling matches the Swift renderer, which interpolates premultiplied RGBA.
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  const textures = [images.base, images.eyes, images.tail].map((img, unit) => {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    return t;
  });

  const u = (n: string) => gl.getUniformLocation(prog, n);
  const U = {
    scale: u('uScale'), height: u('uHeight'), bob: u('uBob'), roll: u('uRoll'),
    angle: u('uAngle'), tail: u('uTailA'), eye: u('uEye'), rip: u('uRip'), fur: u('uFur'),
  };
  gl.uniform1i(u('uBase'), 0);
  gl.uniform1i(u('uEyes'), 1);
  gl.uniform1i(u('uTail'), 2);

  const rad = Math.PI / 180;
  const resize = (pixels: number) => {
    if (canvas.width === pixels) return;
    canvas.width = canvas.height = pixels;
    gl.viewport(0, 0, pixels, pixels);
  };
  resize(SRC);

  gl.uniform1f(U.fur, 0);

  return {
    resize,
    setFurHue(degrees) {
      gl.uniform1f(U.fur, (((degrees % 360) + 360) % 360) / 360);
    },
    draw(pose) {
      gl.uniform1f(U.scale, canvas.width / SRC);
      gl.uniform1f(U.height, canvas.height);
      gl.uniform1f(U.bob, pose.bobPx);
      gl.uniform1f(U.roll, pose.rollDegrees * rad);
      gl.uniform1f(U.angle, pose.headTiltDegrees * rad);
      gl.uniform1f(U.tail, pose.tailDegrees * rad);
      gl.uniform1f(U.eye, pose.eyelidFrame);
      const rp = pose.ripples ?? [-1, 0, -1, 0];
      gl.uniform4f(U.rip, rp[0], rp[1], rp[2], rp[3]);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    dispose() {
      textures.forEach((t) => gl.deleteTexture(t));
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    },
  };
}
