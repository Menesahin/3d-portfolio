import { CameraControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useDebugMode } from "@/hooks/useDebugMode";
import { useIsMobile } from "@/hooks/useIsMobile";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useStore } from "@/stores";
import type { ZoneId } from "./zones";

/**
 * Camera rig for the wall-staged showcase.
 *
 * SHOTS are absolute world-space framings. The mascot walks to wall-side
 * stations on its own; the camera dollies to an over-shoulder angle that
 * frames both the mascot and the lit wall.
 *
 * `world.activeContent` mirrors into `world.cameraTarget` so a chat
 * tool fire that opens a hologram also reframes the camera; an explicit
 * setCameraTarget (e.g. "overview") wins until activeContent changes.
 *
 * Mobile uses its own portrait shot table plus a wider lens (45° → 65°),
 * keeping destination panels centred without exposing the desktop ceiling
 * assembly or relying on a single distance multiplier for every wall.
 */
type Offset = { pos: [number, number, number]; target: [number, number, number] };

const SHOTS: Record<ZoneId | "overview" | "hub", Offset> = {
  // Default — wide enough to see all three walls + mascot.
  hub: { pos: [0, 4.6, 9.5], target: [0, 1.8, 0] },
  // Wider establishing shot.
  overview: { pos: [0, 6.0, 11.5], target: [0, 2.0, 0] },
  // Over-shoulder → back wall (Projects).
  gallery: { pos: [0, 4.4, 3.0], target: [0, 3.5, -9] },
  projects: { pos: [0, 4.4, 3.0], target: [0, 3.5, -9] },
  // Over-shoulder → left wall (Experience).
  experience: { pos: [3.0, 4.4, 0], target: [-9, 3.5, 0] },
  // Over-shoulder → right wall (Skills).
  skills: { pos: [-3.0, 4.4, 0], target: [9, 3.5, 0] },
  // Two-shot for contact: mascot at hub, panel beside its right shoulder.
  // Camera pulled back to match the wall-shot distance (~7u) so the
  // mascot doesn't dominate the frame; aim point sits between the two
  // subjects so both are framed.
  contact: { pos: [-1.2, 3.2, 7.5], target: [1.0, 1.6, 1.5] },
};

// Portrait shots are authored independently instead of multiplying every
// desktop camera distance by one global value. Destination cameras sit lower
// and aim at the exhibit centre; Projects is pulled far enough back for all
// four cards to fit within the phone's narrow horizontal field of view.
const MOBILE_SHOTS: Record<ZoneId | "overview" | "hub", Offset> = {
  hub: { pos: [0, 5.7, 13.3], target: [0, 1.8, 0] },
  overview: { pos: [0, 7.6, 16.1], target: [0, 2.0, 0] },
  gallery: { pos: [0, 3.9, 9.3], target: [0, 4.3, -9] },
  projects: { pos: [0, 3.9, 9.3], target: [0, 4.3, -9] },
  experience: { pos: [8.6, 3.9, 0], target: [-9, 4.3, 0] },
  skills: { pos: [-8.6, 3.9, 0], target: [9, 4.3, 0] },
  contact: { pos: [-2.1, 3.8, 9.9], target: [1.0, 1.6, 1.5] },
};

const ZOOM_FACTORS = {
  close: 0.85,
  medium: 1.0,
  wide: 1.2,
} as const;

const FOV_DESKTOP = 45;
// 65° vertical FOV gives roughly 33° horizontal FOV at iPhone portrait
// aspect. Combined with the 18.3u Projects shot, that fits the ~10.5u
// four-card wall; 55° clipped Vocabuddy and The Cup XI at the edges.
const FOV_MOBILE = 65;

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
    const desired = isMobile ? FOV_MOBILE : FOV_DESKTOP;
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

    const shots = isMobile ? MOBILE_SHOTS : SHOTS;
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
