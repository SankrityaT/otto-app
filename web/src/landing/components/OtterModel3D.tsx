"use client";

import { Center, ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Mesh, MeshStandardMaterial } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { asset } from "@/landing/lib/site";

// The 3D-printed otter, painted the way it will look on the counter. Built by
// hardware/otter/otter.py and slimmed down for the web by hardware/otter/web_model.py.
const MODEL = asset("/device/otter.glb");

/** The model is in millimetres with Z up; three.js wants Y up and about one unit across. */
const MM = 0.01;

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

function Otter({ onReady }: { onReady?: () => void }) {
  const { scene } = useGLTF(MODEL);

  // The paint is stored per vertex. A soft, slightly satin finish looks like painted PLA.
  const model = useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse((node) => {
      if (node instanceof Mesh) {
        node.material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0 });
        node.castShadow = true;
      }
    });
    return copy;
  }, [scene]);

  // Tell the card the model is on screen, so it can hide its loading line.
  useEffect(() => onReady?.(), [onReady]);

  return (
    <Center top>
      {/* Turn Z-up into Y-up, then face the otter towards the camera. */}
      <group rotation={[0, Math.PI, 0]}>
        <primitive object={model} rotation={[-Math.PI / 2, 0, 0]} scale={MM} />
      </group>
    </Center>
  );
}

/** Drag to look at the otter from any side. It turns slowly by itself until someone grabs it. */
export function OtterModel3D({ onReady }: { onReady?: () => void }) {
  const still = usePrefersReducedMotion();
  const controls = useRef<OrbitControlsImpl>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const grab = () => setTouched(true);
    c.addEventListener("start", grab);
    return () => c.removeEventListener("start", grab);
  });

  return (
    <div className="relative size-full">
      <Canvas
        camera={{ position: [1.15, 1.0, 2.9], fov: 35 }}
        dpr={[1, 2]}
        aria-label="A 3D model of the Ayin otter. Drag to turn it around."
        role="img"
      >
        <hemisphereLight args={["#fffaf0", "#b6cec3", 1.1]} />
        <directionalLight position={[2.5, 4, 3]} intensity={1.6} />
        <directionalLight position={[-3, 2.5, -3]} intensity={1.1} color="#f3efe6" />
        <Suspense fallback={null}>
          <Otter onReady={onReady} />
        </Suspense>
        <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={3} blur={2.4} far={1.2} />
        <OrbitControls
          ref={controls}
          target={[0, 0.55, 0]}
          enablePan={false}
          enableZoom={false}
          minPolarAngle={0.15}
          maxPolarAngle={Math.PI / 2 + 0.25}
          autoRotate={!still && !touched}
          autoRotateSpeed={1.2}
          enableDamping
        />
      </Canvas>
    </div>
  );
}

useGLTF.preload(MODEL);
