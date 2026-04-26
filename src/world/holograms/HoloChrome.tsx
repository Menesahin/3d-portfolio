import type * as THREE from "three";
import { HoloScanlines } from "./HoloScanlines";

const FRAME_THICK = 0.028;
const GLOW_INSET = 0.05;
const CORNER_LEN = 0.22;
const CORNER_THICK = 0.024;

/**
 * Reusable "hologram window" chrome — halo + dark back plate +
 * (optional) scanline overlay + four thin emissive frame strips +
 * cyber-style L-shaped corner brackets that bleed past the frame.
 * Materials come from `useHoloFade` so the caller controls the fade
 * cycle. `scanlineMat` is optional because callers that update content
 * every frame (e.g. the speech bubble with streaming text) prefer a
 * static surface.
 */
export function HoloChrome({
  width,
  height,
  plateMat,
  haloMat,
  frameMat,
  scanlineMat,
  frameInset = 0,
}: {
  width: number;
  height: number;
  plateMat: THREE.MeshBasicMaterial;
  haloMat: THREE.MeshBasicMaterial;
  frameMat: THREE.MeshBasicMaterial;
  scanlineMat?: THREE.ShaderMaterial;
  frameInset?: number;
}) {
  const w = width + frameInset * 2;
  const h = height + frameInset * 2;
  const halfW = w / 2;
  const halfH = h / 2;
  // Brackets sit just outside the frame and overshoot it by ~50% so the
  // L visibly extends past the corner, classic sci-fi UI read.
  const bracketOffset = FRAME_THICK / 2 + 0.012;
  const bracketX = halfW + bracketOffset;
  const bracketY = halfH + bracketOffset;

  return (
    <group>
      {/* Halo — faint accent glow behind the plate. */}
      <mesh position={[0, 0, -0.02]} material={haloMat}>
        <planeGeometry args={[w + GLOW_INSET * 2, h + GLOW_INSET * 2]} />
      </mesh>

      {/* Back plate. */}
      <mesh position={[0, 0, -0.01]} material={plateMat}>
        <planeGeometry args={[w, h]} />
      </mesh>

      {/* Scanline + grid overlay — sits just above the plate. */}
      {scanlineMat ? <HoloScanlines width={w} height={h} material={scanlineMat} /> : null}

      {/* Frame — four thin strips. */}
      <mesh position={[0, halfH, 0.001]} material={frameMat}>
        <planeGeometry args={[w + FRAME_THICK, FRAME_THICK]} />
      </mesh>
      <mesh position={[0, -halfH, 0.001]} material={frameMat}>
        <planeGeometry args={[w + FRAME_THICK, FRAME_THICK]} />
      </mesh>
      <mesh position={[-halfW, 0, 0.001]} material={frameMat}>
        <planeGeometry args={[FRAME_THICK, h]} />
      </mesh>
      <mesh position={[halfW, 0, 0.001]} material={frameMat}>
        <planeGeometry args={[FRAME_THICK, h]} />
      </mesh>

      {/* Cyber L-brackets — four corners. Each bracket is two thin strips
          at 90°, slightly outside the frame, overshooting the corner. */}
      {/* Top-left */}
      <mesh position={[-bracketX + CORNER_LEN / 2, bracketY, 0.002]} material={frameMat}>
        <planeGeometry args={[CORNER_LEN, CORNER_THICK]} />
      </mesh>
      <mesh position={[-bracketX, bracketY - CORNER_LEN / 2, 0.002]} material={frameMat}>
        <planeGeometry args={[CORNER_THICK, CORNER_LEN]} />
      </mesh>
      {/* Top-right */}
      <mesh position={[bracketX - CORNER_LEN / 2, bracketY, 0.002]} material={frameMat}>
        <planeGeometry args={[CORNER_LEN, CORNER_THICK]} />
      </mesh>
      <mesh position={[bracketX, bracketY - CORNER_LEN / 2, 0.002]} material={frameMat}>
        <planeGeometry args={[CORNER_THICK, CORNER_LEN]} />
      </mesh>
      {/* Bottom-left */}
      <mesh position={[-bracketX + CORNER_LEN / 2, -bracketY, 0.002]} material={frameMat}>
        <planeGeometry args={[CORNER_LEN, CORNER_THICK]} />
      </mesh>
      <mesh position={[-bracketX, -bracketY + CORNER_LEN / 2, 0.002]} material={frameMat}>
        <planeGeometry args={[CORNER_THICK, CORNER_LEN]} />
      </mesh>
      {/* Bottom-right */}
      <mesh position={[bracketX - CORNER_LEN / 2, -bracketY, 0.002]} material={frameMat}>
        <planeGeometry args={[CORNER_LEN, CORNER_THICK]} />
      </mesh>
      <mesh position={[bracketX, -bracketY + CORNER_LEN / 2, 0.002]} material={frameMat}>
        <planeGeometry args={[CORNER_THICK, CORNER_LEN]} />
      </mesh>
    </group>
  );
}
