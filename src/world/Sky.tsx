import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useActiveTheme } from "@/hooks/useActiveTheme";

/**
 * Gradient skybox — a large inverted sphere with a shader material that
 * blends `skyTop` → `skyBottom`. Colors are animated between themes.
 */
export function Sky() {
  const theme = useActiveTheme();
  const ref = useRef<THREE.ShaderMaterial>(null);
  const { scene } = useThree();

  // biome-ignore lint/correctness/useExhaustiveDependencies: uniforms must be stable; color values are mutated in useFrame
  const uniforms = useMemo(
    () => ({
      uTop: { value: new THREE.Color(theme.palette.skyTop) },
      uBottom: { value: new THREE.Color(theme.palette.skyBottom) },
    }),
    [],
  );

  // Target colors updated on theme change; damp into uniforms per frame.
  const targetTop = useMemo(() => new THREE.Color(theme.palette.skyTop), [theme]);
  const targetBottom = useMemo(() => new THREE.Color(theme.palette.skyBottom), [theme]);
  const targetFog = useMemo(() => new THREE.Color(theme.palette.fog), [theme]);

  useFrame((_, dt) => {
    if (!ref.current) return;
    uniforms.uTop.value.lerp(targetTop, 1 - Math.exp(-6 * dt));
    uniforms.uBottom.value.lerp(targetBottom, 1 - Math.exp(-6 * dt));
    if (scene.fog && scene.fog instanceof THREE.Fog) {
      scene.fog.color.lerp(targetFog, 1 - Math.exp(-6 * dt));
    }
  });

  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[200, 32, 16]} />
      <shaderMaterial
        ref={ref}
        side={THREE.BackSide}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`
          varying vec3 vPos;
          void main() {
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          varying vec3 vPos;
          uniform vec3 uTop;
          uniform vec3 uBottom;
          void main() {
            float t = clamp((vPos.y / 200.0) * 0.5 + 0.5, 0.0, 1.0);
            vec3 col = mix(uBottom, uTop, pow(t, 0.75));
            gl_FragColor = vec4(col, 1.0);
          }
        `}
      />
    </mesh>
  );
}
