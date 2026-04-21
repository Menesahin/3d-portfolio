import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";
import { GlbProp } from "./GlbProp";

/**
 * The Skills island's centerpiece — a floating, slowly rotating PBR helmet.
 * Reads as "hero exhibit" more than "random prop" thanks to the subtle bob
 * and continuous yaw. The orbital ring (`SkillsCanopy`) frames it cleanly.
 */
export function SkillsExhibit() {
  const group = useRef<THREE.Group>(null);
  useFrame((s, dt) => {
    if (!group.current) return;
    group.current.rotation.y += dt * 0.35;
    group.current.position.y = 2.2 + Math.sin(s.clock.elapsedTime * 0.9) * 0.12;
  });
  return (
    <group ref={group} position={[0, 2.2, 0]}>
      <GlbProp url="/models/props/damaged-helmet.glb" scale={0.65} rotation={[0, 0, 0]} />
    </group>
  );
}
