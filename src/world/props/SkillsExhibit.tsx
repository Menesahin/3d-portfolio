import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";
import { GlbProp } from "./GlbProp";

/**
 * The Skills island's centerpiece — a slowly rotating satellite dish,
 * floating above the orbital ring canopy. Kenney Space Kit (CC0) so it
 * matches every other flat-shaded prop in the scene. Reads as "AI/LLM
 * reaching across the world" without the jarring photo-realism of the
 * old PBR helmet.
 */
export function SkillsExhibit() {
  const group = useRef<THREE.Group>(null);
  useFrame((s, dt) => {
    if (!group.current) return;
    group.current.rotation.y += dt * 0.25;
    group.current.position.y = 2.0 + Math.sin(s.clock.elapsedTime * 0.9) * 0.1;
  });
  return (
    <group ref={group} position={[0, 2.0, 0]}>
      <GlbProp
        url="/models/props/kenney/satelliteDish_detailed.glb"
        scale={0.85}
        rotation={[0, 0, 0]}
      />
    </group>
  );
}
