import { Text } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useActiveTheme } from "@/hooks/useActiveTheme";
import { useHover } from "@/hooks/useHover";
import { useStore } from "@/stores";
import { Island } from "../Island";
import { IslandDecor } from "../props/IslandDecor";
import { ContactSignage } from "../props/ZoneStaging";
import { ZONES } from "../zones";

export function Contact() {
  const theme = useActiveTheme();
  const active = useStore((s) => s.world.terminalActive);
  const hover = useHover();

  const activateTerminal = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const apply = useStore.getState().applyUiEvent;
    apply({ kind: "camera.focus", target: "contact" });
    apply({ kind: "mascot.move", zone: "contact" });
    apply({ kind: "world.activate_terminal" });
    apply({ kind: "mascot.gesture", gesture: "bow" });
    apply({ kind: "content.contact_card" });
  };

  return (
    <Island id="contact" title="Contact" position={ZONES.contact.position} radius={2.4}>
      <ContactSignage />
      <IslandDecor variant="lantern" position={[-1.75, 0.25, 0.8]} scale={0.95} />
      <IslandDecor variant="lantern" position={[1.75, 0.25, 0.8]} scale={0.95} />
      {/* Terminal: thin tower with a glowing screen — clickable. */}
      <group
        position={[0, 0.6, 0]}
        onClick={activateTerminal}
        onPointerOver={hover.onPointerOver}
        onPointerOut={hover.onPointerOut}
      >
        <mesh castShadow>
          <boxGeometry args={[1.0, 1.2, 0.6]} />
          <meshStandardMaterial
            color={theme.palette.plinth}
            metalness={0.3}
            roughness={0.5}
            emissive={theme.palette.accent}
            emissiveIntensity={hover.hovered ? 0.15 : 0}
          />
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
