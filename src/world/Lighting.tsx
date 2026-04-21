import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useActiveTheme } from "@/hooks/useActiveTheme";

/**
 * Lighting rig. Ambient + directional (key) + hemisphere. Intensities
 * are theme-driven and damp smoothly on theme change.
 */
export function Lighting() {
  const theme = useActiveTheme();
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const dirRef = useRef<THREE.DirectionalLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-6 * dt);
    if (ambientRef.current) {
      ambientRef.current.intensity = THREE.MathUtils.lerp(
        ambientRef.current.intensity,
        theme.lighting.ambient,
        k,
      );
    }
    if (dirRef.current) {
      dirRef.current.intensity = THREE.MathUtils.lerp(
        dirRef.current.intensity,
        theme.lighting.directional,
        k,
      );
    }
    if (hemiRef.current) {
      hemiRef.current.intensity = THREE.MathUtils.lerp(
        hemiRef.current.intensity,
        theme.lighting.hemisphere,
        k,
      );
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={theme.lighting.ambient} />
      <directionalLight
        ref={dirRef}
        position={[10, 14, 6]}
        intensity={theme.lighting.directional}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <hemisphereLight ref={hemiRef} args={["#ffffff", "#dde4ff", theme.lighting.hemisphere]} />
    </>
  );
}
