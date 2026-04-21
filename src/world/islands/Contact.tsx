import { Text } from "@react-three/drei";
import { useActiveTheme } from "@/hooks/useActiveTheme";
import { useStore } from "@/stores";
import { Island } from "../Island";
import { ZONES } from "../zones";

export function Contact() {
  const theme = useActiveTheme();
  const active = useStore((s) => s.world.terminalActive);

  return (
    <Island id="contact" title="Contact" position={ZONES.contact.position} radius={2.4}>
      {/* Terminal: thin tower with a glowing screen */}
      <group position={[0, 0.6, 0]}>
        <mesh castShadow>
          <boxGeometry args={[1.0, 1.2, 0.6]} />
          <meshStandardMaterial color={theme.palette.plinth} metalness={0.3} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.1, 0.31]}>
          <planeGeometry args={[0.8, 0.8]} />
          <meshStandardMaterial
            color={active ? theme.palette.accent : theme.palette.ink}
            emissive={active ? theme.palette.accent : theme.palette.ink}
            emissiveIntensity={active ? 0.8 : 0.05}
          />
        </mesh>
        {active && (
          <Text
            position={[0, 0.1, 0.33]}
            fontSize={0.08}
            color={theme.palette.ink}
            anchorX="center"
            anchorY="middle"
            maxWidth={0.7}
          >
            menesahin99@gmail.com{"\n"}linkedin.com/in/menesahin
          </Text>
        )}
      </group>
    </Island>
  );
}
