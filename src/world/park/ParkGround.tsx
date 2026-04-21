import { Instance, Instances } from "@react-three/drei";
import { useMemo } from "react";
import { useActiveTheme } from "@/hooks/useActiveTheme";
import { GlbProp } from "../props/GlbProp";
import { ZONES, type ZoneId } from "../zones";

/**
 * Park ground: one large grass disc (shadow catcher) + wide instanced
 * stone paths connecting every zone to the hub + a low hedge ring
 * around every zone footprint so the silhouettes read as "this is a
 * booth" instead of "prop orphan on a lawn".
 *
 * Paths are now three tiles wide (instead of one) so they show up at
 * overview distance and actually guide the eye between zones.
 */

const PATH_TILE = 1; // world units per path tile (Kenney tiles are 1×1)
const PATH_WIDTH = 3; // number of tiles perpendicular to the direction of travel
const HEDGE_COUNT = 14; // bushes around each zone circumference
const ZONE_FOOTPRINT_RADIUS = 4.4; // hedge ring radius

function tilesAlong(
  from: readonly [number, number],
  to: readonly [number, number],
): Array<[number, number]> {
  const [fx, fz] = from;
  const [tx, tz] = to;
  const dx = tx - fx;
  const dz = tz - fz;
  const length = Math.hypot(dx, dz);
  const steps = Math.max(1, Math.round(length / PATH_TILE));
  const ux = dx / steps;
  const uz = dz / steps;
  // Perpendicular unit vector for the widening offset.
  const px = -uz / Math.hypot(ux, uz);
  const pz = ux / Math.hypot(ux, uz);

  const tiles: Array<[number, number]> = [];
  for (let i = 0; i <= steps; i++) {
    const cx = fx + ux * i;
    const cz = fz + uz * i;
    // Stamp PATH_WIDTH tiles perpendicular to the travel direction.
    const half = (PATH_WIDTH - 1) / 2;
    for (let w = -half; w <= half; w++) {
      tiles.push([cx + px * w, cz + pz * w]);
    }
  }
  return tiles;
}

export function ParkGround() {
  const theme = useActiveTheme();

  const pathTiles = useMemo(() => {
    const tiles: Array<[number, number]> = [];
    const hub = ZONES.hub.position;
    (Object.keys(ZONES) as ZoneId[]).forEach((id) => {
      if (id === "hub") return;
      const p = ZONES[id].position;
      tiles.push(...tilesAlong([hub[0], hub[2]], [p[0], p[2]]));
    });
    return tiles;
  }, []);

  // Hedge ring around every zone so the booth footprint is obvious.
  const hedgePositions = useMemo(() => {
    const result: Array<{ x: number; z: number }> = [];
    (Object.keys(ZONES) as ZoneId[]).forEach((id) => {
      const [zx, _zy, zz] = ZONES[id].position;
      // Skip the hub hedge — the gate already frames it.
      if (id === "hub") return;
      for (let i = 0; i < HEDGE_COUNT; i++) {
        const theta = (i / HEDGE_COUNT) * Math.PI * 2;
        // Leave a ~70° opening toward the hub so the path can enter.
        const toHubAngle = Math.atan2(-zz, -zx);
        const delta = Math.atan2(Math.sin(theta - toHubAngle), Math.cos(theta - toHubAngle));
        if (Math.abs(delta) < Math.PI * 0.2) continue;
        result.push({
          x: zx + Math.cos(theta) * ZONE_FOOTPRINT_RADIUS,
          z: zz + Math.sin(theta) * ZONE_FOOTPRINT_RADIUS,
        });
      }
    });
    return result;
  }, []);

  return (
    <group>
      {/* Large flat grass plane — shadow catcher + base colour */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[50, 64]} />
        <meshStandardMaterial
          color={theme.id === "cyber" ? "#1a1f2e" : "#A9C89F"}
          roughness={0.95}
          metalness={0}
          flatShading
        />
      </mesh>

      {/* Stone-path tiles — 3 wide per segment, connecting every zone to hub. */}
      <Instances limit={900} castShadow receiveShadow>
        <boxGeometry args={[PATH_TILE, 0.08, PATH_TILE]} />
        <meshStandardMaterial
          color={theme.id === "cyber" ? "#2a3142" : "#cbbfa8"}
          roughness={0.9}
          metalness={0}
          flatShading
        />
        {pathTiles.map(([x, z]) => (
          <Instance key={`${x.toFixed(2)}:${z.toFixed(2)}`} position={[x, 0.02, z]} />
        ))}
      </Instances>

      {/* Hedge ring around every zone — uses a tightly repeated Kenney bush. */}
      {hedgePositions.map(({ x, z }) => (
        <GlbProp
          key={`hedge-${x.toFixed(2)}-${z.toFixed(2)}`}
          url="/models/props/kenney/plant_bushLarge.glb"
          position={[x, 0, z]}
          scale={1.2}
        />
      ))}

      {/* Outer scatter — trees around the park perimeter only, not between zones. */}
      <GlbProp url="/models/props/kenney/tree_oak.glb" position={[-22, 0, -6]} scale={1.8} />
      <GlbProp url="/models/props/kenney/tree_fat.glb" position={[22, 0, -6]} scale={1.6} />
      <GlbProp url="/models/props/kenney/tree_oak.glb" position={[-22, 0, 8]} scale={1.6} />
      <GlbProp url="/models/props/kenney/tree_fat.glb" position={[22, 0, 8]} scale={1.8} />
      <GlbProp url="/models/props/kenney/tree_oak.glb" position={[0, 0, 18]} scale={1.5} />
      <GlbProp url="/models/props/kenney/tree_fat.glb" position={[0, 0, -18]} scale={1.5} />
      <GlbProp url="/models/props/kenney/rocks-large.glb" position={[-28, 0, 0]} scale={1.6} />
      <GlbProp url="/models/props/kenney/rocks-small.glb" position={[28, 0, 2]} scale={1.5} />
    </group>
  );
}
