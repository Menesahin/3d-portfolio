import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useIsMobile } from "@/hooks/useIsMobile";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useStore } from "@/stores";

/** Lightweight additive exhaust that appears only while Köfte is travelling. */
export function KofteThrusterTrail() {
  const rootRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const trailRefs = useRef<Array<THREE.Mesh | null>>([]);
  const glowRefs = useRef<Array<THREE.Mesh | null>>([]);
  const energyRef = useRef(0);
  const isMobile = useIsMobile();
  const reduceMotion = usePrefersReducedMotion();
  const state = useStore((store) => store.mascot.state);
  const specialMotion = useStore((store) => store.mascot.specialMotion);
  const offsets = useMemo(() => (isMobile ? [-0.17, 0.17] : [-0.22, 0, 0.22]), [isMobile]);

  useFrame(({ clock }, dt) => {
    const active = !reduceMotion && (state === "moving" || specialMotion !== null);
    const target = active ? 1 : 0;
    const response = 1 - Math.exp(-(active ? 8 : 5) * dt);
    energyRef.current += (target - energyRef.current) * response;
    const energy = energyRef.current;
    const pulse = 0.88 + Math.sin(clock.elapsedTime * 18) * 0.12;

    if (rootRef.current) rootRef.current.visible = energy > 0.012;
    if (lightRef.current) lightRef.current.intensity = energy * pulse * (isMobile ? 3.5 : 7.5);

    for (const [index, mesh] of trailRefs.current.entries()) {
      if (!mesh) continue;
      mesh.scale.set(
        0.72 + energy * 0.28,
        0.18 + energy * pulse * (0.95 + index * 0.06),
        0.72 + energy * 0.28,
      );
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.opacity = energy * (isMobile ? 0.38 : 0.52) * pulse;
    }
    for (const mesh of glowRefs.current) {
      if (!mesh) continue;
      mesh.scale.setScalar(0.72 + energy * pulse * 0.5);
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.opacity = 0.18 + energy * 0.68;
    }
  });

  return (
    <group ref={rootRef} visible={false}>
      {offsets.map((x, index) => (
        <group key={x}>
          <mesh
            ref={(mesh) => {
              glowRefs.current[index] = mesh;
            }}
            position={[x, 0.29, -0.29]}
          >
            <sphereGeometry args={[0.075, 10, 8]} />
            <meshBasicMaterial
              color="#b9ffff"
              transparent
              opacity={0.18}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
          <mesh
            ref={(mesh) => {
              trailRefs.current[index] = mesh;
            }}
            position={[x, 0.29, -0.67]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <coneGeometry args={[0.085, 0.78, isMobile ? 8 : 12, 1, true]} />
            <meshBasicMaterial
              color={index % 2 === 0 ? "#4defff" : "#b9ffff"}
              transparent
              opacity={0}
              depthWrite={false}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
      <pointLight
        ref={lightRef}
        position={[0, 0.32, -0.42]}
        color="#62efff"
        distance={3.2}
        decay={2}
      />
    </group>
  );
}
