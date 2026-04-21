import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useActiveTheme } from "@/hooks/useActiveTheme";

/**
 * Ground plane. In Dreamy it's a soft cream circle that catches shadows.
 * In Cyber it's a grid of emissive lines fading into fog.
 */
export function Ground() {
  const theme = useActiveTheme();
  const planeMat = useRef<THREE.MeshStandardMaterial>(null);
  const gridMat = useRef<THREE.ShaderMaterial>(null);

  const targetPlane = useMemo(() => new THREE.Color(theme.palette.island), [theme]);
  const targetGrid = useMemo(() => new THREE.Color(theme.palette.accent), [theme]);

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-6 * dt);
    if (planeMat.current) planeMat.current.color.lerp(targetPlane, k);
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
      {/* Base plane: catches shadows, holds color */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[60, 64]} />
        <meshStandardMaterial
          ref={planeMat}
          color={theme.palette.island}
          roughness={0.95}
          metalness={0.0}
        />
      </mesh>

      {/* Grid overlay (visible in cyber, invisible in dreamy) */}
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
    </group>
  );
}
