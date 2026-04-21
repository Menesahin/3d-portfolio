import { useActiveTheme } from "@/hooks/useActiveTheme";
import { Island } from "../Island";
import { ZONES } from "../zones";

export function Gallery() {
  const theme = useActiveTheme();
  const frames = [-1.5, -0.5, 0.5, 1.5];
  return (
    <Island id="gallery" position={ZONES.gallery.position} radius={2.6}>
      {frames.map((x) => (
        <group key={x} position={[x, 0.8, -0.5]}>
          <mesh castShadow>
            <boxGeometry args={[0.8, 1.1, 0.08]} />
            <meshStandardMaterial color={theme.palette.plinth} metalness={0.1} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0, 0.05]}>
            <planeGeometry args={[0.7, 1.0]} />
            <meshStandardMaterial
              color={theme.palette.accent2}
              emissive={theme.palette.accent2}
              emissiveIntensity={theme.id === "cyber" ? 0.35 : 0.05}
            />
          </mesh>
        </group>
      ))}
    </Island>
  );
}
