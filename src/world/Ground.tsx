import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useActiveTheme } from "@/hooks/useActiveTheme";

/**
 * Ground + atmosphere. Three layers stacked for depth:
 *   1. Large base disc at y = -4 — catches shadows, holds the base tint.
 *   2. Emissive grid overlay — cyber-only; procedurally fades to theme.
 *   3. Horizon ring — a large torus far from origin that reads as a
 *      distant landscape line; + Sparkles drifting below to suggest
 *      clouds / dust under the islands.
 */
export function Ground() {
  const theme = useActiveTheme();
  const planeMat = useRef<THREE.MeshStandardMaterial>(null);
  const gridMat = useRef<THREE.ShaderMaterial>(null);
  const horizonMat = useRef<THREE.MeshBasicMaterial>(null);

  const targetPlane = useMemo(() => new THREE.Color(theme.palette.island), [theme]);
  const targetGrid = useMemo(() => new THREE.Color(theme.palette.accent), [theme]);
  const targetHorizon = useMemo(() => new THREE.Color(theme.palette.fog), [theme]);

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-6 * dt);
    if (planeMat.current) planeMat.current.color.lerp(targetPlane, k);
    if (horizonMat.current) horizonMat.current.color.lerp(targetHorizon, k);
    const uniforms = gridMat.current?.uniforms;
    if (uniforms) {
      const u = uniforms as {
        uColor: { value: THREE.Color };
        uOpacity: { value: number };
      };
      u.uColor.value.lerp(targetGrid, k);
      u.uOpacity.value = THREE.MathUtils.lerp(u.uOpacity.value, theme.id === "cyber" ? 0.65 : 0, k);
    }
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: uniforms are stable references; values mutate in useFrame
  const gridUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(theme.palette.accent) },
      uOpacity: { value: theme.id === "cyber" ? 0.65 : 0 },
    }),
    [],
  );

  return (
    <group position={[0, -4, 0]}>
      {/* Base plane — shadow catcher + base tint */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[60, 64]} />
        <meshStandardMaterial
          ref={planeMat}
          color={theme.palette.island}
          roughness={0.95}
          metalness={0.0}
        />
      </mesh>

      {/* Grid overlay (cyber-visible) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[80, 80, 1, 1]} />
        <shaderMaterial
          ref={gridMat}
          transparent
          depthWrite={false}
          uniforms={gridUniforms}
          vertexShader={`
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            varying vec2 vUv;
            uniform vec3 uColor;
            uniform float uOpacity;
            void main() {
              vec2 grid = abs(fract(vUv * 40.0) - 0.5);
              float line = 1.0 - smoothstep(0.0, 0.02, min(grid.x, grid.y));
              float dist = distance(vUv, vec2(0.5));
              float fade = 1.0 - smoothstep(0.25, 0.55, dist);
              gl_FragColor = vec4(uColor, line * fade * uOpacity);
            }
          `}
        />
      </mesh>

      {/* Distant horizon haze ring — lives just above fog so it reads as the
          silhouette of faraway hills. */}
      <mesh position={[0, 1.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[55, 64, 64]} />
        <meshBasicMaterial
          ref={horizonMat}
          color={theme.palette.fog}
          transparent
          opacity={0.7}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Cloud / dust drifting under the islands */}
      <Sparkles
        count={120}
        scale={[55, 5, 55]}
        position={[0, 2, 0]}
        size={4}
        speed={0.18}
        opacity={theme.id === "cyber" ? 0.25 : 0.55}
        color={theme.id === "cyber" ? theme.palette.accent : "#FFFFFF"}
      />
    </group>
  );
}
