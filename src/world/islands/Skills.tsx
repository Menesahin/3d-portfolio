import { Text } from "@react-three/drei";
import { useActiveTheme } from "@/hooks/useActiveTheme";
import { Island } from "../Island";
import { ZONES } from "../zones";

const groups = [
  { id: "ai", label: "AI / LLM", angle: 0 },
  { id: "backend", label: "Backend", angle: Math.PI / 2 },
  { id: "frontend", label: "Frontend", angle: Math.PI },
  { id: "devops", label: "DevOps", angle: (3 * Math.PI) / 2 },
];

export function Skills() {
  const theme = useActiveTheme();
  const r = 1.4;
  return (
    <Island id="skills" position={ZONES.skills.position} radius={2.4}>
      {groups.map((g) => {
        const x = Math.cos(g.angle) * r;
        const z = Math.sin(g.angle) * r;
        return (
          <group key={g.id} position={[x, 0.6, z]}>
            <mesh castShadow>
              <icosahedronGeometry args={[0.28, 0]} />
              <meshStandardMaterial
                color={theme.palette.accent}
                emissive={theme.palette.accent}
                emissiveIntensity={theme.id === "cyber" ? 0.5 : 0.12}
                roughness={0.4}
                metalness={0.25}
              />
            </mesh>
            <Text
              position={[0, 0.58, 0]}
              fontSize={0.14}
              color={theme.palette.ink}
              anchorX="center"
              anchorY="middle"
            >
              {g.label}
            </Text>
          </group>
        );
      })}
    </Island>
  );
}
