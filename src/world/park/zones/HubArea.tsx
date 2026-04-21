import { Text } from "@react-three/drei";
import { useActiveTheme } from "@/hooks/useActiveTheme";
import { useT } from "@/hooks/useT";
import { GlbProp } from "../../props/GlbProp";
import { ZONES } from "../../zones";
import { ZoneArea } from "../ZoneArea";

/**
 * Hub — welcome square. A substantial Kenney gate anchors the north
 * side, flanked by lamps and benches. The mascot stands in front of
 * it. Scale of the gate is bumped so it reads as an entrance arch,
 * not a garden trellis.
 */
export function HubArea() {
  const theme = useActiveTheme();
  const t = useT();
  return (
    <ZoneArea id="hub" title="" position={ZONES.hub.position} radius={4.4}>
      {/* Welcome gate (castle-kit) — scaled up so it reads from overview. */}
      <GlbProp url="/models/props/kenney/gate.glb" position={[0, 0, -2.6]} scale={2.6} />

      {/* Pillars flanking the gate — castle towers frame the entrance. */}
      <GlbProp
        url="/models/props/kenney/tower-square-base.glb"
        position={[-2.6, 0, -2.6]}
        scale={1.3}
      />
      <GlbProp
        url="/models/props/kenney/tower-square-base.glb"
        position={[2.6, 0, -2.6]}
        scale={1.3}
      />

      {/* Lamps directly in front of each pillar */}
      <GlbProp
        url="/models/props/kenney/lampRoundFloor.glb"
        position={[-1.8, 0, -1.2]}
        scale={1.4}
      />
      <GlbProp
        url="/models/props/kenney/lampRoundFloor.glb"
        position={[1.8, 0, -1.2]}
        scale={1.4}
      />

      {/* Benches either side facing inward */}
      <GlbProp
        url="/models/props/kenney/benchCushion.glb"
        position={[-3.2, 0, 1.0]}
        rotation={[0, Math.PI / 2, 0]}
        scale={1.4}
      />
      <GlbProp
        url="/models/props/kenney/benchCushion.glb"
        position={[3.2, 0, 1.0]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={1.4}
      />

      {/* Astronaut companion beside the mascot */}
      <GlbProp
        url="/models/props/kenney/astronautA.glb"
        position={[1.5, 0, 1.4]}
        scale={0.7}
        rotation={[0, -0.9, 0]}
      />

      {/* Potted plants along the gate edges */}
      <GlbProp url="/models/props/kenney/plantSmall1.glb" position={[-2.8, 0, -1.4]} scale={1.3} />
      <GlbProp url="/models/props/kenney/plantSmall2.glb" position={[2.8, 0, -1.4]} scale={1.3} />

      {/* Identity text above the gate */}
      <Text
        position={[0, 4.4, -2.6]}
        fontSize={0.7}
        color={theme.palette.ink}
        anchorX="center"
        anchorY="middle"
        maxWidth={10}
        fillOpacity={0.95}
      >
        {t.meta.name}
      </Text>
      <Text
        position={[0, 3.75, -2.6]}
        fontSize={0.28}
        color={theme.palette.ink}
        anchorX="center"
        anchorY="middle"
        fillOpacity={0.65}
        letterSpacing={0.06}
      >
        {t.meta.role} · {t.meta.location}
      </Text>
    </ZoneArea>
  );
}
