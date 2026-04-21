import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type * as THREE from "three";
import { GlbProp } from "./GlbProp";

/**
 * Distant ambient wildlife — a Parrot looping high above the scene. Reads
 * as "world feels inhabited" without demanding attention. A single mesh is
 * moved along a stretched ellipse on the XZ plane with a gentle Y-bob.
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
    // Bank the body toward the direction of travel.
    pivot.current.rotation.y = -t + Math.PI / 2;
  });
  return (
    <group ref={pivot}>
      <GlbProp url="/models/props/parrot.glb" scale={0.08} play />
    </group>
  );
}
