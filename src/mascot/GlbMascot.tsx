import { useAnimations, useGLTF } from "@react-three/drei";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useStore } from "@/stores";
import type { AnimationMap, MascotConfig } from "./MascotConfig";

// Robot body tint — currently OFF. The mechanism stays so a future
// palette pick is one constant change away. To enable, set strength
// > 0 (lerp factor, 0 = original GLB, 1 = pure tint replacement).
// Tried so far:
//   - theme.accent (cyan) → muddy green when multiplied over amber
//   - warm off-white #E6E1D4 → indistinguishable from original
//   - cool pewter #A4B0C2 lerp 0.85 → user disliked
// The original baked amber actually contrasts the cool cyan room well;
// returning to it until a palette decision is made.
const BODY_TINT = "#A4B0C2";
const BODY_TINT_STRENGTH = 0;

type Props = { config: MascotConfig & { assetUrl: string } };

// Preload at module scope — the GLB fetches while the route JS evaluates.
useGLTF.preload("/models/RobotExpressive.glb");

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

  // Shadow casting + selective body tint.
  //
  // We clone each material once so the shared GLTF cache (across mounts
  // / HMR) isn't mutated, capture the ORIGINAL diffuse colour on the
  // mesh's userData, then re-derive each material's colour from that
  // original on every render. Idempotent.
  //
  // Tint is multiplicative — preserves the GLB's baked shading + relative
  // luminance — and is *skipped* for "feature" meshes so the robot keeps
  // its eyes / eyebrows / mouth / visor identity instead of becoming a
  // featureless monochrome blob:
  //   - dark base colours (luminance < 0.25) → kept verbatim
  //   - any emissive material → kept verbatim
  //   - mesh names matching eye / brow / mouth / visor / etc. → kept
  useEffect(() => {
    const tint = new THREE.Color(BODY_TINT);
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      const mat = mesh.material;
      if (!mat || Array.isArray(mat)) return;

      const ud = mesh.userData as {
        __tinted?: boolean;
        __originalColor?: THREE.Color;
      };
      if (!ud.__tinted) {
        const cloned = (mat as THREE.Material).clone();
        mesh.material = cloned;
        ud.__tinted = true;
        const m0 = cloned as THREE.MeshStandardMaterial;
        ud.__originalColor = m0.color ? m0.color.clone() : new THREE.Color("#ffffff");
      }

      const m = mesh.material as THREE.MeshStandardMaterial;
      const orig = ud.__originalColor ?? new THREE.Color("#ffffff");
      const lum = orig.r * 0.299 + orig.g * 0.587 + orig.b * 0.114;
      const hasEmissive = !!m.emissive && m.emissive.r + m.emissive.g + m.emissive.b > 0;
      const featureName = /eye|brow|mouth|tooth|visor|pupil|smile|face/i.test(mesh.name);

      if (lum < 0.25 || hasEmissive || featureName) {
        m.color.copy(orig);
      } else {
        // lerp from original toward tint — visible shift but preserves
        // some per-part variation from the GLB's baked palette.
        m.color.copy(orig).lerp(tint, BODY_TINT_STRENGTH);
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
