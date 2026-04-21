import { useActiveTheme } from "@/hooks/useActiveTheme";
import type { ProjectId } from "@/types/tools";
import { Island } from "../Island";
import { GlbProp } from "../props/GlbProp";
import { getPosterTexture } from "../props/projectPoster";
import { GalleryWall } from "../props/ZoneStaging";
import { ZONES } from "../zones";

/**
 * A gallery-style wall of project posters. Textures are generated via
 * CanvasTexture so we don't need network assets; swap the poster spec in
 * `src/world/props/projectPoster.ts` (or drop a real image there) when
 * you have screenshots.
 */
type Frame = {
  x: number;
  y: number;
  tilt: number;
  project: ProjectId | null;
  portrait: boolean;
};

const FRAMES: Frame[] = [
  { x: -1.7, y: 1.15, tilt: -0.03, project: "vocabuddy", portrait: true },
  { x: -0.5, y: 1.3, tilt: 0.02, project: "shotmock", portrait: false },
  { x: 0.55, y: 1.1, tilt: -0.02, project: "claude-voice", portrait: true },
  { x: 1.65, y: 1.25, tilt: 0.03, project: null, portrait: false },
];

export function Gallery() {
  const theme = useActiveTheme();

  return (
    <Island id="gallery" title="Gallery" position={ZONES.gallery.position} radius={2.9}>
      <GalleryWall />
      {/* Real Kenney CC0 foliage — replaces the older procedural plants. */}
      <GlbProp url="/models/props/kenney/tree_oak.glb" position={[-2.4, 0.25, 1.5]} scale={0.6} />
      <GlbProp
        url="/models/props/kenney/plant_bushDetailed.glb"
        position={[-2.4, 0.25, 0.6]}
        scale={0.55}
      />
      <GlbProp url="/models/props/kenney/tree_fat.glb" position={[2.4, 0.25, 1.5]} scale={0.55} />
      <GlbProp
        url="/models/props/kenney/flower_yellowA.glb"
        position={[2.1, 0.25, 0.8]}
        scale={0.8}
      />
      <GlbProp
        url="/models/props/kenney/flower_purpleA.glb"
        position={[-2.05, 0.25, -0.25]}
        scale={0.7}
      />

      {FRAMES.map((f) => {
        const w = f.portrait ? 0.6 : 0.9;
        const h = f.portrait ? 0.85 : 0.6;
        const texture = f.project ? getPosterTexture(f.project) : null;
        return (
          <group key={f.x} position={[f.x, f.y, -0.92]} rotation={[0, 0, f.tilt]}>
            {/* Thin frame */}
            <mesh castShadow>
              <boxGeometry args={[w + 0.06, h + 0.06, 0.03]} />
              <meshStandardMaterial color={theme.palette.plinth} metalness={0.2} roughness={0.5} />
            </mesh>

            {/* Poster — either the canvas texture, or a matte placeholder */}
            <mesh position={[0, 0, 0.02]}>
              <planeGeometry args={[w, h]} />
              {texture ? (
                <meshStandardMaterial map={texture} roughness={0.85} metalness={0} />
              ) : (
                <meshStandardMaterial color={theme.palette.island} roughness={0.95} metalness={0} />
              )}
            </mesh>

            {/* Caption strip */}
            <mesh position={[0, -h / 2 + 0.05, 0.021]}>
              <planeGeometry args={[w * 0.7, 0.03]} />
              <meshStandardMaterial
                color={theme.palette.accent}
                emissive={theme.palette.accent}
                emissiveIntensity={theme.id === "cyber" ? 0.8 : 0.2}
              />
            </mesh>
          </group>
        );
      })}
    </Island>
  );
}
