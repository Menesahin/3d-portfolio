import type * as THREE from "three";

/**
 * A thin quad rendered above the back plate but below the frame,
 * carrying the shared scanline `ShaderMaterial` from `useHoloFade`.
 * Pure presentation — no state.
 */
export function HoloScanlines({
  width,
  height,
  material,
}: {
  width: number;
  height: number;
  material: THREE.ShaderMaterial;
}) {
  return (
    <mesh position={[0, 0, -0.005]} material={material}>
      <planeGeometry args={[width, height]} />
    </mesh>
  );
}
