/**
 * Pluggable mascot configuration.
 *
 * The `Mascot` component reads this config and chooses its render path:
 *   - If `assetUrl` is set, it loads the GLB via `useGLTF` and maps
 *     `animationMap` clip names to our logical states (idle/walk/...).
 *   - Otherwise, it renders a small procedural placeholder robot.
 *
 * To swap in the real Animated Robot by Quaternius:
 *   1. Download the GLB from https://poly.pizza/m/QCm7qe9uNJ
 *      (click "GLTF" in the download menu).
 *   2. Save as `public/models/animated-robot.glb`.
 *   3. Set `assetUrl: "/models/animated-robot.glb"` below.
 *   4. Inspect clip names with `npx gltfjsx public/models/animated-robot.glb`
 *      and update `animationMap` accordingly.
 *   5. Drop a copy of the Poly Pizza LICENSE.txt alongside the GLB.
 *
 * No component code needs to change.
 */

export type MascotConfig = {
  id: string;
  assetUrl: string | null;
  scale: number;
  hoverOffset: number;
  animationMap: {
    idle: string;
    walk: string;
    jump?: string;
    wave?: string;
    dance?: string;
  };
  emoteAnchor: [number, number, number];
};

export const mascotConfig: MascotConfig = {
  id: "placeholder",
  assetUrl: null,
  scale: 1,
  hoverOffset: 0.9,
  animationMap: {
    idle: "Idle",
    walk: "Walk",
    jump: "Jump",
  },
  emoteAnchor: [0, 2.0, 0],
};
