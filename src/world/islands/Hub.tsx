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
      {/* Rubber duck — dev-culture easter egg next to the mascot. */}
      <GlbProp
        url="/models/props/duck.glb"
        position={[1.2, 0.3, 1.1]}
        scale={0.006}
        rotation={[0, -0.6, 0]}
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
