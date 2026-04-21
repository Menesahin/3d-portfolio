import { Billboard, Text } from "@react-three/drei";
import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useActiveTheme } from "@/hooks/useActiveTheme";
import { useHover } from "@/hooks/useHover";
import { useStore } from "@/stores";
import type { ZoneId } from "./zones";

type IslandProps = {
  id: ZoneId;
  position: readonly [number, number, number];
  radius?: number;
  /** Optional overhead label — rendered as a billboard so it's always readable. */
  title?: string;
  children?: React.ReactNode;
};

/**
 * A floating island: low-poly truncated cone (rock) with a flat top disc
 * that hosts plinths / decorations. Gently bobs in world space. Glows
 * softly when highlighted by a tool call; pulses brighter on hover.
 * Clicking the top disc flies the camera + mascot to this zone.
 */
export function Island({ id, position, radius = 2.2, title, children }: IslandProps) {
  const theme = useActiveTheme();
  const group = useRef<THREE.Group>(null);
  const topMat = useRef<THREE.MeshStandardMaterial>(null);
  const rockMat = useRef<THREE.MeshStandardMaterial>(null);

  const hoverPhase = useMemo(() => Math.random() * Math.PI * 2, []);

  const highlighted = useStore((s) => s.world.highlightedZone === id);
  const currentZone = useStore((s) => s.mascot.currentZone);
  const isActive = currentZone === id;
  const hover = useHover();

  const targetTop = useMemo(() => new THREE.Color(theme.palette.island), [theme]);
  const targetRock = useMemo(() => new THREE.Color(theme.palette.plinth), [theme]);
  const targetEmissive = useMemo(() => new THREE.Color(theme.palette.accent), [theme]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const apply = useStore.getState().applyUiEvent;
    apply({ kind: "camera.focus", target: id });
    if (id !== "hub") {
      apply({ kind: "mascot.move", zone: id });
    }
  };

  useFrame((state, dt) => {
    if (!group.current) return;
    // Gentle bob
    group.current.position.y =
      position[1] + Math.sin(state.clock.elapsedTime * 0.6 + hoverPhase) * 0.12;

    const k = 1 - Math.exp(-5 * dt);
    if (topMat.current) {
      topMat.current.color.lerp(targetTop, k);
      topMat.current.emissive.lerp(targetEmissive, k);
      const base = highlighted ? 0.4 : isActive ? 0.15 : 0.0;
      // Hover adds a soft pulse on top of whatever baseline is active.
      const pulse = hover.hovered ? 0.18 + Math.sin(state.clock.elapsedTime * 4) * 0.08 : 0;
      topMat.current.emissiveIntensity = THREE.MathUtils.lerp(
        topMat.current.emissiveIntensity,
        base + pulse,
        k,
      );
    }
    if (rockMat.current) rockMat.current.color.lerp(targetRock, k);
  });

  return (
    <group ref={group} position={position as [number, number, number]}>
      {/* Rock underside (truncated cone) */}
      <mesh castShadow position={[0, -0.9, 0]}>
        <coneGeometry args={[radius, 2.2, 8, 1, true]} />
        <meshStandardMaterial
          ref={rockMat}
          color={theme.palette.plinth}
          roughness={0.85}
          flatShading
        />
      </mesh>

      {/* Top disc — clickable surface */}
      <mesh
        receiveShadow
        position={[0, 0.1, 0]}
        onClick={handleClick}
        onPointerOver={hover.onPointerOver}
        onPointerOut={hover.onPointerOut}
      >
        <cylinderGeometry args={[radius, radius, 0.3, 24]} />
        <meshStandardMaterial
          ref={topMat}
          color={theme.palette.island}
          roughness={0.7}
          emissive={theme.palette.accent}
          emissiveIntensity={0}
        />
      </mesh>

      {/* Overhead billboard label */}
      {title && (
        <Billboard position={[0, radius + 0.6, 0]}>
          <Text
            fontSize={0.34}
            color={theme.palette.ink}
            fillOpacity={0.9}
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.05}
          >
            {title.toUpperCase()}
          </Text>
        </Billboard>
      )}

      {children}
    </group>
  );
}
