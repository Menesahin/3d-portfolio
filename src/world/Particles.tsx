import { Sparkles } from "@react-three/drei";
import { useActiveTheme } from "@/hooks/useActiveTheme";

/**
 * Theme-conditional particle layer. Dreamy gets warm pollen dust;
 * Cyber gets no sparkles (the grid-sparks live in Ground.tsx).
 */
export function Particles() {
  const theme = useActiveTheme();
  if (theme.particles === "none") return null;

  if (theme.particles === "pollen-dust") {
    return (
      <Sparkles
        count={160}
        scale={[32, 12, 32]}
        size={2.2}
        speed={0.25}
        opacity={0.55}
        color={theme.palette.accent2}
      />
    );
  }
  // grid-sparks handled by Ground.tsx grid shader — nothing extra here.
  return null;
}
