/**
 * Pluggable mascot configuration.
 *
 * The `Mascot` component reads this config and chooses its render path:
 *   - If `assetUrl` is set, it loads the GLB via `useGLTF` and maps
 *     `animationMap` clip names to our logical states (idle / walk / ...).
 *   - Otherwise, it renders a small procedural placeholder robot.
 *
 * v1 ships with the three.js reference `RobotExpressive.glb` — made by the
 * three.js team for their animation demos, 13 rigged clips, ~450 KB. MIT
 * license (three.js repo). Swap to any other rigged GLB by changing the
 * fields below; no component code needs to change.
 *
 * To try another model (e.g. Quaternius Animated Robot):
 *   1. Drop the GLB in `public/models/`.
 *   2. Update `assetUrl`, `scale`, `hoverOffset`, `animationMap`.
 *   3. Inspect clip names with `npx gltfjsx public/models/xyz.glb --debug`.
 */

export type AnimationMap = {
  idle: string;
  walk: string;
  jump?: string;
  wave?: string;
  dance?: string;
  thumbs_up?: string;
  point?: string;
  bow?: string;
  head_tilt?: string;
  shy?: string;
  flip?: string;
  spin_happy?: string;
};

export type MascotConfig = {
  id: string;
  assetUrl: string | null;
  scale: number;
  /** Vertical offset above the island's disc when idle. */
  hoverOffset: number;
  /** Multiplies gesture clip duration — 1.0 = native, lower = faster. */
  gestureTimeScale?: number;
  animationMap: AnimationMap;
  emoteAnchor: [number, number, number];
};

/**
 * Active mascot: `robot_playground.glb` (Hadrien59 / Sketchfab CC-BY,
 * supplied by the user). 8.3 MB, 340 nodes, 68 meshes, single baked
 * "Experiment" animation — the whole diorama plays it on loop.
 *
 * All logical gesture slots map to the same clip. GlbMascot falls
 * back to the auto-clear timer when a gesture is fired — the robot
 * just continues its Experiment loop while the emote icon carries
 * the beat.
 */
export const mascotConfig: MascotConfig = {
  id: "robot-playground",
  assetUrl: "/models/robot-playground.glb",
  scale: 0.35,
  hoverOffset: 0.05,
  gestureTimeScale: 1.0,
  animationMap: {
    idle: "Experiment",
    walk: "Experiment",
    jump: "Experiment",
    wave: "Experiment",
    dance: "Experiment",
    thumbs_up: "Experiment",
    point: "Experiment",
    bow: "Experiment",
    head_tilt: "Experiment",
  },
  emoteAnchor: [0, 2.2, 0],
};
