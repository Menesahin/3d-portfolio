import * as THREE from "three";

/**
 * Shared write-only mirror of the mascot's lerped world position.
 * `Mascot.tsx` updates this each frame after its position lerp; consumers
 * (e.g. `MascotHalo`) read it without subscribing to the store, so we
 * avoid React re-renders for what is purely a per-frame visual concern.
 */
export const mascotPosRef = { current: new THREE.Vector3() };
