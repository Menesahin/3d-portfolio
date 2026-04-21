import { Billboard, Text } from "@react-three/drei";
import { useActiveTheme } from "@/hooks/useActiveTheme";
import { GlbProp } from "../../props/GlbProp";
import { ZONES } from "../../zones";
import { ZoneArea } from "../ZoneArea";

const GROUPS = [
  {
    id: "ai",
    label: "AI / LLM",
    model: "/models/props/kenney/satelliteDish_detailed.glb",
    angle: 0,
  },
  {
    id: "backend",
    label: "Backend",
    model: "/models/props/kenney/tower-square-base-border.glb",
    angle: Math.PI / 2,
  },
  {
    id: "frontend",
    label: "Frontend",
    model: "/models/props/kenney/lampRoundTable.glb",
    angle: Math.PI,
  },
  {
    id: "devops",
    label: "DevOps",
    model: "/models/props/kenney/stairs-stone.glb",
    angle: (3 * Math.PI) / 2,
  },
] as const;

/**
 * Skills — a central oak (the "skill tree") surrounded by four
 * monuments, one per technical specialty. Each monument is a
 * distinct Kenney GLB so the silhouette reads clearly.
 */
export function SkillsArea() {
  const theme = useActiveTheme();
  const r = 2.6;

  return (
    <ZoneArea id="skills" title="Skills" position={ZONES.skills.position} radius={5.5}>
      {/* The central tree */}
      <GlbProp url="/models/props/kenney/tree_oak.glb" position={[0, 0, 0]} scale={2.0} />

      {/* Four skill monuments in a ring */}
      {GROUPS.map((g) => {
        const x = Math.cos(g.angle) * r;
        const z = Math.sin(g.angle) * r;
        return (
          <group key={g.id} position={[x, 0, z]}>
            <GlbProp url={g.model} position={[0, 0, 0]} scale={0.65} />
            <Billboard position={[0, 1.4, 0]}>
              <Text
                fontSize={0.2}
                color={theme.palette.ink}
                anchorX="center"
                anchorY="middle"
                fontWeight={600}
              >
                {g.label}
              </Text>
            </Billboard>
          </group>
        );
      })}

      {/* Low flowers around the tree */}
      <GlbProp
        url="/models/props/kenney/flower_yellowA.glb"
        position={[-1.0, 0, 1.2]}
        scale={0.9}
      />
      <GlbProp url="/models/props/kenney/flower_purpleA.glb" position={[1.0, 0, 1.2]} scale={0.9} />
      <GlbProp url="/models/props/kenney/flower_redA.glb" position={[0, 0, 1.5]} scale={0.9} />
    </ZoneArea>
  );
}
