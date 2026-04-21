import { useAnimations, useGLTF } from "@react-three/drei";
import { useEffect, useRef } from "react";
import type { Group } from "three";
import type { MascotConfig } from "./MascotConfig";

type Props = { config: MascotConfig & { assetUrl: string } };

/**
 * GLB-backed mascot. Loads the model + its clips, crossfades between
 * idle/walk based on the store's mascot.state (wired in Phase 3 via
 * Orchestrator). For Phase 1 we just play `idle` on mount.
 */
export function GlbMascot({ config }: Props) {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF(config.assetUrl);
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    const idleClip = config.animationMap.idle;
    const action = actions[idleClip];
    action?.reset().fadeIn(0.3).play();
    return () => {
      action?.fadeOut(0.2);
    };
  }, [actions, config]);

  return (
    <group ref={group} scale={config.scale} dispose={null}>
      <primitive object={scene} />
    </group>
  );
}
