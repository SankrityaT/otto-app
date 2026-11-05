"use client";

import { Bounds, Center, Line, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import type { RefObject } from "react";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Euler, Mesh, MeshStandardMaterial, Object3D, Quaternion, Vector3 } from "three";
import type { Scene } from "@/lib/ai/scene";

// Renders a "show me" scene: simple shapes from Claude, sticky-note labels on lines,
// and arrows for movements. The model fits itself to the frame and turns slowly until
// the student grabs it. The part to act on glows and arrows show the movement.
// With Reduce Motion on, everything holds still.

type Vec = Scene["parts"][number]["position"];

const LABEL_HEIGHT = 2.7; // how far above or below the model the labels sit
const NOTE_TONES: Record<Scene["labels"][number]["tone"], string> = {
  yellow: "bg-[#fbf1c7] border-[#e8c547]",
  pink: "bg-[#f9dfe3] border-[#e39aa8]",
  blue: "bg-[#dfe9f7] border-[#8fb0dd]",
  green: "bg-[#dcefe3] border-[#7fbf98]",
};

const toVector = (v: Vec) => new Vector3(v.x, v.y, v.z);
const toEuler = (v: Vec) => new Euler((v.x * Math.PI) / 180, (v.y * Math.PI) / 180, (v.z * Math.PI) / 180);

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)");
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
}

function Part({ part, still }: { part: Scene["parts"][number]; still: boolean }) {
  const material = useRef<MeshStandardMaterial>(null);
  const { x: w, y: h, z: d } = part.size;

  // The part to act on breathes a soft glow so the eye finds it.
  useFrame(({ clock }) => {
    if (!part.highlight || !material.current) return;
    material.current.emissiveIntensity = still ? 0.45 : 0.3 + 0.25 * (1 + Math.sin(clock.elapsedTime * 2.5)) * 0.5;
  });

  return (
    <mesh position={toVector(part.position)} rotation={toEuler(part.rotation)}>
      {part.shape === "box" && <boxGeometry args={[w, h, d]} />}
      {part.shape === "cylinder" && <cylinderGeometry args={[w / 2, w / 2, h, 32]} />}
      {part.shape === "cone" && <coneGeometry args={[w / 2, h, 32]} />}
      {part.shape === "sphere" && <sphereGeometry args={[w / 2, 32, 16]} />}
      {part.shape === "torus" && <torusGeometry args={[w / 2, Math.max(d, 0.02) / 2, 16, 48]} />}
      <meshStandardMaterial
        ref={material}
        color={part.color}
        roughness={0.6}
        emissive={part.highlight ? "#3e8e87" : "#000000"}
        emissiveIntensity={part.highlight ? 0.45 : 0}
      />
    </mesh>
  );
}

/** Where on-screen words should sit: a point in the 3D scene that the overlay follows. */
type Pins = RefObject<(Object3D | null)[]>;

type OnPin = (pin: Object3D | null) => void;

function StickyLabel({ label, anchor, onPin }: { label: Scene["labels"][number]; anchor: Vector3; onPin: OnPin }) {
  const end = new Vector3(anchor.x, label.side === "top" ? LABEL_HEIGHT : -LABEL_HEIGHT, anchor.z);
  return (
    <group>
      <Line points={[anchor, end]} color="#23201c" lineWidth={1.5} />
      <mesh position={anchor}>
        <sphereGeometry args={[0.05, 16, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <object3D position={end} ref={onPin} />
    </group>
  );
}

/**
 * Moves the HTML words (sticky notes, arrow names) to where their 3D points appear on
 * screen, every frame. Plain HTML over the canvas, so there are no extra React roots.
 */
function PinTracker({ pins, words }: { pins: Pins; words: RefObject<(HTMLElement | null)[]> }) {
  const point = useMemo(() => new Vector3(), []);
  useFrame(({ camera, size }) => {
    pins.current.forEach((pin, i) => {
      const word = words.current[i];
      if (!pin || !word) return;
      pin.getWorldPosition(point).project(camera);
      const x = ((point.x + 1) / 2) * size.width;
      const y = ((1 - point.y) / 2) * size.height;
      word.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
      word.style.opacity = point.z < 1 ? "1" : "0";
    });
  });
  return null;
}

function Arrow({ arrow, still, onPin }: { arrow: Scene["arrows"][number]; still: boolean; onPin: OnPin }) {
  const tip = useRef<Mesh>(null);
  const from = toVector(arrow.from);
  const to = toVector(arrow.to);
  const direction = to.clone().sub(from).normalize();
  const tipRotation = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction);

  // The arrowhead travels along the line, again and again, to show the movement.
  useFrame(({ clock }) => {
    if (!tip.current) return;
    const progress = still ? 1 : (clock.elapsedTime * 0.6) % 1;
    tip.current.position.lerpVectors(from, to, progress);
  });

  return (
    <group>
      <Line points={[from, to]} color="#2b6652" lineWidth={4} dashed dashSize={0.15} gapSize={0.1} />
      <mesh ref={tip} position={to} quaternion={tipRotation}>
        <coneGeometry args={[0.12, 0.3, 24]} />
        <meshStandardMaterial color="#2b6652" />
      </mesh>
      <object3D position={from} ref={onPin} />
    </group>
  );
}

export function ShowMe3D({ scene }: { scene: Scene }) {
  const still = usePrefersReducedMotion();
  const [grabbed, setGrabbed] = useState(false);
  const partsById = useMemo(() => new Map(scene.parts.map((part) => [part.id, part])), [scene]);
  const labels = scene.labels.filter((label) => partsById.has(label.partId));
  const pins = useRef<(Object3D | null)[]>([]);
  const words = useRef<(HTMLElement | null)[]>([]);

  return (
    <figure className="graph-paper flex w-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-line">
      <figcaption className="px-5 pt-4 font-hand text-[26px] leading-tight text-ink">{scene.title}</figcaption>
      <div className="relative aspect-square w-full touch-none overflow-hidden" aria-label={`3D model: ${scene.title}`} role="img">
        <Canvas camera={{ position: [4, 2.6, 4.8], fov: 45 }}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 8, 5]} intensity={1.4} />
          <directionalLight position={[-6, 3, -4]} intensity={0.4} />
          {/* Bounds moves the camera so the whole model, labels included, fills the frame. */}
          <Bounds fit clip observe margin={1.15}>
            <Center>
              {scene.parts.map((part) => (
                <Part key={part.id} part={part} still={still} />
              ))}
              {labels.map((label, i) => (
                <StickyLabel
                  key={label.text}
                  label={label}
                  anchor={toVector(partsById.get(label.partId)!.position)}
                  onPin={(pin) => {
                    pins.current[i] = pin;
                  }}
                />
              ))}
              {scene.arrows.map((arrow, i) => (
                <Arrow
                  key={arrow.meaning}
                  arrow={arrow}
                  still={still}
                  onPin={(pin) => {
                    pins.current[labels.length + i] = pin;
                  }}
                />
              ))}
            </Center>
          </Bounds>
          <OrbitControls
            makeDefault
            enablePan={false}
            autoRotate={!still && !grabbed}
            autoRotateSpeed={0.8}
            onStart={() => setGrabbed(true)}
          />
          <PinTracker pins={pins} words={words} />
        </Canvas>
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {labels.map((label, i) => (
            <span
              key={label.text}
              ref={(word) => void (words.current[i] = word)}
              className={`absolute left-0 top-0 whitespace-nowrap rounded-sm border-l-4 px-2.5 py-1 font-hand text-[18px] text-[#23201c] opacity-0 shadow-sm ${NOTE_TONES[label.tone]}`}
            >
              {label.text}
            </span>
          ))}
          {scene.arrows.map((arrow, i) => (
            <span
              key={arrow.meaning}
              ref={(word) => void (words.current[labels.length + i] = word)}
              className="absolute left-0 top-0 whitespace-nowrap font-hand text-[16px] text-cel-deep opacity-0"
            >
              {arrow.meaning}
            </span>
          ))}
        </div>
      </div>
      <p className="px-5 pb-4 text-[15px] text-ink-3">Drag to turn it</p>
    </figure>
  );
}
