import { useAnimations, useGLTF } from "@react-three/drei";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useStore } from "@/stores";
import type { AnimationMap, MascotConfig } from "./MascotConfig";

type Props = { config: MascotConfig & { assetUrl: string } };

// Preload at module scope — the GLB fetches while the route JS evaluates.
useGLTF.preload("/models/robot-playground.glb");

/**
 * GLB-backed mascot. Plays whichever single clip the config maps idle
 * to as a continuous loop (the playground GLB's "Experiment" animation
 * is a self-contained mini-scene — no crossfade needed). Gesture
 * requests still clear themselves via the auto-timer so emotes stay in
 * step even when the robot's own animation is unchanged.
 */
export function GlbMascot({ config }: Props) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(config.assetUrl);
  const { actions } = useAnimations(animations, group);

  const gesture = useStore((s) => s.mascot.gesture);
  const setGesture = useStore((s) => s.setGesture);

  // Enable shadow-casting across the whole scene graph once on load.
  useEffect(() => {
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        (obj as THREE.Mesh).castShadow = true;
      }
    });
  }, [scene]);

  // Base loop — play idle (or the only clip) continuously.
  useEffect(() => {
    const idleName = config.animationMap.idle;
    const idle = actions[idleName];
    if (!idle) return;
    idle.reset().fadeIn(0.3).play();
    return () => {
      idle.fadeOut(0.25);
    };
  }, [actions, config.animationMap]);

  // Gesture overlay — plays the mapped clip once then auto-clears store.
  useEffect(() => {
    if (!gesture) return;
    const clipName = (config.animationMap as AnimationMap)[gesture];
    if (!clipName) {
      // No mapped clip for this gesture — clear after a short window.
      const id = window.setTimeout(() => setGesture(null), 900);
      return () => window.clearTimeout(id);
    }
    const action = actions[clipName];
    if (!action) return;

    action.reset();
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.fadeIn(0.15).play();
    const duration = action.getClip().duration * (config.gestureTimeScale ?? 1);
    const id = window.setTimeout(
      () => {
        action.fadeOut(0.25);
        setGesture(null);
      },
      Math.max(500, duration * 1000 - 150),
    );
    return () => {
      window.clearTimeout(id);
    };
  }, [actions, config, gesture, setGesture]);

  return (
    <group ref={group} scale={config.scale} dispose={null}>
      <primitive object={scene} />
    </group>
  );
}
