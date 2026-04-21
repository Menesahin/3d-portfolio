import { Text } from "@react-three/drei";
import { useActiveTheme } from "@/hooks/useActiveTheme";
import { useT } from "@/hooks/useT";
import { Island } from "../Island";
import { ZONES } from "../zones";

export function Hub() {
  const theme = useActiveTheme();
  const t = useT();
  return (
    <Island id="hub" position={ZONES.hub.position} radius={2.8}>
      <Text
        position={[0, 1.1, 0]}
        fontSize={0.32}
        color={theme.palette.ink}
        anchorX="center"
        anchorY="middle"
        maxWidth={5}
      >
        {t.meta.name}
      </Text>
      <Text
        position={[0, 0.72, 0]}
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
