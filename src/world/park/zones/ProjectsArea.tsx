import { Text } from "@react-three/drei";
import { useActiveTheme } from "@/hooks/useActiveTheme";
import { useStore } from "@/stores";
import type { ProjectId } from "@/types/tools";
import { GlbProp } from "../../props/GlbProp";
import { ZONES } from "../../zones";
import { ZoneArea } from "../ZoneArea";

const KIOSKS: ReadonlyArray<{
  id: ProjectId;
  model: string;
  x: number;
  label: string;
  sublabel: string;
}> = [
  {
    id: "vocabuddy",
    model: "/models/props/kenney/arcade-machine.glb",
    x: -2.6,
    label: "Vocabuddy",
    sublabel: "iOS · AI",
  },
  {
    id: "shotmock",
    model: "/models/props/kenney/pinball.glb",
    x: 0,
    label: "ShotMock",
    sublabel: "SaaS · ASO",
  },
  {
    id: "claude-voice",
    model: "/models/props/kenney/ticket-machine.glb",
    x: 2.6,
    label: "Claude Voice",
    sublabel: "OSS · npm",
  },
];

/**
 * Projects — three interactive kiosks (Kenney Mini-Arcade) side by
 * side. Clicking a kiosk opens its project content card.
 */
export function ProjectsArea() {
  const theme = useActiveTheme();

  const activate = (project: ProjectId) => {
    const apply = useStore.getState().applyUiEvent;
    apply({ kind: "camera.focus", target: "projects" });
    apply({ kind: "mascot.move", zone: "projects" });
    apply({ kind: "mascot.emote", icon: "sparkle" });
    apply({ kind: "content.project", project });
  };

  return (
    <ZoneArea id="projects" title="Projects" position={ZONES.projects.position} radius={5}>
      {KIOSKS.map((k) => (
        <group key={k.id} position={[k.x, 0, 0]}>
          <group
            onClick={(e) => {
              e.stopPropagation();
              activate(k.id);
            }}
          >
            <GlbProp url={k.model} position={[0, 0, 0]} scale={0.9} />
          </group>
          <Text
            position={[0, 2.4, 0]}
            fontSize={0.22}
            color={theme.palette.ink}
            anchorX="center"
            anchorY="middle"
            fontWeight={600}
          >
            {k.label}
          </Text>
          <Text
            position={[0, 2.15, 0]}
            fontSize={0.13}
            color={theme.palette.ink}
            anchorX="center"
            anchorY="middle"
            fillOpacity={0.6}
          >
            {k.sublabel}
          </Text>
        </group>
      ))}

      {/* Lamps on the corners */}
      <GlbProp
        url="/models/props/kenney/lampRoundFloor.glb"
        position={[-4.2, 0, -1.4]}
        scale={1.2}
      />
      <GlbProp
        url="/models/props/kenney/lampRoundFloor.glb"
        position={[4.2, 0, -1.4]}
        scale={1.2}
      />
    </ZoneArea>
  );
}
