import type { ThreeEvent } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import type * as THREE from "three";
import { useHover } from "@/hooks/useHover";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useStore } from "@/stores";
import { Emote } from "./Emote";
import { GlbMascot } from "./GlbMascot";
import { mascotConfig } from "./MascotConfig";
import { ProceduralMascot } from "./ProceduralMascot";
import { useMascotLocomotion } from "./useMascotLocomotion";

// Hover-driven gesture choreography. Click stays the big "hi" (wave +
// sparkle); hover layers two smaller beats:
//   1. Hover-enter, debounced 250 ms → nod (point → "Yes" clip)
//   2. Sustained hover ~1.5 s     → thumbs-up
// Cooldown gates the whole sequence so swiping the cursor across the
// mascot doesn't spam animations.
const HOVER_NOD_DELAY_MS = 250;
const HOVER_THUMBS_DELAY_MS = 1500;
const HOVER_COOLDOWN_MS = 4000;

/**
 * The mascot: positions itself at the current zone (or lerps to target),
 * hovers gently, and hosts the floating emote. Locomotion (lerp +
 * arrival + yaw + hover-scale + posRef publish) lives in a dedicated
 * `useMascotLocomotion` hook so this component stays a coordinator
 * (gesture choreography + click + delegating render).
 */
export function Mascot() {
  const group = useRef<THREE.Group>(null);
  const reduceMotion = usePrefersReducedMotion();
  const hover = useHover();
  const lastHoverGestureAt = useRef(0);

  useMascotLocomotion({ groupRef: group, hovered: hover.hovered });

  const handleMascotClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const apply = useStore.getState().applyUiEvent;
    apply({ kind: "mascot.gesture", gesture: "wave" });
    apply({ kind: "mascot.emote", icon: "sparkle" });
    // The wave consumes the cooldown so a hover-in right after won't
    // also try to fire a nod.
    lastHoverGestureAt.current = performance.now();
  };

  // Hover gestures — debounced so a quick mouseover doesn't trigger,
  // and gated by a cooldown so we don't spam.
  useEffect(() => {
    if (!hover.hovered || reduceMotion) return;
    const apply = useStore.getState().applyUiEvent;
    const now = performance.now();
    if (now - lastHoverGestureAt.current < HOVER_COOLDOWN_MS) return;

    const nodId = window.setTimeout(() => {
      apply({ kind: "mascot.gesture", gesture: "point" });
      lastHoverGestureAt.current = performance.now();
    }, HOVER_NOD_DELAY_MS);

    const thumbsId = window.setTimeout(() => {
      apply({ kind: "mascot.gesture", gesture: "thumbs_up" });
      lastHoverGestureAt.current = performance.now();
    }, HOVER_THUMBS_DELAY_MS);

    return () => {
      window.clearTimeout(nodId);
      window.clearTimeout(thumbsId);
    };
  }, [hover.hovered, reduceMotion]);

  return (
    <group
      ref={group}
      onClick={handleMascotClick}
      onPointerOver={hover.onPointerOver}
      onPointerOut={hover.onPointerOut}
    >
      {mascotConfig.assetUrl ? (
        <Suspense fallback={<ProceduralMascot />}>
          <GlbMascot config={{ ...mascotConfig, assetUrl: mascotConfig.assetUrl }} />
        </Suspense>
      ) : (
        <ProceduralMascot />
      )}
      <Emote anchor={mascotConfig.emoteAnchor} />
    </group>
  );
}
