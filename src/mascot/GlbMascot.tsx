import { useAnimations, useGLTF } from "@react-three/drei";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useStore } from "@/stores";
import type { AnimationMap, MascotConfig } from "./MascotConfig";

type Props = { config: MascotConfig & { assetUrl: string } };

// Preload at module scope — the GLB fetches while the route JS evaluates.
useGLTF.preload("/models/robot-expressive.glb");

/**
 * GLB-backed mascot. Crossfades idle↔walk based on movement, and plays
 * mapped clips when a gesture is requested. Falls back silently when a
 * gesture has no clip (the ProceduralMascot provides richer motion for
 * those, but for the GLB we just let the emote icon carry it).
 */
export function GlbMascot({ config }: Props) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(config.assetUrl);
  const { actions } = useAnimations(animations, group);

  const state = useStore((s) => s.mascot.state);
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

  // Base loop — idle when still, walk when moving.
  useEffect(() => {
    const idleName = config.animationMap.idle;
    const walkName = config.animationMap.walk;
    const idle = actions[idleName];
    const walk = actions[walkName];
    if (!idle || !walk) return;

    if (state === "moving") {
      idle.fadeOut(0.25);
      walk.reset().fadeIn(0.25).play();
      return () => {
        walk.fadeOut(0.25);
      };
    }
    walk.fadeOut(0.25);
    idle.reset().fadeIn(0.25).play();
    return () => {
      idle.fadeOut(0.25);
    };
  }, [actions, config.animationMap, state]);

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
