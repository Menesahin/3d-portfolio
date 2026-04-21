import { Text } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useActiveTheme } from "@/hooks/useActiveTheme";
import { useStore } from "@/stores";
import { GlbProp } from "../../props/GlbProp";
import { ZONES } from "../../zones";
import { ZoneArea } from "../ZoneArea";

/**
 * Contact — an info booth made of a stone tower + a pennant + two
 * flanking lanterns. Visitor benches on the front line. Clicking the
 * booth activates the contact card.
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
    <ZoneArea id="contact" title="Contact" position={ZONES.contact.position} radius={4.4}>
      {/* Central info booth — scaled up */}
      <group onClick={activate}>
        <GlbProp
          url="/models/props/kenney/tower-square-base.glb"
          position={[0, 0, 0]}
          scale={1.6}
        />
        <GlbProp url="/models/props/kenney/flag-pennant.glb" position={[0, 2.2, 0]} scale={1.2} />
      </group>

      {/* Lanterns flanking the booth */}
      <GlbProp url="/models/props/kenney/lantern.glb" position={[-2.4, 0, 0.5]} scale={0.9} />
      <GlbProp url="/models/props/kenney/lantern.glb" position={[2.4, 0, 0.5]} scale={0.9} />

      {/* Visitor benches */}
      <GlbProp
        url="/models/props/kenney/bench.glb"
        position={[-2.8, 0, 2.0]}
        rotation={[0, 0.5, 0]}
        scale={1.3}
      />
      <GlbProp
        url="/models/props/kenney/bench.glb"
        position={[2.8, 0, 2.0]}
        rotation={[0, -0.5, 0]}
        scale={1.3}
      />

      {/* Contact text appears when terminal is active */}
      {terminalActive && (
        <>
          <Text
            position={[0, 3.0, 0.6]}
            fontSize={0.2}
            color={theme.palette.ink}
            anchorX="center"
            anchorY="middle"
            maxWidth={5}
          >
            menesahin99@gmail.com
          </Text>
          <Text
            position={[0, 2.7, 0.6]}
            fontSize={0.16}
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
