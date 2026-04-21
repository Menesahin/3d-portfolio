import { Billboard, Text } from "@react-three/drei";
import { useActiveTheme } from "@/hooks/useActiveTheme";
import { Island } from "../Island";
import { SkillsCanopy } from "../props/ZoneStaging";
import { ZONES } from "../zones";

const groups = [
  { id: "ai", label: "AI / LLM", angle: 0 },
  { id: "backend", label: "Backend", angle: Math.PI / 2 },
  { id: "frontend", label: "Frontend", angle: Math.PI },
  { id: "devops", label: "DevOps", angle: (3 * Math.PI) / 2 },
];

export function Skills() {
  const theme = useActiveTheme();
  const r = 2.0;
  return (
    <Island id="skills" title="Skills" position={ZONES.skills.position} radius={2.8}>
      <SkillsCanopy />
      {groups.map((g) => {
        const x = Math.cos(g.angle) * r;
        const z = Math.sin(g.angle) * r;
        return (
          <group key={g.id} position={[x, 0.7, z]}>
            <mesh castShadow>
              <icosahedronGeometry args={[0.32, 0]} />
              <meshStandardMaterial
                color={theme.palette.accent}
                emissive={theme.palette.accent}
                emissiveIntensity={theme.id === "cyber" ? 0.6 : 0.15}
                roughness={0.35}
                metalness={0.3}
              />
            </mesh>
            <Billboard position={[0, 0.6, 0]}>
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
    </Island>
  );
}
