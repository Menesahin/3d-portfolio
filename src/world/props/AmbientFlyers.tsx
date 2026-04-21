import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type * as THREE from "three";
import { GlbProp } from "./GlbProp";

/**
 * Distant ambient traffic — a small Kenney Space Kit speeder traces a
 * wide ellipse high above the islands. Banks toward its direction of
 * travel so the silhouette reads clearly from any camera angle. Same
 * flat-shaded vocabulary as every other prop in the scene.
 */
export function AmbientFlyers() {
  const pivot = useRef<THREE.Group>(null);
  const orbit = useMemo(() => ({ rx: 34, rz: 20, y: 14 }), []);
  useFrame((s) => {
    if (!pivot.current) return;
    const t = s.clock.elapsedTime * 0.22;
    pivot.current.position.set(
      Math.cos(t) * orbit.rx,
      orbit.y + Math.sin(t * 1.3) * 1.4,
      Math.sin(t) * orbit.rz,
    );
    pivot.current.rotation.y = -t + Math.PI / 2;
  });
  return (
    <group ref={pivot}>
      <GlbProp url="/models/props/kenney/craft_speederA.glb" scale={0.55} rotation={[0, 0, 0]} />
    </group>
  );
}
