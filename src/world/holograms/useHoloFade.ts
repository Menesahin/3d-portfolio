import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * Shared fade + material plumbing for every hologram scene.
 *
 * Returns four shared materials (plate, halo, frame, scanline) whose
 * opacities are ramped toward `intensity` each frame. Use them via
 * `<mesh material={…}>` so the opacity mutation applies across every
 * mesh that shares the reference — no re-render needed for fades.
 *
 * `intensity` is the target opacity in [0, 1]:
 *   - 1   → fully visible (active wall hologram, or contact when shown)
 *   - 0.4 → ambient-dim wall (idle, not the active section)
 *   - 0   → fully hidden (contact when not shown)
 *
 *  - **plateMat** — dark back plate (`MeshBasicMaterial`)
 *  - **haloMat** — retained as a shared transparent material for chrome
 *  - **frameMat** — emissive accent frame strips
 *  - **scanlineMat** — `ShaderMaterial` with a `uTime` uniform that
 *    scrolls horizontal accent stripes across the plate
 *
 * `rootRef` is the V7 screen scale pivot.
 * `opacityRef.current` is the raw [0,1] level for callers that want to
 * derive a text fillOpacity at render time.
 */
export function useHoloFade(
  intensity: number,
  accent: string,
  baseScale = 1,
): {
  rootRef: React.RefObject<THREE.Group | null>;
  plateMat: THREE.MeshBasicMaterial;
  haloMat: THREE.MeshBasicMaterial;
  frameMat: THREE.MeshBasicMaterial;
  scanlineMat: THREE.ShaderMaterial;
  opacityRef: React.RefObject<number>;
} {
  const rootRef = useRef<THREE.Group>(null);
  const opacityRef = useRef(0);

  const plateMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color("#061014"),
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [],
  );
  // V7 screens sit inside physical bezels, so the halo remains transparent
  // while callers keep one stable material contract.
  const haloMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(accent),
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [accent],
  );
  const frameMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(accent),
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [accent],
  );

  // Shader: draw thin, soft-edged horizontal stripes that scroll very
  // slowly. `uOpacity` is multiplied in at the end so the shared fade
  // still gates the whole thing.
  const scanlineMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: 0 },
          uColor: { value: new THREE.Color(accent) },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          varying vec2 vUv;
          uniform float uTime;
          uniform float uOpacity;
          uniform vec3  uColor;
          void main() {
            // 70 horizontal stripes slowly scrolling upward.
            float y = vUv.y * 70.0 + uTime * 0.6;
            float hband = smoothstep(0.6, 1.0, abs(sin(y * 3.14159)));
            // Vertical lattice — wider gap, fainter than horizontals so
            // the panel reads as a CRT/holographic grid not a texture.
            float x = vUv.x * 24.0;
            float vband = smoothstep(0.85, 1.0, abs(sin(x * 3.14159))) * 0.45;
            // Slow horizontal sweep — single bright bar travels top→bottom
            // every ~5s, sells "scan in progress" feel.
            float sweepY = fract(uTime * 0.18);
            float sweep = smoothstep(0.04, 0.0, abs(vUv.y - (1.0 - sweepY))) * 0.6;
            // Brighter near the top (phosphor decay).
            float topBias = smoothstep(0.2, 1.0, vUv.y) * 0.4 + 0.6;
            float a = (hband * 0.12 + vband * 0.08 + sweep * 0.18) * topBias * uOpacity;
            gl_FragColor = vec4(uColor, a);
          }
        `,
      }),
    [accent],
  );

  useEffect(
    () => () => {
      plateMat.dispose();
      haloMat.dispose();
      frameMat.dispose();
      scanlineMat.dispose();
    },
    [plateMat, haloMat, frameMat, scanlineMat],
  );

  const timeRef = useRef(0);

  useFrame((_, dt) => {
    const target = Math.max(0, Math.min(1, intensity));
    const k = 1 - Math.exp(-6 * dt);
    opacityRef.current += (target - opacityRef.current) * k;

    if (rootRef.current) rootRef.current.scale.setScalar(baseScale);

    const o = opacityRef.current;
    plateMat.opacity = 0.96 * o;
    timeRef.current += dt;
    frameMat.opacity = 0.46 * o;
    haloMat.opacity = 0;

    // Scanlines — tick uTime regardless of fade so a new appear doesn't
    // re-start the scroll; uOpacity handles visibility.
    const timeUniform = scanlineMat.uniforms.uTime;
    const opacityUniform = scanlineMat.uniforms.uOpacity;
    if (timeUniform) timeUniform.value = timeRef.current;
    if (opacityUniform) opacityUniform.value = o * 0.28;
  });

  return { rootRef, plateMat, haloMat, frameMat, scanlineMat, opacityRef };
}
