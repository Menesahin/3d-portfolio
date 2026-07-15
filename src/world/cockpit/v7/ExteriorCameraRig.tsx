import { CameraControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useDebugMode } from "@/hooks/useDebugMode";
import { useIsMobile } from "@/hooks/useIsMobile";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useStore } from "@/stores";

type ExteriorShot = {
  position: readonly [number, number, number];
  target: readonly [number, number, number];
  fov: number;
};

/** Rear-quarter orbital composition: the full vessel and physical Earth fit in one frame. */
export const EXTERIOR_SHOTS: Record<"desktop" | "mobile", ExteriorShot> = {
  desktop: {
    position: [72, 42, 148],
    target: [0, 8, -72],
    fov: 49,
  },
  mobile: {
    position: [84, 58, 190],
    target: [0, 7, -78],
    fov: 62,
  },
};

const ZOOM_FACTORS = {
  close: 0.86,
  medium: 1,
  wide: 1.16,
} as const;

export function ExteriorCameraRig() {
  const controlsRef = useRef<CameraControls>(null);
  const camera = useThree((state) => state.camera);
  const isMobile = useIsMobile();
  const debug = useDebugMode();
  const reduceMotion = usePrefersReducedMotion();
  const zoom = useStore((state) => state.world.cameraZoom);
  const previousOrbit = useRef(0);

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const previous = { fov: camera.fov, near: camera.near, far: camera.far };
    const shot = isMobile ? EXTERIOR_SHOTS.mobile : EXTERIOR_SHOTS.desktop;
    camera.fov = shot.fov;
    camera.near = 0.3;
    camera.far = 900;
    camera.updateProjectionMatrix();
    return () => {
      camera.fov = previous.fov;
      camera.near = previous.near;
      camera.far = previous.far;
      camera.updateProjectionMatrix();
    };
  }, [camera, isMobile]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const shot = isMobile ? EXTERIOR_SHOTS.mobile : EXTERIOR_SHOTS.desktop;
    const factor = ZOOM_FACTORS[zoom];
    const [tx, ty, tz] = shot.target;
    const [px, py, pz] = shot.position;
    controls.smoothTime = reduceMotion ? 0 : 0.9;
    void controls.setLookAt(
      tx + (px - tx) * factor,
      ty + (py - ty) * factor,
      tz + (pz - tz) * factor,
      tx,
      ty,
      tz,
      !reduceMotion,
    );
  }, [isMobile, reduceMotion, zoom]);

  useFrame((state) => {
    const controls = controlsRef.current;
    if (!controls || reduceMotion || debug || controls.active) {
      previousOrbit.current = 0;
      return;
    }
    const desired = Math.sin(state.clock.elapsedTime * 0.11) * 0.035;
    controls.rotate(desired - previousOrbit.current, 0, false);
    previousOrbit.current = desired;
  });

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      enabled={debug}
      minDistance={65}
      maxDistance={620}
    />
  );
}
