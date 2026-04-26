import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useActiveTheme } from "@/hooks/useActiveTheme";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { mascotPosRef } from "@/mascot/mascotPosRef";

const HALO_RADIUS = 1.6;
const HALO_Y = 0.012;
const TEXTURE_SIZE = 256;

function buildHaloTexture(accent: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const cx = TEXTURE_SIZE / 2;
    const cy = TEXTURE_SIZE / 2;
    const radius = TEXTURE_SIZE / 2;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0.0, `${accent}cc`);
    grad.addColorStop(0.35, `${accent}55`);
    grad.addColorStop(1.0, `${accent}00`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Soft accent-tinted halo decal that follows the mascot in X/Z. Reads as
 * the mascot's reflected accent on the platform top — without it the
 * mascot looks like it's hovering. Breathing radius (~±5 %) ties to the
 * same bob phase the mascot uses, so the halo "exhales" with the bob.
 */
export function MascotHalo() {
  const theme = useActiveTheme();
  const reduceMotion = usePrefersReducedMotion();
  const meshRef = useRef<THREE.Mesh>(null);

  const texture = useMemo(() => buildHaloTexture(theme.palette.accent), [theme.palette.accent]);

  useEffect(
    () => () => {
      texture.dispose();
    },
    [texture],
  );

  useFrame((state) => {
    if (!meshRef.current) return;
    const { x, z } = mascotPosRef.current;
    meshRef.current.position.x = x;
    meshRef.current.position.z = z;

    if (reduceMotion) {
      meshRef.current.scale.setScalar(1);
      return;
    }
    const t = state.clock.elapsedTime;
    // Phase-locked to the mascot's bob (Math.sin(t*1.3)) so halo
    // breathes in time with it. Amplitude ±5 %.
    const breath = 1 + Math.sin(t * 1.3) * 0.05;
    meshRef.current.scale.setScalar(breath);
  });

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, HALO_Y, 0]}
      receiveShadow={false}
    >
      <circleGeometry args={[HALO_RADIUS, 48]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}
