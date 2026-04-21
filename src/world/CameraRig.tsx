import { CameraControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useStore } from "@/stores";
import type { ZoneId } from "./zones";

/** Camera "shots" per target. Positions are world-space. */
const SHOTS: Record<
  ZoneId | "overview" | "hub",
  {
    pos: [number, number, number];
    target: [number, number, number];
  }
> = {
  overview: { pos: [0, 12, 22], target: [0, 0, -2] },
  hub: { pos: [0, 4, 8], target: [0, 0.5, 0] },
  experience: { pos: [-12, 4, 2], target: [-8, 0.5, -4] },
  projects: { pos: [12, 4, 2], target: [8, 0.5, -4] },
  skills: { pos: [0, 6, -4], target: [0, 1.5, -10] },
  gallery: { pos: [-12, 3, 12], target: [-8, 0.5, 6] },
  contact: { pos: [12, 3, 12], target: [8, 0.5, 6] },
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
