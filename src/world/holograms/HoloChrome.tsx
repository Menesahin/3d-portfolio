import type * as THREE from "three";
import { isCockpitVariant, readWorldVariant } from "@/world/worldVariant";
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
  const embedded = isCockpitVariant(readWorldVariant());
  const halfW = w / 2;
  const halfH = h / 2;
  // Brackets sit just outside the frame and overshoot it by ~50% so the
  // L visibly extends past the corner, classic sci-fi UI read.
  const bracketOffset = FRAME_THICK / 2 + 0.012;
  const bracketX = halfW + bracketOffset;
  const bracketY = halfH + bracketOffset;

  if (embedded) {
    return (
      <group>
        <mesh position={[0, 0, -0.012]} material={plateMat}>
          <planeGeometry args={[w, h]} />
        </mesh>
        <mesh position={[0, halfH - 0.07, -0.004]}>
          <planeGeometry args={[w - 0.04, 0.14]} />
          <meshBasicMaterial color="#02090c" transparent opacity={0.92} depthWrite={false} />
        </mesh>
        <mesh position={[0, -halfH + 0.045, -0.004]}>
          <planeGeometry args={[w - 0.04, 0.09]} />
          <meshBasicMaterial color="#0b1719" transparent opacity={0.96} depthWrite={false} />
        </mesh>
        {scanlineMat ? (
          <HoloScanlines width={w - 0.04} height={h - 0.18} material={scanlineMat} />
        ) : null}
        <mesh position={[0, halfH - 0.015, 0.002]} material={frameMat}>
          <planeGeometry args={[w - 0.04, 0.012]} />
        </mesh>
        <mesh position={[0, -halfH + 0.015, 0.002]} material={frameMat}>
          <planeGeometry args={[w - 0.04, 0.012]} />
        </mesh>
        <mesh position={[-halfW + 0.015, 0, 0.002]} material={frameMat}>
          <planeGeometry args={[0.012, h - 0.04]} />
        </mesh>
        <mesh position={[halfW - 0.015, 0, 0.002]} material={frameMat}>
          <planeGeometry args={[0.012, h - 0.04]} />
        </mesh>
      </group>
    );
  }

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

      {/* Cyber L-brackets belong to the legacy hologram language. Cockpit
          screens already have deep Blender bezels and physical fasteners. */}
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
