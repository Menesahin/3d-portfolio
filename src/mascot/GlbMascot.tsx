import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useStore } from "@/stores";
import { getEmotionChoreography } from "./emotionChoreography";
import { type AnimationMap, KOFTE_ASSET_URL, type MascotConfig } from "./MascotConfig";

// Köfte's production palette is authored in Blender. Runtime tint remains a
// deliberately disabled emergency override so cached GLTF materials are not
// destructively recoloured across mounts.
const BODY_TINT = "#A4B0C2";
const BODY_TINT_STRENGTH = 0;

type Props = { config: MascotConfig & { assetUrl: string } };

// Preload at module scope — the GLB fetches while the route JS evaluates.
useGLTF.preload("/models/RobotExpressive.glb");
useGLTF.preload(KOFTE_ASSET_URL);

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
  const specialMotion = useStore((s) => s.mascot.specialMotion);
  const gesture = useStore((s) => s.mascot.gesture);
  const expression = useStore((s) => s.mascot.expression);
  const isStreaming = useStore((s) => s.chat.isStreaming);
  const setGesture = useStore((s) => s.setGesture);
  const blink = useRef({ next: 1.8, remaining: 0 });
  const gaze = useRef({ next: 0.6, x: 0, y: 0 });
  const travelBlend = useRef(0);

  const face = useMemo(() => {
    const left = scene.getObjectByName("Kofte_Eye_L");
    const right = scene.getObjectByName("Kofte_Eye_R");
    const browLeft = scene.getObjectByName("Kofte_Brow_L");
    const browRight = scene.getObjectByName("Kofte_Brow_R");
    const tear = scene.getObjectByName("Kofte_V7Detail_Tear_R");
    return {
      left,
      right,
      browLeft,
      browRight,
      mouth: scene.getObjectByName("Kofte_Mouth"),
      mouthCornerLeft: scene.getObjectByName("Kofte_V7Detail_MouthCorner_L"),
      mouthCornerRight: scene.getObjectByName("Kofte_V7Detail_MouthCorner_R"),
      eyeSparkLeft: scene.getObjectByName("Kofte_V7Detail_EyeSpark_L"),
      eyeSparkRight: scene.getObjectByName("Kofte_V7Detail_EyeSpark_R"),
      tear,
      antennaTip: scene.getObjectByName("Kofte_AntennaTip"),
      hoverRing: scene.getObjectByName("Kofte_HoverRing"),
      rootBone: scene.getObjectByName("root"),
      rootBoneBase: scene.getObjectByName("root")?.quaternion.clone(),
      leftBase: left?.position.clone(),
      rightBase: right?.position.clone(),
      browLeftBase: browLeft?.position.clone(),
      browRightBase: browRight?.position.clone(),
      tearBase: tear?.position.clone(),
    };
  }, [scene]);

  // Expression add-ons are exported at near-zero scale to prevent a one-frame
  // flash while the GLB resolves. React owns their visibility from here on.
  useLayoutEffect(() => {
    for (const node of [
      face.mouthCornerLeft,
      face.mouthCornerRight,
      face.eyeSparkLeft,
      face.eyeSparkRight,
      face.tear,
    ]) {
      if (!node) continue;
      node.scale.setScalar(0.001);
      node.visible = false;
    }
  }, [face]);

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

  // Base loop — idle when still, hover-flight while moving, talk while the
  // assistant streams. Gesture actions remain short overlays.
  const baseName =
    state === "moving"
      ? config.animationMap.walk
      : isStreaming && config.talk
        ? config.talk
        : config.animationMap.idle;
  useEffect(() => {
    const action = actions[baseName] ?? actions[config.animationMap.idle];
    if (!action) return;

    for (const candidate of new Set([
      config.animationMap.idle,
      config.animationMap.walk,
      config.talk,
    ])) {
      if (candidate && candidate !== baseName) actions[candidate]?.fadeOut(0.2);
    }
    action.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.25).play();
    return () => {
      action.fadeOut(0.2);
    };
  }, [actions, baseName, config.animationMap, config.talk]);

  // Köfte's visor expressions are held states rather than action clips.
  // The named eye/mouth nodes come from the Blender export contract.
  useFrame(({ clock }, dt) => {
    const emotion = getEmotionChoreography(expression);
    const mascotRoot = group.current;
    if (mascotRoot) {
      const moving = state === "moving";
      travelBlend.current = THREE.MathUtils.damp(
        travelBlend.current,
        moving ? 1 : 0,
        moving ? 5.5 : 3.8,
        dt,
      );
      const travel = travelBlend.current;
      const dartLean = specialMotion?.kind === "dart" ? 0.17 : 0;
      const cruiseLean = moving ? 0.075 : 0;
      const excitedPulse =
        expression === "excited" ? 1 + Math.sin(clock.elapsedTime * 7.2) * 0.018 : 1;
      const emotionBob =
        expression === "excited"
          ? 0.025 + Math.abs(Math.sin(clock.elapsedTime * 5.8)) * 0.055
          : expression === "happy"
            ? Math.sin(clock.elapsedTime * 3.4) * 0.012
            : 0;
      mascotRoot.rotation.x = THREE.MathUtils.damp(
        mascotRoot.rotation.x,
        -(cruiseLean + dartLean) + emotion.pitch,
        6,
        dt,
      );
      mascotRoot.rotation.z = THREE.MathUtils.damp(
        mascotRoot.rotation.z,
        Math.sin(clock.elapsedTime * 5.4) * travel * 0.035,
        7,
        dt,
      );
      mascotRoot.position.y = THREE.MathUtils.damp(
        mascotRoot.position.y,
        travel * (0.055 + Math.sin(clock.elapsedTime * 8.2) * 0.025) + emotion.lift + emotionBob,
        8,
        dt,
      );
      const targetScale = config.scale * emotion.scale * excitedPulse;
      const nextScale = THREE.MathUtils.damp(mascotRoot.scale.x, targetScale, 7, dt);
      mascotRoot.scale.setScalar(nextScale);
    }

    if (face.rootBone && face.rootBoneBase && state !== "moving" && !gesture) {
      face.rootBone.quaternion.slerp(face.rootBoneBase, 1 - Math.exp(-12 * dt));
    }

    if (!face.left || !face.right || !face.mouth) return;
    const target = (() => {
      switch (expression) {
        case "happy":
          return {
            leftY: 0.48,
            rightY: 0.48,
            leftR: 0.18,
            rightR: -0.18,
            mouthX: 1.25,
            mouthY: 0.8,
            browLeftR: -0.12,
            browRightR: 0.12,
            browY: 0,
          };
        case "excited":
          return {
            leftY: 0.94,
            rightY: 0.94,
            leftR: -0.04,
            rightR: 0.04,
            mouthX: 0.78,
            mouthY: 2.15,
            browLeftR: -0.08,
            browRightR: 0.08,
            browY: 0.065,
          };
        case "surprised":
          return {
            leftY: 1.22,
            rightY: 1.22,
            leftR: 0,
            rightR: 0,
            mouthX: 0.72,
            mouthY: 2.2,
            browLeftR: 0,
            browRightR: 0,
            browY: 0.045,
          };
        case "thinking":
          return {
            leftY: 0.72,
            rightY: 1.05,
            leftR: -0.12,
            rightR: 0.08,
            mouthX: 0.72,
            mouthY: 0.75,
            browLeftR: 0.26,
            browRightR: -0.08,
            browY: 0,
          };
        case "sad":
          return {
            leftY: 0.68,
            rightY: 0.68,
            leftR: -0.28,
            rightR: 0.28,
            mouthX: 0.82,
            mouthY: 0.65,
            browLeftR: 0.28,
            browRightR: -0.28,
            browY: -0.01,
          };
        case "wink":
          return {
            leftY: 0.12,
            rightY: 0.85,
            leftR: 0.08,
            rightR: -0.12,
            mouthX: 1.1,
            mouthY: 0.75,
            browLeftR: -0.2,
            browRightR: 0.08,
            browY: 0,
          };
        default:
          return {
            leftY: 1,
            rightY: 1,
            leftR: 0,
            rightR: 0,
            mouthX: 1,
            mouthY: 1,
            browLeftR: -0.04,
            browRightR: 0.04,
            browY: 0,
          };
      }
    })();

    // Organic blink cadence: a fast close/open every ~2–4 seconds. It is
    // layered over semantic expressions so happy/wink/surprised states keep
    // their identity while the mascot still feels alive.
    blink.current.next -= dt;
    if (blink.current.remaining > 0) blink.current.remaining -= dt;
    if (blink.current.next <= 0 && blink.current.remaining <= 0) {
      blink.current.remaining = 0.17;
      blink.current.next = 2.25 + (Math.sin(clock.elapsedTime * 1.73) + 1) * 0.85;
    }
    const blinkPhase = Math.max(0, 1 - blink.current.remaining / 0.17);
    const blinkScale = blink.current.remaining > 0 ? 1 - Math.sin(blinkPhase * Math.PI) * 0.92 : 1;

    // Small held gaze targets create readable saccades without jitter. Eye
    // travel is constrained to the visor surface.
    gaze.current.next -= dt;
    if (gaze.current.next <= 0) {
      gaze.current.x = Math.sin(clock.elapsedTime * 2.31) * 0.026;
      gaze.current.y = Math.sin(clock.elapsedTime * 1.47) * 0.014;
      gaze.current.next = 0.7 + (Math.sin(clock.elapsedTime * 0.91) + 1) * 0.5;
    }

    const viseme = isStreaming ? 0.88 + Math.abs(Math.sin(clock.elapsedTime * 9.5)) * 0.72 : 1;
    const k = 1 - Math.exp(-10 * dt);
    const eyePulse = expression === "excited" ? 1 + Math.sin(clock.elapsedTime * 8.6) * 0.075 : 1;
    face.left.scale.y = THREE.MathUtils.lerp(
      face.left.scale.y,
      target.leftY * eyePulse * blinkScale,
      k,
    );
    face.right.scale.y = THREE.MathUtils.lerp(
      face.right.scale.y,
      target.rightY * eyePulse * blinkScale,
      k,
    );
    face.left.rotation.z = THREE.MathUtils.lerp(face.left.rotation.z, target.leftR, k);
    face.right.rotation.z = THREE.MathUtils.lerp(face.right.rotation.z, target.rightR, k);
    face.mouth.scale.x = THREE.MathUtils.lerp(
      face.mouth.scale.x,
      target.mouthX * (isStreaming ? 0.92 + Math.abs(Math.sin(clock.elapsedTime * 5.2)) * 0.24 : 1),
      k,
    );
    face.mouth.scale.y = THREE.MathUtils.lerp(face.mouth.scale.y, target.mouthY * viseme, k);

    if (face.leftBase && face.rightBase) {
      face.left.position.x = THREE.MathUtils.lerp(
        face.left.position.x,
        face.leftBase.x + gaze.current.x,
        k,
      );
      face.left.position.y = THREE.MathUtils.lerp(
        face.left.position.y,
        face.leftBase.y + gaze.current.y,
        k,
      );
      face.right.position.x = THREE.MathUtils.lerp(
        face.right.position.x,
        face.rightBase.x + gaze.current.x,
        k,
      );
      face.right.position.y = THREE.MathUtils.lerp(
        face.right.position.y,
        face.rightBase.y + gaze.current.y,
        k,
      );
    }

    if (face.browLeft && face.browRight) {
      face.browLeft.rotation.z = THREE.MathUtils.lerp(
        face.browLeft.rotation.z,
        target.browLeftR,
        k,
      );
      face.browRight.rotation.z = THREE.MathUtils.lerp(
        face.browRight.rotation.z,
        target.browRightR,
        k,
      );
      if (face.browLeftBase && face.browRightBase) {
        face.browLeft.position.y = THREE.MathUtils.lerp(
          face.browLeft.position.y,
          face.browLeftBase.y + target.browY,
          k,
        );
        face.browRight.position.y = THREE.MathUtils.lerp(
          face.browRight.position.y,
          face.browRightBase.y + target.browY,
          k,
        );
      }
    }

    const animateEffectScale = (node: THREE.Object3D | undefined, amount: number) => {
      if (!node) return;
      if (amount > 0.01) node.visible = true;
      node.scale.x = THREE.MathUtils.damp(node.scale.x, amount, 13, dt);
      node.scale.y = THREE.MathUtils.damp(node.scale.y, amount, 13, dt);
      node.scale.z = THREE.MathUtils.damp(node.scale.z, amount, 13, dt);
      if (amount <= 0.01 && node.scale.x < 0.018) node.visible = false;
    };

    const hasCurvedMouth = expression === "happy" || expression === "sad";
    const mouthCornerScale = hasCurvedMouth ? 1 : 0.001;
    animateEffectScale(face.mouthCornerLeft, mouthCornerScale);
    animateEffectScale(face.mouthCornerRight, mouthCornerScale);
    if (face.mouthCornerLeft && face.mouthCornerRight) {
      const direction = expression === "happy" ? 1 : -1;
      face.mouthCornerLeft.rotation.z = THREE.MathUtils.damp(
        face.mouthCornerLeft.rotation.z,
        -0.48 * direction,
        11,
        dt,
      );
      face.mouthCornerRight.rotation.z = THREE.MathUtils.damp(
        face.mouthCornerRight.rotation.z,
        0.48 * direction,
        11,
        dt,
      );
    }

    const sparkleScale =
      expression === "excited" ? 0.96 + Math.abs(Math.sin(clock.elapsedTime * 7.4)) * 0.24 : 0.001;
    animateEffectScale(face.eyeSparkLeft, sparkleScale);
    animateEffectScale(face.eyeSparkRight, sparkleScale);
    if (face.eyeSparkLeft && face.eyeSparkRight) {
      face.eyeSparkLeft.rotation.z += dt * 2.4;
      face.eyeSparkRight.rotation.z -= dt * 2.4;
    }

    animateEffectScale(face.tear, expression === "sad" ? 1 : 0.001);
    if (face.tear && face.tearBase) {
      face.tear.position.y = THREE.MathUtils.damp(
        face.tear.position.y,
        face.tearBase.y -
          (expression === "sad" ? 0.025 + Math.sin(clock.elapsedTime * 3.1) * 0.012 : 0),
        7,
        dt,
      );
    }

    const antennaMaterial = (face.antennaTip as THREE.Mesh | undefined)?.material;
    if (antennaMaterial && !Array.isArray(antennaMaterial)) {
      (antennaMaterial as THREE.MeshStandardMaterial).emissiveIntensity =
        1.15 + Math.sin(clock.elapsedTime * 3.4) * 0.22;
    }
    const hoverMaterial = (face.hoverRing as THREE.Mesh | undefined)?.material;
    if (hoverMaterial && !Array.isArray(hoverMaterial)) {
      const travelBoost = state === "moving" ? 1.15 : 0;
      (hoverMaterial as THREE.MeshStandardMaterial).emissiveIntensity =
        1.15 + travelBoost + Math.sin(clock.elapsedTime * 5.8) * (state === "moving" ? 0.35 : 0.18);
    }
  });

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
    const baseAction = actions[baseName] ?? actions[config.animationMap.idle];

    // These authored clips are full-body poses, not additive layers. Fade the
    // loop out briefly so the arms reach their intended silhouette instead of
    // being averaged halfway back toward Idle/Talk by the mixer.
    if (baseAction && baseAction !== action) baseAction.fadeOut(0.12);
    action.reset();
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.fadeIn(0.15).play();
    const duration = action.getClip().duration * (config.gestureTimeScale ?? 1);
    const id = window.setTimeout(
      () => {
        action.fadeOut(0.25);
        if (baseAction && baseAction !== action) baseAction.fadeIn(0.25).play();
        setGesture(null);
      },
      Math.max(500, duration * 1000 - 150),
    );
    return () => {
      window.clearTimeout(id);
      action.fadeOut(0.2);
      if (baseAction && baseAction !== action) baseAction.fadeIn(0.25).play();
    };
  }, [actions, baseName, config, gesture, setGesture]);

  return (
    <group ref={group} scale={config.scale} dispose={null}>
      <primitive object={scene} />
    </group>
  );
}
