import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import * as THREE from "three";
import { useHover } from "@/hooks/useHover";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useStore } from "@/stores";
import { ZONES } from "@/world/zones";
import { Emote } from "./Emote";
import { GlbMascot } from "./GlbMascot";
import { mascotConfig } from "./MascotConfig";
import { ProceduralMascot } from "./ProceduralMascot";

/**
 * The mascot: positions itself at the current zone (or lerps to target),
 * hovers gently, and hosts the floating emote. Rendering is delegated to
 * ProceduralMascot (default) or GlbMascot (when a .glb is configured).
 */
export function Mascot() {
  const group = useRef<THREE.Group>(null);
  const target = useRef(new THREE.Vector3());
  const reduceMotion = usePrefersReducedMotion();

  const currentZone = useStore((s) => s.mascot.currentZone);
  const targetZone = useStore((s) => s.mascot.targetZone);
  const arriveAtZone = useStore((s) => s.arriveAtZone);
  const hover = useHover();

  const handleMascotClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const apply = useStore.getState().applyUiEvent;
    apply({ kind: "mascot.gesture", gesture: "wave" });
    apply({ kind: "mascot.emote", icon: "sparkle" });
  };

  useFrame((state, dt) => {
    if (!group.current) return;

    const desiredZoneId = targetZone ?? currentZone;
    const [zx, zy, zz] = ZONES[desiredZoneId].position;
    // Mascot stands on the island plus the hoverOffset + breath bob
    const bob = Math.sin(state.clock.elapsedTime * 1.3) * 0.05;
    target.current.set(zx, zy + mascotConfig.hoverOffset + bob, zz);

    const pos = group.current.position;
    if (reduceMotion) {
      pos.copy(target.current);
    } else {
      const k = 1 - Math.exp(-4 * dt);
      pos.lerp(target.current, k);
    }

    // If we were moving and got close enough, settle
    if (targetZone !== null) {
      const [tx, _ty, tz] = ZONES[targetZone].position;
      void _ty;
      const dx = pos.x - tx;
      const dz = pos.z - tz;
      const distSq = dx * dx + dz * dz;
      if (distSq < 0.04) arriveAtZone();
    }

    // Face forward (toward world center), subtle yaw
    group.current.rotation.y = Math.atan2(-pos.x, -pos.z + 2);
  });

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
