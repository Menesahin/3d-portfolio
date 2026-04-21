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
    scale: 1.2,
    angle: 0,
  },
  {
    id: "backend",
    label: "Backend",
    model: "/models/props/kenney/tower-square-base-border.glb",
    scale: 1.2,
    angle: Math.PI / 2,
  },
  {
    id: "frontend",
    label: "Frontend",
    model: "/models/props/kenney/lampRoundTable.glb",
    scale: 1.6,
    angle: Math.PI,
  },
  {
    id: "devops",
    label: "DevOps",
    model: "/models/props/kenney/stairs-stone.glb",
    scale: 1.2,
    angle: (3 * Math.PI) / 2,
  },
] as const;

/**
 * Skills — a central oak + four skill monuments on a 3-unit ring.
 * Each monument carries a billboarded label. Monuments scaled up so
 * the ring silhouette reads clearly.
 */
export function SkillsArea() {
  const theme = useActiveTheme();
  const r = 3.2;

  return (
    <ZoneArea id="skills" title="Skills" position={ZONES.skills.position} radius={4.4}>
      {/* Central oak — the "skill tree" */}
      <GlbProp url="/models/props/kenney/tree_oak.glb" position={[0, 0, 0]} scale={2.6} />

      {/* Four skill monuments on a ring */}
      {GROUPS.map((g) => {
        const x = Math.cos(g.angle) * r;
        const z = Math.sin(g.angle) * r;
        return (
          <group key={g.id} position={[x, 0, z]}>
            <GlbProp url={g.model} position={[0, 0, 0]} scale={g.scale} />
            <Billboard position={[0, 1.8, 0]}>
              <Text
                fontSize={0.24}
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
    </ZoneArea>
  );
}
