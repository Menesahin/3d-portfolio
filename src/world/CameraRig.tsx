import { CameraControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useStore } from "@/stores";
import type { ZoneId } from "./zones";

/**
 * Camera "shots" per target. Positions are world-space. Tuned for the
 * ground-level park layout (no floating islands — the camera no longer
 * needs to sit high above).
 *
 * Park zone anchors (see zones.ts):
 *   hub        (0,  0,  0)
 *   gallery   (-10, 0, -7)
 *   projects  (+10, 0, -7)
 *   experience(-10, 0,  4)
 *   contact   (+10, 0,  4)
 *   skills    (0,   0,  8)
 */
const SHOTS: Record<
  ZoneId | "overview" | "hub",
  {
    pos: [number, number, number];
    target: [number, number, number];
  }
> = {
  overview: { pos: [0, 13, 20], target: [0, 1, 0] },
  hub: { pos: [0, 3, 6], target: [0, 1.5, -1] },
  gallery: { pos: [-10, 3, -1], target: [-10, 1.2, -7] },
  projects: { pos: [10, 3, -1], target: [10, 1.2, -7] },
  experience: { pos: [-10, 3, 10], target: [-10, 1.2, 4] },
  contact: { pos: [10, 3, 10], target: [10, 1.2, 4] },
  skills: { pos: [0, 3.5, 14], target: [0, 1.2, 8] },
};

const ZOOM_FACTORS = {
  close: 0.55,
  medium: 1.0,
  wide: 1.6,
} as const;

/**
 * Camera logic:
 *  - Chat-driven: when `world.cameraTarget` / `world.cameraZoom` change, we
 *    smoothly dolly the camera to the matching shot.
 *  - Reduced-motion: cuts straight to the target (no transition).
 *  - Idle drift: while no transition is active, we apply a very small
 *    azimuth oscillation so the scene feels alive instead of frozen.
 */
export function CameraRig() {
  const controlsRef = useRef<CameraControls>(null);
  const reduceMotion = usePrefersReducedMotion();

  const target = useStore((s) => s.world.cameraTarget);
  const zoom = useStore((s) => s.world.cameraZoom);

  useEffect(() => {
    const cc = controlsRef.current;
    if (!cc) return;
    const shot = SHOTS[target] ?? SHOTS.overview;
    const factor = ZOOM_FACTORS[zoom];
    const [tx, ty, tz] = shot.target;
    const [px, py, pz] = shot.pos;
    const dx = (px - tx) * factor;
    const dy = (py - ty) * factor;
    const dz = (pz - tz) * factor;
    cc.smoothTime = reduceMotion ? 0 : 1.2;
    void cc.setLookAt(tx + dx, ty + dy, tz + dz, tx, ty, tz, !reduceMotion);
  }, [target, zoom, reduceMotion]);

  // Idle drift — tiny azimuth oscillation while the rig isn't transitioning.
  const prevOffset = useRef(0);
  useFrame((state) => {
    const cc = controlsRef.current;
    if (!cc || reduceMotion) {
      prevOffset.current = 0;
      return;
    }
    // `active` is true while a smooth setLookAt transition is mid-flight.
    if (cc.active) {
      prevOffset.current = 0;
      return;
    }
    const t = state.clock.elapsedTime;
    const desired = Math.sin(t * 0.25) * 0.025; // ~1.4° oscillation
    const delta = desired - prevOffset.current;
    prevOffset.current = desired;
    cc.rotate(delta, 0, false);
  });

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      enabled={false}
      minDistance={4}
      maxDistance={40}
    />
  );
}
