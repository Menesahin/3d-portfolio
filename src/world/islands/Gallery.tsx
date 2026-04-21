import { useActiveTheme } from "@/hooks/useActiveTheme";
import { Island } from "../Island";
import { ZONES } from "../zones";

// Frame positions (x offset) + slight tilt variation so the wall feels hand-hung.
const FRAMES: Array<{ x: number; y: number; tilt: number; ratio: "portrait" | "landscape" }> = [
  { x: -1.55, y: 0.95, tilt: -0.04, ratio: "portrait" },
  { x: -0.5, y: 1.1, tilt: 0.03, ratio: "landscape" },
  { x: 0.55, y: 0.9, tilt: -0.02, ratio: "portrait" },
  { x: 1.55, y: 1.05, tilt: 0.04, ratio: "landscape" },
];

export function Gallery() {
  const theme = useActiveTheme();

  return (
    <Island id="gallery" title="Gallery" position={ZONES.gallery.position} radius={2.9}>
      {FRAMES.map((f) => {
        const w = f.ratio === "portrait" ? 0.55 : 0.8;
        const h = f.ratio === "portrait" ? 0.8 : 0.55;
        return (
          <group key={f.x} position={[f.x, f.y, -0.4]} rotation={[0, 0, f.tilt]}>
            {/* Thin frame */}
            <mesh castShadow>
              <boxGeometry args={[w + 0.06, h + 0.06, 0.03]} />
              <meshStandardMaterial
                color={theme.palette.plinth}
                metalness={0.15}
                roughness={0.55}
              />
            </mesh>
            {/* Matte + subtle accent, slightly proud of the frame */}
            <mesh position={[0, 0, 0.02]}>
              <planeGeometry args={[w, h]} />
              <meshStandardMaterial color={theme.palette.island} roughness={0.95} metalness={0} />
            </mesh>
            {/* Tiny accent strip at bottom — reads as a photo caption */}
            <mesh position={[0, -h / 2 + 0.05, 0.021]}>
              <planeGeometry args={[w * 0.7, 0.03]} />
              <meshStandardMaterial
                color={theme.palette.accent}
                emissive={theme.palette.accent}
                emissiveIntensity={theme.id === "cyber" ? 0.5 : 0.15}
              />
            </mesh>
          </group>
        );
      })}
    </Island>
  );
}
