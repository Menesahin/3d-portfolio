import type * as THREE from "three";
import { HoloScanlines } from "./HoloScanlines";

/**
 * Reusable V7 embedded-screen chrome — dark back plate, optional
 * scanlines, physical header/footer bands, and emissive frame strips.
 * Materials come from `useHoloFade` so the caller controls the fade
 * cycle. `scanlineMat` is optional because callers that update content
 * every frame (e.g. the speech bubble with streaming text) prefer a
 * static surface.
 */
export function HoloChrome({
  width,
  height,
  plateMat,
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
