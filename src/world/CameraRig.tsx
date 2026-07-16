import { CameraControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useDebugMode } from "@/hooks/useDebugMode";
import { useIsMobile } from "@/hooks/useIsMobile";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useStore } from "@/stores";
import { COCKPIT_V7_MOBILE_SHOTS, COCKPIT_V7_SHOTS } from "./cockpit/v7/layout";

/**
 * Camera rig for the KEX-07 cockpit.
 *
 * Shots are absolute world-space framings exported from the V7 manifest.
 *
 * `world.activeContent` mirrors into `world.cameraTarget` so a chat
 * tool fire that opens a hologram also reframes the camera; an explicit
 * setCameraTarget (e.g. "overview") wins until activeContent changes.
 *
 * Mobile uses its own portrait shot table plus a wider 72° lens,
 * keeping destination panels centred without exposing the desktop ceiling
 * assembly or relying on a single distance multiplier for every wall.
 */
const ZOOM_FACTORS = {
  close: 0.85,
  medium: 1.0,
  wide: 1.2,
} as const;

const FOV_COCKPIT_DESKTOP = 56;
const FOV_COCKPIT_MOBILE = 72;

export function CameraRig() {
  const controlsRef = useRef<CameraControls>(null);
  const reduceMotion = usePrefersReducedMotion();
  const debug = useDebugMode();
  const isMobile = useIsMobile();
  const camera = useThree((s) => s.camera);

  const target = useStore((s) => s.world.cameraTarget);
  const zoom = useStore((s) => s.world.cameraZoom);
  const activeContent = useStore((s) => s.world.activeContent);
  const setCameraTarget = useStore((s) => s.setCameraTarget);

  // Mobile FOV bump. Mutates the active perspective camera and refreshes
  // its projection matrix; cheap to do on every isMobile flip (rotation,
  // window-resize-induced query change, etc.).
  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const desired = isMobile ? FOV_COCKPIT_MOBILE : FOV_COCKPIT_DESKTOP;
    if (camera.fov === desired) return;
    camera.fov = desired;
    camera.updateProjectionMatrix();
  }, [isMobile, camera]);

  // Mirror activeContent.kind → cameraTarget so opening a hologram (via
  // chat tool, debug panel, click) automatically reframes the camera.
  // When activeContent goes null we DON'T override — that lets dismiss
  // handlers (panel hit-plane → hub; empty-canvas click → overview) own
  // the post-dismiss target without fighting this effect.
  useEffect(() => {
    const k = activeContent?.kind;
    if (!k) return;
    if (k === "project") setCameraTarget("projects");
    else if (k === "experience") setCameraTarget("experience");
    else if (k === "skill_group") setCameraTarget("skills");
    else if (k === "contact_card") setCameraTarget("contact");
  }, [activeContent, setCameraTarget]);

  useEffect(() => {
    const cc = controlsRef.current;
    if (!cc) return;

    const shots = isMobile ? COCKPIT_V7_MOBILE_SHOTS : COCKPIT_V7_SHOTS;
    const shot = shots[target] ?? shots.hub;
    const factor = ZOOM_FACTORS[zoom];

    // Zoom factor scales the camera-to-target distance, not the absolute
    // position. Compute in target-relative space, then re-anchor.
    const tx = shot.target[0];
    const ty = shot.target[1];
    const tz = shot.target[2];
    const dx = (shot.pos[0] - tx) * factor;
    const dy = (shot.pos[1] - ty) * factor;
    const dz = (shot.pos[2] - tz) * factor;

    cc.smoothTime = reduceMotion ? 0 : 0.85;
    void cc.setLookAt(tx + dx, ty + dy, tz + dz, tx, ty, tz, !reduceMotion);
  }, [target, zoom, reduceMotion, isMobile]);

  // Debug helper: press `c` to copy current camera pos + target as a
  // ready-to-paste SHOTS entry. Only wired while `?debug=1`.
  useEffect(() => {
    if (!debug) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "c" || e.metaKey || e.ctrlKey || e.altKey) return;
      const cc = controlsRef.current;
      if (!cc) return;
      const pos = new THREE.Vector3();
      const tgt = new THREE.Vector3();
      cc.getPosition(pos);
      cc.getTarget(tgt);
      const fmt = (v: THREE.Vector3) => `[${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)}]`;
      const snippet = `{ pos: ${fmt(pos)}, target: ${fmt(tgt)} }`;
      void navigator.clipboard.writeText(snippet).catch(() => undefined);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [debug]);

  // Gentle idle azimuth sway so the scene reads alive at rest.
  const prevOffset = useRef(0);
  useFrame((state) => {
    const cc = controlsRef.current;
    if (!cc || reduceMotion || debug) {
      prevOffset.current = 0;
      return;
    }
    if (cc.active) {
      prevOffset.current = 0;
      return;
    }
    const t = state.clock.elapsedTime;
    const desired = Math.sin(t * 0.2) * 0.02;
    const delta = desired - prevOffset.current;
    prevOffset.current = desired;
    cc.rotate(delta, 0, false);
  });

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      enabled={debug}
      minDistance={2}
      maxDistance={40}
    />
  );
}
