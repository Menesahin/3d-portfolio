import { Billboard, Text } from "@react-three/drei";
import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useActiveTheme } from "@/hooks/useActiveTheme";
import { useHover } from "@/hooks/useHover";

type PlinthProps = {
  position?: [number, number, number];
  label: string;
  sublabel?: string;
  width?: number;
  depth?: number;
  height?: number;
  /**
   * Invoked when the plinth box is clicked. Wired from the specific island
   * (Experience / Projects) to show the matching hologram + content card.
   */
  onActivate?: () => void;
};

/**
 * A small display pedestal. Holds a label above it (billboarded). Clickable
 * when `onActivate` is supplied — fires the activation handler, stops event
 * propagation so the parent island's navigation handler doesn't also fire.
 */
export function Plinth({
  position = [0, 0, 0],
  label,
  sublabel,
  width = 1.4,
  depth = 1.4,
  height = 0.6,
  onActivate,
}: PlinthProps) {
  const theme = useActiveTheme();
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const hover = useHover();

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!onActivate) return;
    e.stopPropagation();
    onActivate();
  };

  useFrame((state, dt) => {
    if (!mat.current) return;
    const k = 1 - Math.exp(-6 * dt);
    const pulse = hover.hovered ? 0.35 + Math.sin(state.clock.elapsedTime * 5) * 0.15 : 0;
    mat.current.emissiveIntensity = THREE.MathUtils.lerp(mat.current.emissiveIntensity, pulse, k);
  });

  return (
    <group position={position}>
      <mesh
        castShadow
        receiveShadow
        position={[0, height / 2 + 0.2, 0]}
        onClick={handleClick}
        {...(onActivate
          ? { onPointerOver: hover.onPointerOver, onPointerOut: hover.onPointerOut }
          : {})}
      >
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          ref={mat}
          color={theme.palette.plinth}
          roughness={0.6}
          metalness={theme.id === "cyber" ? 0.4 : 0.05}
          emissive={theme.palette.accent}
          emissiveIntensity={0}
        />
      </mesh>

      {/* Billboarded so labels stay legible as the camera flies around. */}
      <Billboard position={[0, height + 0.55, 0]}>
        <Text
          fontSize={0.22}
          color={theme.palette.ink}
          anchorX="center"
          anchorY="middle"
          maxWidth={width * 1.6}
          fontWeight={600}
        >
          {label}
        </Text>
        {sublabel && (
          <Text
            position={[0, -0.22, 0]}
            fontSize={0.13}
            color={theme.palette.ink}
            anchorX="center"
            anchorY="middle"
            maxWidth={width * 1.8}
            fillOpacity={0.6}
          >
            {sublabel}
          </Text>
        )}
      </Billboard>
    </group>
  );
}
