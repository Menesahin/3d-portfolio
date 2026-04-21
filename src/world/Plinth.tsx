import { Text } from "@react-three/drei";
import { useActiveTheme } from "@/hooks/useActiveTheme";

type PlinthProps = {
  position?: [number, number, number];
  label: string;
  sublabel?: string;
  width?: number;
  depth?: number;
  height?: number;
};

/**
 * A small display pedestal. Holds a label; content (hologram) is rendered
 * separately as a child of the island so it can animate independently.
 */
export function Plinth({
  position = [0, 0, 0],
  label,
  sublabel,
  width = 1.4,
  depth = 1.4,
  height = 0.6,
}: PlinthProps) {
  const theme = useActiveTheme();

  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, height / 2 + 0.2, 0]}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={theme.palette.plinth}
          roughness={0.6}
          metalness={theme.id === "cyber" ? 0.4 : 0.05}
        />
      </mesh>

      <Text
        position={[0, height + 0.45, 0]}
        fontSize={0.22}
        color={theme.palette.ink}
        anchorX="center"
        anchorY="middle"
        maxWidth={width * 2}
      >
        {label}
      </Text>
      {sublabel && (
        <Text
          position={[0, height + 0.2, 0]}
          fontSize={0.13}
          color={theme.palette.ink}
          anchorX="center"
          anchorY="middle"
          maxWidth={width * 2.2}
          fillOpacity={0.7}
        >
          {sublabel}
        </Text>
      )}
    </group>
  );
}
