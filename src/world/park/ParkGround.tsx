import { Instance, Instances } from "@react-three/drei";
import { useMemo } from "react";
import { useActiveTheme } from "@/hooks/useActiveTheme";
import { GlbProp } from "../props/GlbProp";
import { ZONES, type ZoneId } from "../zones";

/**
 * The park ground — a single large grass plane (shadow catcher) plus
 * instanced stone path tiles connecting every zone to the hub. Uses
 * Kenney Nature Kit ground tiles; path is a grid-aligned set of
 * `ground_pathOpen.glb` tiles stamped along each zone→hub line.
 *
 * (The ground plane itself is one large mesh with a flat green material.
 * We keep it instead of tiling 400 Kenney grass tiles — net visual is
 * identical, but a single plane saves ~400 draw calls.)
 */

const PATH_TILE_SIZE = 1; // Kenney nature ground tiles are ~1 unit square

function tilesOnLine(
  from: readonly [number, number],
  to: readonly [number, number],
): Array<[number, number]> {
  const [fx, fz] = from;
  const [tx, tz] = to;
  const dx = tx - fx;
  const dz = tz - fz;
  const distance = Math.hypot(dx, dz);
  const count = Math.max(1, Math.round(distance / PATH_TILE_SIZE));
  const ux = dx / count;
  const uz = dz / count;
  return Array.from({ length: count + 1 }, (_, i) => [fx + ux * i, fz + uz * i]);
}

export function ParkGround() {
  const theme = useActiveTheme();

  // Build a list of path tile positions — one path per zone to hub.
  const pathTiles = useMemo(() => {
    const tiles: Array<[number, number]> = [];
    const hub = ZONES.hub.position;
    (Object.keys(ZONES) as ZoneId[]).forEach((id) => {
      if (id === "hub") return;
      const pos = ZONES[id].position;
      tiles.push(...tilesOnLine([hub[0], hub[2]], [pos[0], pos[2]]));
    });
    return tiles;
  }, []);

  return (
    <group>
      {/* Large flat grass plane — shadow catcher + base colour */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[60, 64]} />
        <meshStandardMaterial
          color={theme.id === "cyber" ? "#1a1f2e" : "#A9C89F"}
          roughness={0.95}
          metalness={0}
          flatShading
        />
      </mesh>

      {/* Stone-path tiles connecting every zone to the hub */}
      <Instances limit={600} castShadow receiveShadow>
        <boxGeometry args={[PATH_TILE_SIZE, 0.06, PATH_TILE_SIZE]} />
        <meshStandardMaterial
          color={theme.id === "cyber" ? "#2a3142" : "#cbbfa8"}
          roughness={0.9}
          metalness={0}
          flatShading
        />
        {pathTiles.map(([x, z]) => (
          <Instance key={`${x}:${z}`} position={[x, 0.015, z]} />
        ))}
      </Instances>

      {/* A few scatter props around the park — breaks up empty grass. */}
      <GlbProp url="/models/props/kenney/tree_oak.glb" position={[-22, 0, -2]} scale={1.6} />
      <GlbProp url="/models/props/kenney/tree_fat.glb" position={[22, 0, 0]} scale={1.4} />
      <GlbProp url="/models/props/kenney/tree_oak.glb" position={[-6, 0, 18]} scale={1.2} />
      <GlbProp url="/models/props/kenney/tree_fat.glb" position={[10, 0, 18]} scale={1.5} />
      <GlbProp url="/models/props/kenney/tree_oak.glb" position={[-18, 0, 14]} scale={1.3} />
      <GlbProp url="/models/props/kenney/tree_fat.glb" position={[20, 0, -16]} scale={1.4} />
      <GlbProp url="/models/props/kenney/rocks-large.glb" position={[-24, 0, 6]} scale={1.2} />
      <GlbProp url="/models/props/kenney/rocks-small.glb" position={[24, 0, -4]} scale={1.1} />
      <GlbProp url="/models/props/kenney/plant_bushLarge.glb" position={[-8, 0, -15]} scale={1.0} />
      <GlbProp url="/models/props/kenney/plant_bushLarge.glb" position={[8, 0, 15]} scale={1.0} />
      <GlbProp
        url="/models/props/kenney/mushroom_tanGroup.glb"
        position={[-4, 0, -12]}
        scale={1.0}
      />
    </group>
  );
}
