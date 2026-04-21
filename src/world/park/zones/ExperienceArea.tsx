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
 * Experience — three tall stacked-hexagon monoliths in a row, each
 * with a pennant on top and a plaque stone at its foot. Towers are
 * scaled so they read as monuments at overview distance (≈ 4 m tall).
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
    <ZoneArea id="experience" title="Experience" position={ZONES.experience.position} radius={4.4}>
      {COMPANIES.map((c) => (
        <group key={c.id} position={[c.x, 0, 0]}>
          <group
            onClick={(e) => {
              e.stopPropagation();
              activate(c.id);
            }}
          >
            {/* Stacked tower — stone plaque stone + 3 tower segments + flag. */}
            <GlbProp
              url="/models/props/kenney/rocks-small.glb"
              position={[0, 0, 0.9]}
              scale={0.6}
            />
            <GlbProp
              url="/models/props/kenney/tower-hexagon-base.glb"
              position={[0, 0, 0]}
              scale={1.1}
            />
            <GlbProp
              url="/models/props/kenney/tower-hexagon-mid.glb"
              position={[0, 1.35, 0]}
              scale={1.1}
            />
            <GlbProp
              url="/models/props/kenney/tower-hexagon-top.glb"
              position={[0, 2.7, 0]}
              scale={1.1}
            />
            <GlbProp
              url="/models/props/kenney/flag-pennant.glb"
              position={[0, 3.9, 0]}
              scale={1.0}
            />
          </group>
          {/* Front-facing labels */}
          <Text
            position={[0, 0.25, 1.2]}
            rotation={[-Math.PI / 6, 0, 0]}
            fontSize={0.22}
            color={theme.palette.ink}
            anchorX="center"
            anchorY="middle"
            fontWeight={600}
          >
            {c.label}
          </Text>
          <Text
            position={[0, 0.05, 1.3]}
            rotation={[-Math.PI / 6, 0, 0]}
            fontSize={0.13}
            color={theme.palette.ink}
            anchorX="center"
            anchorY="middle"
            fillOpacity={0.6}
          >
            {c.sublabel}
          </Text>
        </group>
      ))}

      {/* Lanterns framing the row */}
      <GlbProp url="/models/props/kenney/lantern.glb" position={[-4.0, 0, 0]} scale={0.85} />
      <GlbProp url="/models/props/kenney/lantern.glb" position={[4.0, 0, 0]} scale={0.85} />
    </ZoneArea>
  );
}
