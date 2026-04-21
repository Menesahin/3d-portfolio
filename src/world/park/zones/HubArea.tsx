import { Text } from "@react-three/drei";
import { useActiveTheme } from "@/hooks/useActiveTheme";
import { useT } from "@/hooks/useT";
import { GlbProp } from "../../props/GlbProp";
import { ZONES } from "../../zones";
import { ZoneArea } from "../ZoneArea";

/**
 * Hub — the entrance / welcome spot. A small stone-gate pavilion,
 * benches either side, potted plants, and the central astronaut
 * companion. The robot mascot stands in front of this gate.
 */
export function HubArea() {
  const theme = useActiveTheme();
  const t = useT();
  return (
    <ZoneArea id="hub" title="" position={ZONES.hub.position} radius={4}>
      {/* Welcome gate (castle-kit) — anchors the hub. */}
      <GlbProp url="/models/props/kenney/gate.glb" position={[0, 0, -1.8]} scale={1.6} />

      {/* Two lamps flanking the gate */}
      <GlbProp
        url="/models/props/kenney/lampRoundFloor.glb"
        position={[-1.6, 0, -1.3]}
        scale={1.2}
      />
      <GlbProp
        url="/models/props/kenney/lampRoundFloor.glb"
        position={[1.6, 0, -1.3]}
        scale={1.2}
      />

      {/* Benches either side facing inward */}
      <GlbProp
        url="/models/props/kenney/benchCushion.glb"
        position={[-2.6, 0, 0.4]}
        rotation={[0, Math.PI / 2, 0]}
        scale={1.1}
      />
      <GlbProp
        url="/models/props/kenney/benchCushion.glb"
        position={[2.6, 0, 0.4]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={1.1}
      />

      {/* Potted plants for warmth */}
      <GlbProp url="/models/props/kenney/plantSmall1.glb" position={[-2.2, 0, -1.8]} scale={1.1} />
      <GlbProp url="/models/props/kenney/plantSmall2.glb" position={[2.2, 0, -1.8]} scale={1.1} />

      {/* Astronaut companion next to the mascot (dev culture nod). */}
      <GlbProp
        url="/models/props/kenney/astronautA.glb"
        position={[1.4, 0, 1.2]}
        scale={0.55}
        rotation={[0, -0.9, 0]}
      />

      {/* Identity text above the gate — SDF 3D text, no canvas graphics. */}
      <Text
        position={[0, 3.5, -1.8]}
        fontSize={0.58}
        color={theme.palette.ink}
        anchorX="center"
        anchorY="middle"
        maxWidth={8}
        fillOpacity={0.95}
      >
        {t.meta.name}
      </Text>
      <Text
        position={[0, 3.0, -1.8]}
        fontSize={0.24}
        color={theme.palette.ink}
        anchorX="center"
        anchorY="middle"
        fillOpacity={0.65}
        letterSpacing={0.05}
      >
        {t.meta.role} · {t.meta.location}
      </Text>
    </ZoneArea>
  );
}
