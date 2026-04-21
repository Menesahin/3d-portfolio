import { Text } from "@react-three/drei";
import { useActiveTheme } from "@/hooks/useActiveTheme";
import { useT } from "@/hooks/useT";
import { Island } from "../Island";
import { GlbProp } from "../props/GlbProp";
import { IslandDecor } from "../props/IslandDecor";
import { HubArch } from "../props/ZoneStaging";
import { ZONES } from "../zones";

export function Hub() {
  const theme = useActiveTheme();
  const t = useT();
  return (
    <Island id="hub" position={ZONES.hub.position} radius={2.8}>
      <HubArch />
      <IslandDecor variant="crystals" position={[1.9, 0.25, 0.9]} scale={1.1} />
      <IslandDecor variant="crystals" position={[-1.95, 0.25, -0.6]} scale={0.85} />
      {/* Space-explorer companion — Kenney astronaut standing beside the mascot. */}
      <GlbProp
        url="/models/props/kenney/astronautA.glb"
        position={[1.4, 0.25, 1.2]}
        scale={0.55}
        rotation={[0, -0.8, 0]}
      />
      {/* Small Kenney CC0 flora for warmth. */}
      <GlbProp
        url="/models/props/kenney/mushroom_red.glb"
        position={[-1.4, 0.25, 1.5]}
        scale={0.65}
      />
      <GlbProp
        url="/models/props/kenney/flower_redA.glb"
        position={[-0.6, 0.25, 2.1]}
        scale={0.7}
      />
      <GlbProp
        url="/models/props/kenney/flower_yellowA.glb"
        position={[0.5, 0.25, 2.05]}
        scale={0.7}
      />
      {/* Name + role raised above the mascot head. */}
      <Text
        position={[0, 3.2, 0]}
        fontSize={0.38}
        color={theme.palette.ink}
        anchorX="center"
        anchorY="middle"
        maxWidth={6}
      >
        {t.meta.name}
      </Text>
      <Text
        position={[0, 2.82, 0]}
        fontSize={0.18}
        color={theme.palette.ink}
        anchorX="center"
        anchorY="middle"
        fillOpacity={0.65}
      >
        {t.meta.role} · {t.meta.location}
      </Text>
    </Island>
  );
}
