import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import type * as THREE from "three";
import { useIsMobile } from "@/hooks/useIsMobile";

// Sketchfab's original export uses the deprecated
// KHR_materials_pbrSpecularGlossiness extension, which three.js no
// longer supports out of the box — materials would render pure white.
// We convert once via `gltf-transform metalrough` and ship the
// `-mr.glb` metal-rough variant instead. See plan notes.
useGLTF.preload("/models/stages/scifi-platform-mr.glb");

// The arena's central ceiling/light assembly sits between portrait cameras
// and every destination wall. Desktop keeps the architectural silhouette;
// mobile removes only these nodes so exhibits retain the full vertical frame.
// Future stage assets can opt in through a `MobileOccluder*` node name or a
// boolean `mobileOccluder` glTF extra.
const MOBILE_OCCLUDER_NODES = new Set([
  "Black_LightUpper",
  "Black_LightUpper_Black-Upper_0",
  "Light_Upper",
  "Light_Upper_Light-Upper_0",
]);

function isMobileOccluder(obj: THREE.Object3D): boolean {
  return (
    MOBILE_OCCLUDER_NODES.has(obj.name) ||
    obj.name.startsWith("MobileOccluder") ||
    obj.userData.mobileOccluder === true
  );
}

/**
 * Baked sci-fi platform — used as our interior / "building" shell.
 *
 * Source bbox at scale 1:
 *   X −19.88..19.88   Y −1.27..11.11   Z −19.87..19.87
 *
 * Scale is non-uniform: X/Z at 0.5 keeps the arena 20 u wide, but
 * Y at 1.0 stretches the ceiling to ~11 u so the building reads as
 * a proper tall hall rather than a flat disc. The baked panels are
 * mostly orthogonal so the vertical stretch doesn't introduce
 * obvious distortion.
 *
 * Materials use three.js' native metal-rough path after the
 * conversion, so baked diffuse + emissive read correctly.
 */
export function ScifiPlatform() {
  const { scene } = useGLTF("/models/stages/scifi-platform-mr.glb");
  const isMobile = useIsMobile();

  // Clone once so module-level cache stays unmodified across HMR.
  const stage = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    stage.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (!m.isMesh) return;
      // Platform catches the mascot's shadow on its floor, doesn't
      // cast one (the arena is our lightable interior, not an
      // obstacle).
      m.castShadow = false;
      m.receiveShadow = true;
    });
  }, [stage]);

  useEffect(() => {
    stage.traverse((obj) => {
      if (isMobileOccluder(obj)) obj.visible = !isMobile;
    });
  }, [isMobile, stage]);

  return <primitive object={stage} position={[0, 0, 0]} scale={[0.5, 1.0, 0.5]} />;
}
