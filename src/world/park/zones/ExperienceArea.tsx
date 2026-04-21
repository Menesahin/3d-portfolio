import { Text } from "@react-three/drei";
import { useActiveTheme } from "@/hooks/useActiveTheme";
import { useStore } from "@/stores";
import type { CompanyId } from "@/types/tools";
import { GlbProp } from "../../props/GlbProp";
import { ZONES } from "../../zones";
import { ZoneArea } from "../ZoneArea";

const COMPANIES: ReadonlyArray<{
  id: CompanyId;
  x: number;
  label: string;
  sublabel: string;
}> = [
  { id: "nar-sistem", x: -2.6, label: "Nar Sistem", sublabel: "2025 → now" },
  { id: "formica", x: 0, label: "Formica AI", sublabel: "2022–2025" },
  { id: "ing-bank", x: 2.6, label: "ING Bank", sublabel: "2022" },
];

/**
 * Experience — three tall stele-style monoliths (castle tower stacks)
 * lined up with a pennant on each. Clicking a monolith activates its
 * company hologram + content card.
 */
export function ExperienceArea() {
  const theme = useActiveTheme();

  const activate = (company: CompanyId) => {
    const apply = useStore.getState().applyUiEvent;
    apply({ kind: "camera.focus", target: "experience" });
    apply({ kind: "mascot.move", zone: "experience" });
    apply({ kind: "world.show_hologram", zone: "experience", contentId: company });
    apply({ kind: "content.experience", company });
  };

  return (
    <ZoneArea id="experience" title="Experience" position={ZONES.experience.position} radius={5}>
      {/* Path of stones behind */}
      <GlbProp url="/models/props/kenney/rocks-small.glb" position={[-4, 0, 1.5]} scale={0.8} />
      <GlbProp url="/models/props/kenney/rocks-small.glb" position={[4, 0, 1.5]} scale={0.8} />

      {COMPANIES.map((c) => (
        <group key={c.id} position={[c.x, 0, 0]}>
          {/* Stacked tower = tall monolith */}
          <group
            onClick={(e) => {
              e.stopPropagation();
              activate(c.id);
            }}
          >
            <GlbProp
              url="/models/props/kenney/tower-hexagon-base.glb"
              position={[0, 0, 0]}
              scale={0.75}
            />
            <GlbProp
              url="/models/props/kenney/tower-hexagon-mid.glb"
              position={[0, 0.9, 0]}
              scale={0.75}
            />
            <GlbProp
              url="/models/props/kenney/tower-hexagon-top.glb"
              position={[0, 1.8, 0]}
              scale={0.75}
            />
            <GlbProp
              url="/models/props/kenney/flag-pennant.glb"
              position={[0, 2.6, 0]}
              scale={0.7}
            />
          </group>
          {/* Label */}
          <Text
            position={[0, -0.2, 0.8]}
            rotation={[-Math.PI / 4, 0, 0]}
            fontSize={0.2}
            color={theme.palette.ink}
            anchorX="center"
            anchorY="middle"
            fontWeight={600}
          >
            {c.label}
          </Text>
          <Text
            position={[0, -0.45, 0.9]}
            rotation={[-Math.PI / 4, 0, 0]}
            fontSize={0.12}
            color={theme.palette.ink}
            anchorX="center"
            anchorY="middle"
            fillOpacity={0.6}
          >
            {c.sublabel}
          </Text>
        </group>
      ))}

      {/* Lantern accents */}
      <GlbProp url="/models/props/kenney/lantern.glb" position={[-3.5, 0, -1.2]} scale={0.6} />
      <GlbProp url="/models/props/kenney/lantern.glb" position={[3.5, 0, -1.2]} scale={0.6} />
    </ZoneArea>
  );
}
