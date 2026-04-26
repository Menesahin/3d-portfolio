import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useActiveTheme } from "@/hooks/useActiveTheme";
import { useStore } from "@/stores";
import type { MascotGesture } from "@/types/tools";

/**
 * Procedural fallback mascot. Primitive body + procedural gesture animations
 * driven by `store.mascot.gesture`. Each gesture has a duration; when it's
 * up the gesture is cleared back to `null` so the LLM can trigger the same
 * one twice in a row if it wants to.
 */

const GESTURE_DURATION_MS: Record<MascotGesture, number> = {
  wave: 1200,
  point: 1500,
  thumbs_up: 1000,
  head_tilt: 1100,
  bow: 1300,
  dance: 1800,
  flip: 1200,
  spin_happy: 1500,
  shy: 1000,
};

/** Visor emissive colour per expression — expression is held state (no clear). */
function expressionStyle(
  face: string,
  accent: string,
  cyber: boolean,
): { color: string; intensity: number } {
  switch (face) {
    case "happy":
      return { color: "#7BD88F", intensity: cyber ? 1.8 : 0.9 };
    case "surprised":
      return { color: accent, intensity: cyber ? 2.2 : 1.2 };
    case "thinking":
      return { color: "#FFD36B", intensity: cyber ? 1.6 : 0.8 };
    case "sad":
      return { color: "#6B94FF", intensity: cyber ? 1.2 : 0.55 };
    case "wink":
      return { color: accent, intensity: cyber ? 1.6 : 0.9 };
    default:
      return { color: accent, intensity: cyber ? 1.4 : 0.6 };
  }
}

export function ProceduralMascot() {
  const theme = useActiveTheme();
  const group = useRef<THREE.Group>(null);
  const leftArmPivot = useRef<THREE.Group>(null);
  const rightArmPivot = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const visorMat = useRef<THREE.MeshStandardMaterial>(null);

  const gesture = useStore((s) => s.mascot.gesture);
  const expression = useStore((s) => s.mascot.expression);
  const setGesture = useStore((s) => s.setGesture);

  // Gesture timeline — set `born` when a new gesture starts; clear afterwards.
  const born = useRef<number | null>(null);
  useEffect(() => {
    if (gesture) {
      born.current = performance.now();
      const dur = GESTURE_DURATION_MS[gesture];
      const id = setTimeout(() => setGesture(null), dur);
      return () => clearTimeout(id);
    }
    born.current = null;
    return undefined;
  }, [gesture, setGesture]);

  const bodyColor = "#E6E8EE";
  const accent = theme.palette.accent;
  const target = useMemo(() => expressionStyle(expression, accent, true), [expression, accent]);
  const targetVisor = useMemo(() => new THREE.Color(target.color), [target.color]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const g = group.current;
    const head_ = head.current;
    const la = leftArmPivot.current;
    const ra = rightArmPivot.current;

    // ----- baseline idle -----
    if (g) {
      g.rotation.y = Math.sin(t * 0.4) * 0.08;
      g.rotation.x = 0;
      g.rotation.z = 0;
      g.scale.setScalar(1);
    }
    if (la) la.rotation.z = 0.2 + Math.sin(t * 1.2) * 0.06;
    if (ra) ra.rotation.z = -0.2 - Math.sin(t * 1.2) * 0.06;
    if (head_) {
      head_.rotation.x = 0;
      head_.rotation.z = 0;
      head_.rotation.y = 0;
    }

    // ----- gesture overlay -----
    if (gesture && born.current !== null) {
      const dur = GESTURE_DURATION_MS[gesture];
      const age = (performance.now() - born.current) / dur; // 0..1
      const p = Math.min(1, Math.max(0, age));
      // Ease in/out for the "bell curve" shape.
      const bell = Math.sin(p * Math.PI);

      if (g && la && ra && head_) {
        switch (gesture) {
          case "wave":
            la.rotation.z = 0.2 + Math.sin(p * Math.PI * 4) * 0.9 * bell;
            la.rotation.x = -0.6 * bell;
            break;
          case "point":
            ra.rotation.z = -1.3 * bell;
            ra.rotation.x = -0.2 * bell;
            break;
          case "thumbs_up":
            ra.rotation.z = -1.6 * bell;
            break;
          case "head_tilt":
            head_.rotation.z = 0.35 * bell;
            break;
          case "bow":
            g.rotation.x = 0.5 * bell;
            break;
          case "dance":
            g.rotation.y += dt * 3;
            g.position.y += Math.sin(p * Math.PI * 8) * 0.05 * bell;
            break;
          case "flip":
            g.rotation.x = p * Math.PI * 2;
            break;
          case "spin_happy":
            g.rotation.y += dt * 8;
            break;
          case "shy":
            g.scale.setScalar(1 - 0.15 * bell);
            head_.rotation.y = -0.5 * bell;
            break;
        }
      }
    }

    // ----- expression (visor) -----
    if (visorMat.current) {
      const k = 1 - Math.exp(-8 * dt);
      visorMat.current.emissive.lerp(targetVisor, k);
      visorMat.current.emissiveIntensity = THREE.MathUtils.lerp(
        visorMat.current.emissiveIntensity,
        target.intensity,
        k,
      );
    }
  });

  const eyeEmissive = 1.4;

  return (
    <group ref={group} scale={0.9}>
      {/* Body */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <capsuleGeometry args={[0.28, 0.4, 6, 12]} />
        <meshStandardMaterial color={bodyColor} roughness={0.4} metalness={0.3} />
      </mesh>

      {/* Head pivot group — rotates independently for head_tilt/shy */}
      <group ref={head} position={[0, 1.0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.55, 0.45, 0.5]} />
          <meshStandardMaterial color={bodyColor} roughness={0.35} metalness={0.35} />
        </mesh>

        {/* Eye visor strip (emissive — expression drives colour) */}
        <mesh position={[0, 0.02, 0.251]}>
          <planeGeometry args={[0.42, 0.14]} />
          <meshStandardMaterial
            ref={visorMat}
            color={accent}
            emissive={accent}
            emissiveIntensity={eyeEmissive}
            roughness={0.2}
            metalness={0.1}
          />
        </mesh>

        {/* Antenna */}
        <mesh position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.22, 8]} />
          <meshStandardMaterial color="#8A8D96" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={eyeEmissive} />
        </mesh>
      </group>

      {/* Arms (pivot groups for gesture overlays) */}
      <group ref={leftArmPivot} position={[-0.35, 0.65, 0]}>
        <mesh position={[-0.08, -0.15, 0]} castShadow>
          <capsuleGeometry args={[0.07, 0.26, 4, 8]} />
          <meshStandardMaterial color={bodyColor} metalness={0.3} roughness={0.5} />
        </mesh>
      </group>
      <group ref={rightArmPivot} position={[0.35, 0.65, 0]}>
        <mesh position={[0.08, -0.15, 0]} castShadow>
          <capsuleGeometry args={[0.07, 0.26, 4, 8]} />
          <meshStandardMaterial color={bodyColor} metalness={0.3} roughness={0.5} />
        </mesh>
      </group>

      {/* Feet / hover pad */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.32, 0.38, 0.12, 16]} />
        <meshStandardMaterial color="#8A8D96" metalness={0.5} roughness={0.4} />
      </mesh>

      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.35, 0.5, 24]} />
        <meshBasicMaterial color={accent} transparent opacity={0.4} />
      </mesh>
    </group>
  );
}
