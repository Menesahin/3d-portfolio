import { useAnimations, useGLTF } from "@react-three/drei";
import { useEffect, useRef } from "react";
import type * as THREE from "three";

/**
 * Loads a GLB from `/public/models/...` and renders it as a child group.
 * Enables shadows on every mesh and (optionally) plays the first animation
 * clip in a loop. Keep the URL stable across renders — drei's useGLTF
 * caches by URL so multiple consumers share one parse.
 *
 * Preload the URLs somewhere top-level (see `Mascot` / this file's bottom)
 * so the GLB starts fetching during route JS eval — prevents a scene
 * pop-in when the camera flies to the zone.
 */
type Props = {
  url: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  /** Play all baked animation clips in a loop. */
  play?: boolean;
};

export function GlbProp({
  url,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  play = false,
}: Props) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(url);
  const { actions, names } = useAnimations(animations, group);

  // Enable shadow casting + receiving on the whole subtree once.
  useEffect(() => {
    scene.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
  }, [scene]);

  useEffect(() => {
    if (!play) return;
    for (const name of names) {
      actions[name]?.reset().play();
    }
    return () => {
      for (const name of names) {
        actions[name]?.stop();
      }
    };
  }, [actions, names, play]);

  return (
    <group ref={group} position={position} rotation={rotation} scale={scale}>
      <primitive object={scene} />
    </group>
  );
}

// Preload the real GLBs used by islands. These start fetching during JS eval
// so the scene doesn't pop-in when the camera first flies to the zone.
useGLTF.preload("/models/props/damaged-helmet.glb");
useGLTF.preload("/models/props/duck.glb");
useGLTF.preload("/models/props/parrot.glb");
