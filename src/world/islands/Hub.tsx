import { Text } from "@react-three/drei";
import { useActiveTheme } from "@/hooks/useActiveTheme";
import { useT } from "@/hooks/useT";
import { Island } from "../Island";
import { IslandDecor } from "../props/IslandDecor";
import { ZONES } from "../zones";

export function Hub() {
  const theme = useActiveTheme();
  const t = useT();
  return (
    <Island id="hub" position={ZONES.hub.position} radius={2.8}>
      <IslandDecor variant="crystals" position={[1.8, 0.25, 0.5]} scale={1.1} />
      <IslandDecor variant="crystals" position={[-1.9, 0.25, -0.6]} scale={0.85} />
      {/* Raised well above the mascot (head reaches ~y=1.6) */}
      <Text
        position={[0, 2.9, 0]}
        fontSize={0.36}
        color={theme.palette.ink}
        anchorX="center"
        anchorY="middle"
        maxWidth={6}
      >
        {t.meta.name}
      </Text>
      <Text
        position={[0, 2.5, 0]}
        fontSize={0.18}
        color={theme.palette.ink}
        anchorX="center"
        anchorY="middle"
        fillOpacity={0.6}
      >
        {t.meta.role} · {t.meta.location}
      </Text>
    </Island>
  );
}
