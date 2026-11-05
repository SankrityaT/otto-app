"use client";

import { Bounds, Center, Line, OrbitControls, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import type { RefObject } from "react";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { DoubleSide, Euler, Mesh, MeshStandardMaterial, Object3D, Quaternion, Vector3 } from "three";
import type { Scene } from "@/lib/ai/scene";

// Renders a "show me" scene: simple shapes from Claude, sticky-note labels in tidy rows above
// and below the model with a line to each part, and arrows for movements. The model fits
// itself to the frame and turns slowly until the student grabs it. With Reduce Motion on,
// everything holds still.

type Vec = Scene["parts"][number]["position"];
type Label = Scene["labels"][number];

const NOTE_TONES: Record<Label["tone"], string> = {
  yellow: "bg-[#fbf1c7] border-[#e8c547]",
  pink: "bg-[#f9dfe3] border-[#e39aa8]",
  blue: "bg-[#dfe9f7] border-[#8fb0dd]",
  green: "bg-[#dcefe3] border-[#7fbf98]",
};
/** Space kept between two notes in the same row, and from the frame's edges. */
const GAP = 8;
const ROW_INSET = 26;

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

export function Part({ part, still }: { part: Scene["parts"][number]; still: boolean }) {
  const material = useRef<MeshStandardMaterial>(null);
  const { x: w, y: h, z: d } = part.size;

  // The part to act on breathes a soft glow so the eye finds it.
  useFrame(({ clock }) => {
    if (!part.highlight || !material.current) return;
    material.current.emissiveIntensity = still ? 0.45 : 0.3 + 0.25 * (1 + Math.sin(clock.elapsedTime * 2.5)) * 0.5;
  });

  const surface = (
    <meshStandardMaterial
      ref={material}
      color={part.color}
      roughness={0.6}
      side={part.shape === "cup" ? DoubleSide : undefined}
      emissive={part.highlight ? "#3e8e87" : "#000000"}
      emissiveIntensity={part.highlight ? 0.45 : 0}
    />
  );

  if (part.shape === "rounded-box") {
    return (
      <RoundedBox args={[w, h, d]} radius={Math.min(w, h, d) * 0.15} position={toVector(part.position)} rotation={toEuler(part.rotation)}>
        {surface}
      </RoundedBox>
    );
  }

  if (part.shape === "cup") {
    // A container open at the top: a thin wall that narrows a little toward the base, and a floor.
    return (
      <group position={toVector(part.position)} rotation={toEuler(part.rotation)}>
        <mesh>
          <cylinderGeometry args={[w / 2, (w / 2) * 0.88, h, 40, 1, true]} />
          {surface}
        </mesh>
        <mesh position={[0, -h / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[(w / 2) * 0.88, 40]} />
          <meshStandardMaterial color={part.color} roughness={0.6} side={DoubleSide} />
        </mesh>
      </group>
    );
  }

  return (
    <mesh position={toVector(part.position)} rotation={toEuler(part.rotation)}>
      {part.shape === "box" && <boxGeometry args={[w, h, d]} />}
      {part.shape === "cylinder" && <cylinderGeometry args={[w / 2, w / 2, h, 40]} />}
      {part.shape === "cone" && <coneGeometry args={[w / 2, h, 40]} />}
      {part.shape === "sphere" && <sphereGeometry args={[w / 2, 32, 16]} />}
      {/* A ring's thickness is its smallest size, whichever axis the model put it on. */}
      {part.shape === "torus" && <torusGeometry args={[w / 2, Math.max(Math.min(w, h, d), 0.02) / 2, 16, 48]} />}
      {surface}
    </mesh>
  );
}

function Arrow({ arrow, still, onPin }: { arrow: Scene["arrows"][number]; still: boolean; onPin: (pin: Object3D | null) => void }) {
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

type Refs<T> = RefObject<(T | null)[]>;

/**
 * Every frame: find where each labelled part is on screen, then lay its note out in a tidy
 * row along the top or bottom edge, spread apart so no two notes overlap, with a line from
 * the note to its part. Arrow names sit at the start of their arrow.
 */
function LabelLayout({
  labels,
  anchors,
  notes,
  lines,
  arrowPins,
  arrowWords,
}: {
  labels: Label[];
  anchors: Refs<Object3D>;
  notes: Refs<HTMLElement>;
  lines: Refs<SVGLineElement>;
  arrowPins: Refs<Object3D>;
  arrowWords: Refs<HTMLElement>;
}) {
  const point = useMemo(() => new Vector3(), []);

  useFrame(({ camera, size }) => {
    const toScreen = (object: Object3D) => {
      object.getWorldPosition(point).project(camera);
      return { x: ((point.x + 1) / 2) * size.width, y: ((1 - point.y) / 2) * size.height, visible: point.z < 1 };
    };

    for (const side of ["top", "bottom"] as const) {
      const row = labels
        .map((label, i) => ({ i, label, anchor: anchors.current[i], note: notes.current[i] }))
        .filter((item) => item.label.side === side && item.anchor && item.note)
        .map((item) => ({ ...item, at: toScreen(item.anchor!), width: item.note!.offsetWidth, height: item.note!.offsetHeight }))
        .sort((a, b) => a.at.x - b.at.x);

      // Sweep left to right, pushing notes apart, then pull the row back inside the frame.
      let right = GAP;
      const placed = row.map((item) => {
        const left = Math.max(item.at.x - item.width / 2, right);
        right = left + item.width + GAP;
        return left;
      });
      const overflow = right - size.width;
      if (overflow > 0) for (let k = 0; k < placed.length; k++) placed[k] = Math.max(GAP, placed[k] - overflow);

      row.forEach((item, k) => {
        const centerX = placed[k] + item.width / 2;
        const centerY = side === "top" ? ROW_INSET : size.height - ROW_INSET;
        const edgeY = side === "top" ? centerY + item.height / 2 : centerY - item.height / 2;
        item.note!.style.transform = `translate(${placed[k]}px, ${centerY - item.height / 2}px)`;
        item.note!.style.opacity = item.at.visible ? "1" : "0";
        const line = lines.current[item.i];
        if (line) {
          line.setAttribute("x1", String(centerX));
          line.setAttribute("y1", String(edgeY));
          line.setAttribute("x2", String(item.at.x));
          line.setAttribute("y2", String(item.at.y));
          line.style.opacity = item.at.visible ? "1" : "0";
        }
      });
    }

    arrowPins.current.forEach((pin, i) => {
      const word = arrowWords.current[i];
      if (!pin || !word) return;
      const at = toScreen(pin);
      word.style.transform = `translate(-50%, -120%) translate(${at.x}px, ${at.y}px)`;
      word.style.opacity = at.visible ? "1" : "0";
    });
  });
  return null;
}

/** `fill` stretches the model to its container instead of a square; `onGrab` fires when the student turns it. */
export function ShowMe3D({ scene, fill = false, onGrab }: { scene: Scene; fill?: boolean; onGrab?: () => void }) {
  const still = usePrefersReducedMotion();
  const [grabbed, setGrabbed] = useState(false);
  const partsById = useMemo(() => new Map(scene.parts.map((part) => [part.id, part])), [scene]);
  const labels = scene.labels.filter((label) => partsById.has(label.partId));
  const anchors = useRef<(Object3D | null)[]>([]);
  const notes = useRef<(HTMLElement | null)[]>([]);
  const lines = useRef<(SVGLineElement | null)[]>([]);
  const arrowPins = useRef<(Object3D | null)[]>([]);
  const arrowWords = useRef<(HTMLElement | null)[]>([]);

  return (
    <figure className={`graph-paper flex w-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-line ${fill ? "h-full" : ""}`}>
      <figcaption className="px-5 pt-4 font-hand text-[26px] leading-tight text-ink">{scene.title}</figcaption>
      <div className={`relative w-full touch-none overflow-hidden ${fill ? "min-h-0 flex-1" : "aspect-square"}`} aria-label={`3D model: ${scene.title}`} role="img">
        <Canvas camera={{ position: [4, 2.6, 4.8], fov: 45 }}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 8, 5]} intensity={1.4} />
          <directionalLight position={[-6, 3, -4]} intensity={0.4} />
          {/* Bounds moves the camera so the model fills the middle of the frame, with room for the label rows. */}
          <Bounds fit clip observe margin={1.6}>
            <Center>
              {scene.parts.map((part) => (
                <Part key={part.id} part={part} still={still} />
              ))}
              {labels.map((label, i) => (
                <group key={label.text} position={toVector(partsById.get(label.partId)!.position)}>
                  <mesh>
                    <sphereGeometry args={[0.05, 16, 8]} />
                    <meshBasicMaterial color="#ffffff" />
                  </mesh>
                  <object3D
                    ref={(pin) => {
                      anchors.current[i] = pin;
                    }}
                  />
                </group>
              ))}
              {scene.arrows.map((arrow, i) => (
                <Arrow
                  key={arrow.meaning}
                  arrow={arrow}
                  still={still}
                  onPin={(pin) => {
                    arrowPins.current[i] = pin;
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
            onStart={() => {
              setGrabbed(true);
              onGrab?.();
            }}
          />
          <LabelLayout labels={labels} anchors={anchors} notes={notes} lines={lines} arrowPins={arrowPins} arrowWords={arrowWords} />
        </Canvas>
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <svg className="absolute inset-0 h-full w-full text-ink">
            {labels.map((label, i) => (
              <line
                key={label.text}
                ref={(line) => void (lines.current[i] = line)}
                stroke="currentColor"
                strokeWidth="1.5"
                opacity="0"
              />
            ))}
          </svg>
          {labels.map((label, i) => (
            <span
              key={label.text}
              ref={(note) => void (notes.current[i] = note)}
              className={`absolute left-0 top-0 whitespace-nowrap rounded-sm border-l-4 px-2.5 py-1 font-hand text-[18px] text-[#23201c] opacity-0 shadow-sm ${NOTE_TONES[label.tone]}`}
            >
              {label.text}
            </span>
          ))}
          {scene.arrows.map((arrow, i) => (
            <span
              key={arrow.meaning}
              ref={(word) => void (arrowWords.current[i] = word)}
              className="absolute left-0 top-0 whitespace-nowrap rounded bg-[#fbf8f2]/80 px-1 font-hand text-[16px] text-[#245a48] opacity-0"
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
