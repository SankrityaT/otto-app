"use client";

import { Billboard, OrbitControls, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import type { RefObject } from "react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CanvasTexture, Group, Object3D, SRGBColorSpace, Vector3 } from "three";
import type { Scene } from "@/lib/ai/scene";
import type { CrewView } from "@/lib/data/crew";
import { Part } from "../ShowMe3D";
import { loadImage, tint } from "../otter/UprightOtter";

// The raft as a place: a small 3D room of the work site. Every task is a station along the
// back wall, with its "show me" model on the counter. Each raftmate's otter stands at the
// station of the task they're doing right now, walks over when that changes, and rests by
// the break table otherwise. A "?" floats over anyone who asked for help. Seeing who is where
// replaces reading a feed. With Reduce Motion, nothing walks or bobs.

type Member = CrewView["members"][number];
export type Station = { routineId: string; title: string; scene: Scene | null };
export type Picked = { kind: "member"; id: string } | { kind: "station"; routineId: string } | null;

const ROOM = { width: 12, depth: 9 };
const COUNTER = { width: 2.1, height: 0.9, depth: 1 };
const BACK_Z = -2.9;
const BREAK = new Vector3(-3.6, 0, 2.2);
/** The station models are built at about 4 units across; this sits them on a counter. */
const MODEL_SCALE = 0.2;
const OTTER_SIZE = 1.35;
/** Ignore a "tap" that was really a drag to turn the room. */
const TAP_SLOP = 6;

function useStill(): boolean {
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

/** Where each station sits along the back wall, spread evenly. */
function stationX(index: number, count: number): number {
  const span = Math.min(ROOM.width - 3, count * 2.8);
  return count === 1 ? 0 : -span / 2 + (span * index) / (count - 1);
}

/** Havi's sitting-up otter, tinted to each student's colour, as a flat picture that always faces you. */
function useOtterTextures(hues: number[]): Map<number, CanvasTexture> {
  const [textures, setTextures] = useState(new Map<number, CanvasTexture>());
  const key = [...new Set(hues)].sort().join(",");

  useEffect(() => {
    let live = true;
    Promise.all([loadImage("/otter/upright-body.png"), loadImage("/otter/upright-tail.png")])
      .then(([body, tail]) => {
        const made = new Map<number, CanvasTexture>();
        for (const hue of key.split(",").map(Number)) {
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = 512;
          const g = canvas.getContext("2d");
          if (!g) continue;
          g.drawImage(tint(tail, hue), 0, 0, 512, 512);
          g.drawImage(tint(body, hue), 0, 0, 512, 512);
          const texture = new CanvasTexture(canvas);
          texture.colorSpace = SRGBColorSpace;
          made.set(hue, texture);
        }
        if (live) setTextures(made);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [key]);

  return textures;
}

function Otter({
  member,
  target,
  texture,
  picked,
  still,
  anchor,
  onPick,
}: {
  member: Member;
  target: Vector3;
  texture: CanvasTexture | undefined;
  picked: boolean;
  still: boolean;
  anchor: (pin: Object3D | null) => void;
  onPick: () => void;
}) {
  const body = useRef<Group>(null);
  const sprite = useRef<Group>(null);

  useFrame(({ clock }, dt) => {
    const g = body.current;
    if (!g) return;
    // Walk toward wherever the student is now, rather than jumping.
    if (still) g.position.copy(target);
    else g.position.lerp(target, Math.min(1, dt * 2.2));
    if (!sprite.current || still) return;
    const t = clock.elapsedTime + member.furHue;
    // Working: a little hop now and then. Asking: a side-to-side wave. Resting: slow breathing.
    const hop = member.now ? Math.max(0, Math.sin(t * 5)) * 0.08 : 0;
    sprite.current.position.y = OTTER_SIZE / 2 + hop;
    sprite.current.rotation.z = member.asking ? Math.sin(t * 4) * 0.12 : 0;
    sprite.current.scale.y = 1 + Math.sin(t * 1.6) * 0.015;
  });

  return (
    <group ref={body} position={target}>
      {picked && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.45, 0.58, 40]} />
          <meshBasicMaterial color="#3e8e87" />
        </mesh>
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.42, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.12} />
      </mesh>
      <group ref={sprite} position={[0, OTTER_SIZE / 2, 0]}>
        <Billboard>
          <mesh
            onClick={(e: ThreeEvent<MouseEvent>) => {
              if (e.delta > TAP_SLOP) return;
              e.stopPropagation();
              onPick();
            }}
          >
            <planeGeometry args={[OTTER_SIZE, OTTER_SIZE]} />
            {texture ? <meshBasicMaterial map={texture} transparent alphaTest={0.05} /> : <meshBasicMaterial visible={false} />}
          </mesh>
        </Billboard>
      </group>
      <object3D ref={anchor} position={[0, OTTER_SIZE + 0.15, 0]} />
    </group>
  );
}

function StationCounter({
  station,
  x,
  picked,
  still,
  anchor,
  onPick,
}: {
  station: Station;
  x: number;
  picked: boolean;
  still: boolean;
  anchor: (pin: Object3D | null) => void;
  onPick: () => void;
}) {
  return (
    <group
      position={[x, 0, BACK_Z]}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (e.delta > TAP_SLOP) return;
        e.stopPropagation();
        onPick();
      }}
    >
      <RoundedBox args={[COUNTER.width, COUNTER.height, COUNTER.depth]} radius={0.06} position={[0, COUNTER.height / 2, 0]}>
        <meshStandardMaterial color={picked ? "#a0805f" : "#8c6f54"} roughness={0.8} />
      </RoundedBox>
      <mesh position={[0, COUNTER.height + 0.03, 0]}>
        <boxGeometry args={[COUNTER.width + 0.1, 0.06, COUNTER.depth + 0.1]} />
        <meshStandardMaterial color="#efe6d6" roughness={0.6} />
      </mesh>
      {station.scene && (
        <group position={[0, COUNTER.height + 0.06, 0]} scale={MODEL_SCALE}>
          {station.scene.parts.map((part) => (
            <Part key={part.id} part={{ ...part, highlight: false }} still={still} />
          ))}
        </group>
      )}
      <object3D ref={anchor} position={[0, COUNTER.height + 1.3, 0]} />
    </group>
  );
}

function Room() {
  return (
    <group>
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[ROOM.width, 0.2, ROOM.depth]} />
        <meshStandardMaterial color="#d9c4a2" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.5, -ROOM.depth / 2]}>
        <boxGeometry args={[ROOM.width, 3, 0.15]} />
        <meshStandardMaterial color="#e9dfcf" roughness={0.95} />
      </mesh>
      <mesh position={[-ROOM.width / 2, 1.5, 0]}>
        <boxGeometry args={[0.15, 3, ROOM.depth]} />
        <meshStandardMaterial color="#e2d6c2" roughness={0.95} />
      </mesh>
      {/* The break table, where otters rest between tasks. */}
      <group position={BREAK.toArray()}>
        <mesh position={[0, 0.55, 0]}>
          <cylinderGeometry args={[0.7, 0.7, 0.08, 40]} />
          <meshStandardMaterial color="#b6cec3" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.27, 0]}>
          <cylinderGeometry args={[0.08, 0.12, 0.54, 16]} />
          <meshStandardMaterial color="#8c6f54" />
        </mesh>
      </group>
    </group>
  );
}

/** Keeps the HTML name tags and bubbles over their otters and stations as the room turns. */
function Tags({ anchors, tags }: { anchors: RefObject<Map<string, Object3D>>; tags: RefObject<Map<string, HTMLElement>> }) {
  const point = useMemo(() => new Vector3(), []);
  useFrame(({ camera, size }) => {
    for (const [id, tag] of tags.current) {
      const anchor = anchors.current.get(id);
      if (!anchor) continue;
      anchor.getWorldPosition(point).project(camera);
      const x = ((point.x + 1) / 2) * size.width;
      const y = ((1 - point.y) / 2) * size.height;
      tag.style.setProperty("transform", `translate(${x}px, ${y}px) translate(-50%, -100%)`);
      tag.style.setProperty("opacity", point.z < 1 ? "1" : "0");
    }
  });
  return null;
}

/** Where an otter stands: at its task's station, side by side with others there, or at the break table. */
function placeOtters(members: Member[], stations: Station[]): Map<string, Vector3> {
  const places = new Map<string, Vector3>();
  const crowd = new Map<string, number>();
  for (const member of members) {
    const at = stations.findIndex((s) => s.routineId === member.now?.routineId);
    const key = at === -1 ? "break" : String(at);
    const k = crowd.get(key) ?? 0;
    crowd.set(key, k + 1);
    if (at === -1) {
      const angle = Math.PI * 0.15 + k * 1.3;
      places.set(member.id, new Vector3(BREAK.x + Math.cos(angle) * 1.25, 0, BREAK.z + Math.sin(angle) * 0.9));
    } else {
      const offset = (k % 2 === 0 ? 1 : -1) * Math.ceil(k / 2) * 0.75;
      places.set(member.id, new Vector3(stationX(at, stations.length) + offset, 0, BACK_Z + 1.15));
    }
  }
  return places;
}

export function RaftRoom({
  stations,
  members,
  meId,
  picked,
  invitingIds,
  onPick,
}: {
  stations: Station[];
  members: Member[];
  meId: string;
  picked: Picked;
  /** Raftmates waiting for this student to join them. */
  invitingIds: string[];
  onPick: (picked: Picked) => void;
}) {
  const still = useStill();
  const textures = useOtterTextures(members.map((m) => m.furHue));
  const places = useMemo(() => placeOtters(members, stations), [members, stations]);
  const anchors = useRef(new Map<string, Object3D>());
  const tags = useRef(new Map<string, HTMLElement>());

  const pin = (id: string) => (node: Object3D | null) => void (node ? anchors.current.set(id, node) : anchors.current.delete(id));
  const tag = (id: string) => (node: HTMLElement | null) => void (node ? tags.current.set(id, node) : tags.current.delete(id));

  return (
    <div className="relative h-full w-full touch-none overflow-hidden rounded-[var(--radius-card)] bg-[linear-gradient(#cfe0d8,#efe6d6)]">
      <Canvas camera={{ position: [0, 6.2, 8.4], fov: 42 }} onPointerMissed={() => onPick(null)}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[4, 8, 6]} intensity={1.3} />
        <Room />
        {stations.map((station, i) => (
          <StationCounter
            key={station.routineId}
            station={station}
            x={stationX(i, stations.length)}
            picked={picked?.kind === "station" && picked.routineId === station.routineId}
            still={still}
            anchor={pin(`station:${station.routineId}`)}
            onPick={() => onPick({ kind: "station", routineId: station.routineId })}
          />
        ))}
        {members.map((member) => (
          <Otter
            key={member.id}
            member={member}
            target={places.get(member.id)!}
            texture={textures.get(member.furHue)}
            picked={picked?.kind === "member" && picked.id === member.id}
            still={still}
            anchor={pin(member.id)}
            onPick={() => onPick({ kind: "member", id: member.id })}
          />
        ))}
        <OrbitControls
          makeDefault
          target={[0, 0.6, 0]}
          enablePan={false}
          minDistance={6}
          maxDistance={13}
          minPolarAngle={0.55}
          maxPolarAngle={1.15}
          minAzimuthAngle={-0.7}
          maxAzimuthAngle={0.7}
        />
        <Tags anchors={anchors} tags={tags} />
      </Canvas>

      {/* Name tags and bubbles, kept over their otters and stations by <Tags>. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {stations.map((station) => (
          <span
            key={station.routineId}
            ref={tag(`station:${station.routineId}`)}
            className="absolute left-0 top-0 max-w-[9rem] rounded-md bg-[#fbf8f2]/90 px-2 py-0.5 text-center text-[13px] font-semibold leading-tight text-[#1f1c18] shadow-sm"
          >
            {station.title}
          </span>
        ))}
        {members.map((member) => {
          const me = member.id === meId;
          const inviting = invitingIds.includes(member.id);
          return (
            <span key={member.id} ref={tag(member.id)} className="absolute left-0 top-0 flex flex-col items-center gap-1">
              {member.asking ? (
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#cdb45a] text-[22px] font-bold text-[#1f1c18] shadow-md">?</span>
              ) : inviting ? (
                <span className="rounded-full bg-[#8fb7a3] px-2.5 py-1 text-[13px] font-bold text-[#1f1c18] shadow-md">Join me?</span>
              ) : member.justFinished ? (
                <span className="rounded-full bg-[#a8b56a] px-2.5 py-1 text-[13px] font-bold text-[#1f1c18] shadow-md">Done!</span>
              ) : member.now ? (
                <span className="rounded-full bg-[#fbf8f2] px-2 py-0.5 text-[12px] font-semibold text-[#1f1c18] shadow-sm">
                  Step {Math.min(member.now.done + 1, member.now.total)}/{member.now.total}
                </span>
              ) : null}
              <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-bold shadow-sm ${me ? "bg-[#1f1c18] text-[#fbf8f2]" : "bg-[#fbf8f2] text-[#1f1c18]"}`}>
                {me ? "You" : member.name}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
