import { useFrame } from "@react-three/fiber";
import { type RefObject, useRef } from "react";
import * as THREE from "three";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useStore } from "@/stores";
import { MASCOT_STATIONS, type MascotStationId } from "@/world/holograms/wallSlots";
import { ZONES, type ZoneId } from "@/world/zones";
import { mascotConfig } from "./MascotConfig";
import { mascotPosRef } from "./mascotPosRef";

const POSITION_RATE = 1.5; // exp time-constant ≈ 0.67 s — reads as deliberate stroll
const YAW_RATE = 1.8; // ~0.55 s — finishes turning slightly before walk settles
const HOVER_SCALE_RATE = 6;
const HOVER_SCALE_TARGET = 1.04;
const ARRIVAL_DIST_SQ = 0.04;

/**
 * Maps a `ZoneId` (LangGraph contract) to a `MascotStationId` (face/pose
 * lookup). `gallery` is the historical alias for the back-wall zone and
 * shares the `projects` station.
 */
function zoneToStation(zone: ZoneId): MascotStationId {
  switch (zone) {
    case "gallery":
    case "projects":
      return "projects";
    case "experience":
      return "experience";
    case "skills":
      return "skills";
    case "contact":
      return "contact";
    default:
      return "hub";
  }
}

/**
 * Per-frame mascot motion: lerp toward the target zone, breathe bob,
 * sway, settle on arrival, lerp yaw toward the station's face target,
 * publish lerped position to `mascotPosRef`, apply hover scale lift.
 *
 * Pulled out of `Mascot.tsx` so the component body stays a coordinator
 * (gesture choreography + click + delegating render) rather than a
 * 50-line useFrame implementing seven concerns.
 */
export function useMascotLocomotion({
  groupRef,
  hovered,
}: {
  groupRef: RefObject<THREE.Group | null>;
  hovered: boolean;
}): void {
  const reduceMotion = usePrefersReducedMotion();
  const targetVec = useRef(new THREE.Vector3());
  const hoverScaleRef = useRef(1);

  const currentZone = useStore((s) => s.mascot.currentZone);
  const targetZone = useStore((s) => s.mascot.targetZone);
  const arriveAtZone = useStore((s) => s.arriveAtZone);

  useFrame((state, dt) => {
    const g = groupRef.current;
    if (!g) return;

    const desiredZoneId = targetZone ?? currentZone;
    const [zx, zy, zz] = ZONES[desiredZoneId].position;

    // Breath bob + lateral sway so idle reads as *alive*, not frozen.
    const t = state.clock.elapsedTime;
    const bob = Math.sin(t * 1.3) * 0.07;
    const sway = Math.sin(t * 0.6) * 0.03;
    targetVec.current.set(zx + sway, zy + mascotConfig.hoverOffset + bob, zz);

    const pos = g.position;
    if (reduceMotion) {
      pos.copy(targetVec.current);
    } else {
      const k = 1 - Math.exp(-POSITION_RATE * dt);
      pos.lerp(targetVec.current, k);
    }
    // Publish lerped pos so MascotHalo / SpeechBubble / Contact can follow
    // without triggering React subscriptions.
    mascotPosRef.current.copy(pos);

    // Arrival detection — settle once close enough to the destination.
    if (targetZone !== null) {
      const [tx, , tz] = ZONES[targetZone].position;
      const dx = pos.x - tx;
      const dz = pos.z - tz;
      if (dx * dx + dz * dz < ARRIVAL_DIST_SQ) arriveAtZone();
    }

    // Yaw lerp — face the station's `faceTarget` in world space.
    const station = MASCOT_STATIONS[zoneToStation(desiredZoneId)];
    const [fx, , fz] = station.faceTarget;
    const desiredYaw = Math.atan2(fx - pos.x, fz - pos.z);
    const currentYaw = g.rotation.y;
    const delta = Math.atan2(Math.sin(desiredYaw - currentYaw), Math.cos(desiredYaw - currentYaw));
    const yawK = reduceMotion ? 1 : 1 - Math.exp(-YAW_RATE * dt);
    g.rotation.y = currentYaw + delta * yawK;

    // Hover affordance — small scale lift while cursor is on the mascot.
    const target = hovered ? HOVER_SCALE_TARGET : 1;
    const scaleK = reduceMotion ? 1 : 1 - Math.exp(-HOVER_SCALE_RATE * dt);
    hoverScaleRef.current += (target - hoverScaleRef.current) * scaleK;
    g.scale.setScalar(hoverScaleRef.current);
  });
}
