import { Billboard, Text } from "@react-three/drei";
import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { type ReactNode, useRef } from "react";
import type * as THREE from "three";
import { useActiveTheme } from "@/hooks/useActiveTheme";
import { useHover } from "@/hooks/useHover";
import { useStore } from "@/stores";
import type { ZoneId } from "../zones";

/**
 * Park-style zone wrapper. No disc, no plinth — just an invisible
 * hit-plane on the ground for click navigation, an overhead title
 * billboard, and a subtle emissive circle on the grass when the user
 * hovers (to telegraph "clickable").
 */
type Props = {
  id: ZoneId;
  position: readonly [number, number, number];
  title: string;
  /** Footprint radius used for the hit-test + hover ring. */
  radius?: number;
  /** Title Y offset above the ground. */
  titleY?: number;
  children?: ReactNode;
};

export function ZoneArea({ id, position, title, radius = 3.5, titleY = 4.2, children }: Props) {
  const theme = useActiveTheme();
  const hover = useHover();
  const ringRef = useRef<THREE.Mesh>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const apply = useStore.getState().applyUiEvent;
    apply({ kind: "camera.focus", target: id });
    if (id !== "hub") apply({ kind: "mascot.move", zone: id });
  };

  useFrame((_, dt) => {
    if (!ringMat.current) return;
    const k = 1 - Math.exp(-6 * dt);
    const target = hover.hovered ? 0.35 : 0;
    ringMat.current.opacity = ringMat.current.opacity + (target - ringMat.current.opacity) * k;
  });

  return (
    <group position={position as [number, number, number]}>
      {/* Invisible hit plane — captures click + hover for the whole zone. */}
      <mesh
        position={[0, 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={handleClick}
        onPointerOver={hover.onPointerOver}
        onPointerOut={hover.onPointerOut}
        visible={false}
      >
        <circleGeometry args={[radius, 32]} />
        <meshBasicMaterial />
      </mesh>

      {/* Hover ring — soft emissive glow on the grass while hovered. */}
      <mesh ref={ringRef} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius - 0.4, radius, 64]} />
        <meshBasicMaterial
          ref={ringMat}
          color={theme.palette.accent}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      {/* Overhead title billboard — 3D SDF text (drei Text). */}
      <Billboard position={[0, titleY, 0]}>
        <Text
          fontSize={0.5}
          color={theme.palette.ink}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.08}
          fillOpacity={0.92}
        >
          {title.toUpperCase()}
        </Text>
      </Billboard>

      {children}
    </group>
  );
}
