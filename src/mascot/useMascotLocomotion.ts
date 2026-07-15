import { useFrame } from "@react-three/fiber";
import { type RefObject, useRef } from "react";
import * as THREE from "three";
import { useIsMobile } from "@/hooks/useIsMobile";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useStore } from "@/stores";
import { COCKPIT_MASCOT_FACE_TARGETS, COCKPIT_MASCOT_POSITIONS } from "@/world/cockpit/layout";
import {
  COCKPIT_V7_MASCOT_FACE_TARGETS,
  COCKPIT_V7_MASCOT_POSITIONS,
} from "@/world/cockpit/v7/layout";
import { MASCOT_STATIONS, type MascotStationId } from "@/world/holograms/wallSlots";
import { isCockpitVariant, type WorldVariant } from "@/world/worldVariant";
import { ZONES, type ZoneId } from "@/world/zones";
import { mascotPosRef } from "./mascotPosRef";

const POSITION_RATE = 1.5; // exp time-constant ≈ 0.67 s — reads as deliberate stroll
const YAW_RATE = 1.8; // ~0.55 s — finishes turning slightly before walk settles
const HOVER_SCALE_RATE = 6;
const HOVER_SCALE_TARGET = 1.04;
const ARRIVAL_DIST_SQ = 0.04;

function cockpitPosition(variant: WorldVariant, zone: ZoneId): readonly [number, number, number] {
  return variant === "cockpit-v7"
    ? COCKPIT_V7_MASCOT_POSITIONS[zone]
    : COCKPIT_MASCOT_POSITIONS[zone];
}

function cockpitFaceTarget(variant: WorldVariant, zone: ZoneId): readonly [number, number, number] {
  return variant === "cockpit-v7"
    ? COCKPIT_V7_MASCOT_FACE_TARGETS[zone]
    : COCKPIT_MASCOT_FACE_TARGETS[zone];
}

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
  hoverOffset,
  variant,
}: {
  groupRef: RefObject<THREE.Group | null>;
  hovered: boolean;
  hoverOffset: number;
  variant: WorldVariant;
}): void {
  const reduceMotion = usePrefersReducedMotion();
  const isMobile = useIsMobile();
  const targetVec = useRef(new THREE.Vector3());
  const hoverScaleRef = useRef(1);
  const travelLiftRef = useRef(0);

  const currentZone = useStore((s) => s.mascot.currentZone);
  const mascotState = useStore((s) => s.mascot.state);
  const targetZone = useStore((s) => s.mascot.targetZone);
  const specialMotion = useStore((s) => s.mascot.specialMotion);
  const pointTarget = useStore((s) => s.mascot.pointTarget);
  const arriveAtZone = useStore((s) => s.arriveAtZone);
  const finishSpecialMotion = useStore((s) => s.finishMascotSpecialMotion);
  const clearMascotPoint = useStore((s) => s.clearMascotPoint);

  useFrame((state, dt) => {
    const g = groupRef.current;
    if (!g) return;

    const desiredZoneId = targetZone ?? currentZone;
    const [zx, zy, zz] = isCockpitVariant(variant)
      ? cockpitPosition(variant, desiredZoneId)
      : ZONES[desiredZoneId].position;

    // Breath bob + lateral sway so idle reads as *alive*, not frozen.
    const t = state.clock.elapsedTime;
    const bob = Math.sin(t * 1.3) * 0.07;
    const sway = Math.sin(t * 0.6) * 0.03;
    const flying = isCockpitVariant(variant) && mascotState === "moving";
    const liftTarget = flying ? (specialMotion ? 0.58 : 0.34) : 0;
    travelLiftRef.current = THREE.MathUtils.damp(
      travelLiftRef.current,
      liftTarget,
      flying ? 4.6 : 3.2,
      dt,
    );
    targetVec.current.set(zx + sway, zy + hoverOffset + bob + travelLiftRef.current, zz);

    if (specialMotion?.kind === "orbit") {
      const orbitPosition = isCockpitVariant(variant)
        ? cockpitPosition(variant, specialMotion.target)
        : ZONES[specialMotion.target].position;
      const duration = specialMotion.revolutions * 2.4;
      const progress = (performance.now() - specialMotion.startedAt) / 1000 / duration;
      if (progress >= 1) {
        finishSpecialMotion();
      } else {
        const angle = progress * specialMotion.revolutions * Math.PI * 2;
        targetVec.current.set(
          orbitPosition[0] + Math.cos(angle) * 1.35,
          orbitPosition[1] + hoverOffset + 0.35 + Math.sin(angle * 2) * 0.14,
          orbitPosition[2] + Math.sin(angle) * 1.35,
        );
      }
    } else if (specialMotion?.kind === "dart") {
      const progress = (performance.now() - specialMotion.startedAt) / 820;
      if (progress >= 1) {
        finishSpecialMotion();
      } else {
        const distance = Math.sin(progress * Math.PI) * 2.2;
        if (specialMotion.direction === "left") targetVec.current.x -= distance;
        else if (specialMotion.direction === "right") targetVec.current.x += distance;
        else if (specialMotion.direction === "up") targetVec.current.y += distance * 0.65;
        else if (specialMotion.direction === "down") targetVec.current.y -= distance * 0.35;
        else targetVec.current.z -= distance;
      }
    }

    const pos = g.position;
    if (reduceMotion) {
      pos.copy(targetVec.current);
    } else {
      const movementRate =
        isCockpitVariant(variant) && mascotState === "moving" ? 1.95 : POSITION_RATE;
      const k = 1 - Math.exp(-movementRate * dt);
      pos.lerp(targetVec.current, k);
    }
    // Publish lerped pos so MascotHalo / SpeechBubble / Contact can follow
    // without triggering React subscriptions.
    mascotPosRef.current.copy(pos);

    // Arrival detection — settle once close enough to the destination.
    if (targetZone !== null) {
      const [tx, , tz] = isCockpitVariant(variant)
        ? cockpitPosition(variant, targetZone)
        : ZONES[targetZone].position;
      const dx = pos.x - tx;
      const dz = pos.z - tz;
      if (dx * dx + dz * dz < ARRIVAL_DIST_SQ) arriveAtZone();
    }

    // Yaw lerp — face the station's `faceTarget` in world space.
    const station = MASCOT_STATIONS[zoneToStation(desiredZoneId)];
    let [fx, , fz] = isCockpitVariant(variant)
      ? cockpitFaceTarget(variant, desiredZoneId)
      : station.faceTarget;
    if (pointTarget) {
      if (performance.now() - pointTarget.startedAt > 1600) {
        clearMascotPoint();
      } else if (pointTarget.target === "user") {
        [fx, fz] = [0, 10];
      } else {
        const pointPosition = isCockpitVariant(variant)
          ? cockpitPosition(variant, pointTarget.target)
          : ZONES[pointTarget.target].position;
        [fx, fz] = [pointPosition[0], pointPosition[2]];
      }
    }
    const desiredYaw = Math.atan2(fx - pos.x, fz - pos.z);
    const currentYaw = g.rotation.y;
    const delta = Math.atan2(Math.sin(desiredYaw - currentYaw), Math.cos(desiredYaw - currentYaw));
    const yawK = reduceMotion ? 1 : 1 - Math.exp(-YAW_RATE * dt);
    g.rotation.y = currentYaw + delta * yawK;

    // Hover affordance — small scale lift while cursor is on the mascot.
    const stationScale =
      variant === "cockpit-v7"
        ? isMobile
          ? desiredZoneId === "experience" || desiredZoneId === "skills"
            ? 0.64
            : desiredZoneId === "projects" || desiredZoneId === "gallery"
              ? 0.72
              : desiredZoneId === "contact"
                ? 0.52
                : 0.78
          : desiredZoneId === "experience" || desiredZoneId === "skills"
            ? 0.58
            : desiredZoneId === "projects" || desiredZoneId === "gallery"
              ? 0.84
              : desiredZoneId === "contact"
                ? 0.55
                : 1
        : 1;
    const target = (hovered ? HOVER_SCALE_TARGET : 1) * stationScale;
    const scaleK = reduceMotion ? 1 : 1 - Math.exp(-HOVER_SCALE_RATE * dt);
    hoverScaleRef.current += (target - hoverScaleRef.current) * scaleK;
    g.scale.setScalar(hoverScaleRef.current);
  });
}
