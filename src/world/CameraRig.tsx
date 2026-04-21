import { CameraControls } from "@react-three/drei";
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
 * The camera is fully chat-driven. We read `world.cameraTarget` and
 * `world.cameraZoom` from the store and fly the camera there with
 * a smooth dolly. Under `prefers-reduced-motion`, we snap instead.
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
    // Scale the camera distance vector around the target by `factor`.
    const [tx, ty, tz] = shot.target;
    const [px, py, pz] = shot.pos;
    const dx = (px - tx) * factor;
    const dy = (py - ty) * factor;
    const dz = (pz - tz) * factor;
    cc.smoothTime = reduceMotion ? 0 : 1.2;
    void cc.setLookAt(tx + dx, ty + dy, tz + dz, tx, ty, tz, !reduceMotion);
  }, [target, zoom, reduceMotion]);

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
