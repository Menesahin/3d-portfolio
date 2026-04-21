import { Text } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useActiveTheme } from "@/hooks/useActiveTheme";
import { useStore } from "@/stores";
import { GlbProp } from "../../props/GlbProp";
import { ZONES } from "../../zones";
import { ZoneArea } from "../ZoneArea";

/**
 * Contact — an info booth built from a castle tower base + banner
 * and flanked by two lanterns. Clicking the booth activates the
 * contact-card panel.
 */
export function ContactArea() {
  const theme = useActiveTheme();
  const terminalActive = useStore((s) => s.world.terminalActive);

  const activate = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const apply = useStore.getState().applyUiEvent;
    apply({ kind: "camera.focus", target: "contact" });
    apply({ kind: "mascot.move", zone: "contact" });
    apply({ kind: "world.activate_terminal" });
    apply({ kind: "mascot.gesture", gesture: "bow" });
    apply({ kind: "content.contact_card" });
  };

  return (
    <ZoneArea id="contact" title="Contact" position={ZONES.contact.position} radius={5}>
      {/* Central info booth */}
      <group onClick={activate}>
        <GlbProp
          url="/models/props/kenney/tower-square-base.glb"
          position={[0, 0, 0]}
          scale={1.1}
        />
        <GlbProp url="/models/props/kenney/flag-pennant.glb" position={[0, 1.4, 0]} scale={0.9} />
      </group>

      {/* Two lanterns flanking */}
      <GlbProp url="/models/props/kenney/lantern.glb" position={[-1.8, 0, 0.8]} scale={0.7} />
      <GlbProp url="/models/props/kenney/lantern.glb" position={[1.8, 0, 0.8]} scale={0.7} />

      {/* Benches */}
      <GlbProp
        url="/models/props/kenney/bench.glb"
        position={[-2.4, 0, 1.8]}
        rotation={[0, 0.5, 0]}
        scale={1.0}
      />
      <GlbProp
        url="/models/props/kenney/bench.glb"
        position={[2.4, 0, 1.8]}
        rotation={[0, -0.5, 0]}
        scale={1.0}
      />

      {/* Mailbox sign emerges when active — shows contact text */}
      {terminalActive && (
        <>
          <Text
            position={[0, 2.2, 0.5]}
            fontSize={0.16}
            color={theme.palette.ink}
            anchorX="center"
            anchorY="middle"
            maxWidth={4}
          >
            menesahin99@gmail.com
          </Text>
          <Text
            position={[0, 1.95, 0.5]}
            fontSize={0.14}
            color={theme.palette.ink}
            fillOpacity={0.7}
            anchorX="center"
            anchorY="middle"
          >
            linkedin.com/in/menesahin
          </Text>
        </>
      )}
    </ZoneArea>
  );
}
