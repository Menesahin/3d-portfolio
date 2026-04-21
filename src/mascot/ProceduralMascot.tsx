import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";
import { useActiveTheme } from "@/hooks/useActiveTheme";

/**
 * Procedural fallback mascot. A stylized little robot built from primitives.
 * Used when `MascotConfig.assetUrl === null`.
 */
export function ProceduralMascot() {
  const theme = useActiveTheme();
  const group = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current) return;
    // Gentle idle breath
    const t = state.clock.elapsedTime;
    group.current.rotation.y = Math.sin(t * 0.4) * 0.08;
    if (leftArm.current) leftArm.current.rotation.z = 0.2 + Math.sin(t * 1.2) * 0.08;
    if (rightArm.current) rightArm.current.rotation.z = -0.2 - Math.sin(t * 1.2) * 0.08;
  });

  const bodyColor = "#E6E8EE";
  const accent = theme.palette.accent;
  const eyeEmissive = theme.id === "cyber" ? 1.4 : 0.6;

  return (
    <group ref={group} scale={0.9}>
      {/* Body */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <capsuleGeometry args={[0.28, 0.4, 6, 12]} />
        <meshStandardMaterial color={bodyColor} roughness={0.4} metalness={0.3} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <boxGeometry args={[0.55, 0.45, 0.5]} />
        <meshStandardMaterial color={bodyColor} roughness={0.35} metalness={0.35} />
      </mesh>

      {/* Eye visor strip */}
      <mesh position={[0, 1.02, 0.251]}>
        <planeGeometry args={[0.42, 0.14]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={eyeEmissive}
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>

      {/* Antenna */}
      <mesh position={[0, 1.35, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.22, 8]} />
        <meshStandardMaterial color="#8A8D96" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={eyeEmissive} />
      </mesh>

      {/* Arms (pivot groups for gesture overlays later) */}
      <group ref={leftArm} position={[-0.35, 0.65, 0]}>
        <mesh position={[-0.08, -0.15, 0]} castShadow>
          <capsuleGeometry args={[0.07, 0.26, 4, 8]} />
          <meshStandardMaterial color={bodyColor} metalness={0.3} roughness={0.5} />
        </mesh>
      </group>
      <group ref={rightArm} position={[0.35, 0.65, 0]}>
        <mesh position={[0.08, -0.15, 0]} castShadow>
          <capsuleGeometry args={[0.07, 0.26, 4, 8]} />
          <meshStandardMaterial color={bodyColor} metalness={0.3} roughness={0.5} />
        </mesh>
      </group>

      {/* Feet (floating hover base) */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.32, 0.38, 0.12, 16]} />
        <meshStandardMaterial color="#8A8D96" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Hover pad glow */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.35, 0.5, 24]} />
        <meshBasicMaterial color={accent} transparent opacity={0.4} />
      </mesh>
    </group>
  );
}
