"use client";

import { Center, Html, Line, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import { Euler, Quaternion, Vector3 } from "three";
import type { Scene } from "@/lib/ai/scene";

// Renders a "show me" scene: simple shapes from Claude, sticky-note labels on lines,
// and arrows for movements. Drag to turn it. Nothing moves on its own.

type Vec = Scene["parts"][number]["position"];

const LABEL_HEIGHT = 2.7; // how far above or below the model the labels sit
const NOTE_TONES: Record<Scene["labels"][number]["tone"], string> = {
  yellow: "bg-[#fbf1c7] border-[#e8c547]",
  pink: "bg-[#f9dfe3] border-[#e39aa8]",
  blue: "bg-[#dfe9f7] border-[#8fb0dd]",
  green: "bg-[#dcefe3] border-[#7fbf98]",
};

const toVector = (v: Vec) => new Vector3(v.x, v.y, v.z);
const toEuler = (v: Vec) =>
  new Euler(
    (v.x * Math.PI) / 180,
    (v.y * Math.PI) / 180,
    (v.z * Math.PI) / 180,
  );

function Part({ part }: { part: Scene["parts"][number] }) {
  const { x: w, y: h, z: d } = part.size;
  return (
    <mesh position={toVector(part.position)} rotation={toEuler(part.rotation)}>
      {part.shape === "box" && <boxGeometry args={[w, h, d]} />}
      {part.shape === "cylinder" && (
        <cylinderGeometry args={[w / 2, w / 2, h, 32]} />
      )}
      {part.shape === "cone" && <coneGeometry args={[w / 2, h, 32]} />}
      {part.shape === "sphere" && <sphereGeometry args={[w / 2, 32, 16]} />}
      {part.shape === "torus" && (
        <torusGeometry args={[w / 2, Math.max(d, 0.02) / 2, 16, 48]} />
      )}
      <meshStandardMaterial
        color={part.color}
        roughness={0.6}
        emissive={part.highlight ? "#3e8e87" : "#000000"}
        emissiveIntensity={part.highlight ? 0.45 : 0}
      />
    </mesh>
  );
}

function StickyLabel({
  label,
  anchor,
}: {
  label: Scene["labels"][number];
  anchor: Vector3;
}) {
  const end = new Vector3(
    anchor.x,
    label.side === "top" ? LABEL_HEIGHT : -LABEL_HEIGHT,
    anchor.z,
  );
  return (
    <group>
      <Line points={[anchor, end]} color="#23201c" lineWidth={1.5} />
      <mesh position={anchor}>
        <sphereGeometry args={[0.05, 16, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <Html position={end} center zIndexRange={[10, 0]}>
        <span
          className={`whitespace-nowrap rounded-sm border-l-4 px-2.5 py-1 font-hand text-[18px] text-ink shadow-sm ${NOTE_TONES[label.tone]}`}
        >
          {label.text}
        </span>
      </Html>
    </group>
  );
}

function Arrow({ arrow }: { arrow: Scene["arrows"][number] }) {
  const from = toVector(arrow.from);
  const to = toVector(arrow.to);
  const direction = to.clone().sub(from).normalize();
  const tipRotation = new Quaternion().setFromUnitVectors(
    new Vector3(0, 1, 0),
    direction,
  );
  return (
    <group>
      <Line points={[from, to]} color="#2b6652" lineWidth={4} />
      <mesh position={to} quaternion={tipRotation}>
        <coneGeometry args={[0.12, 0.3, 24]} />
        <meshStandardMaterial color="#2b6652" />
      </mesh>
      <Html position={from} center>
        <span className="whitespace-nowrap font-hand text-[16px] text-cel-deep">
          {arrow.meaning}
        </span>
      </Html>
    </group>
  );
}

export function ShowMe3D({ scene }: { scene: Scene }) {
  const partsById = useMemo(
    () => new Map(scene.parts.map((part) => [part.id, part])),
    [scene],
  );

  return (
    <figure className="graph-paper flex w-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-line">
      <figcaption className="px-5 pt-4 font-hand text-[26px] leading-tight text-ink">
        {scene.title}
      </figcaption>
      <div
        className="aspect-square w-full touch-none"
        aria-label={`3D model: ${scene.title}`}
        role="img"
      >
        <Canvas camera={{ position: [4, 2.6, 4.8], fov: 45 }}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 8, 5]} intensity={1.4} />
          <directionalLight position={[-6, 3, -4]} intensity={0.4} />
          <Center>
            {scene.parts.map((part) => (
              <Part key={part.id} part={part} />
            ))}
            {scene.labels.map((label) => {
              const part = partsById.get(label.partId);
              return part ? (
                <StickyLabel
                  key={label.text}
                  label={label}
                  anchor={toVector(part.position)}
                />
              ) : null;
            })}
            {scene.arrows.map((arrow) => (
              <Arrow key={arrow.meaning} arrow={arrow} />
            ))}
          </Center>
          <OrbitControls enablePan={false} minDistance={4} maxDistance={12} />
        </Canvas>
      </div>
      <p className="px-5 pb-4 text-[15px] text-ink-3">Drag to turn it</p>
    </figure>
  );
}
