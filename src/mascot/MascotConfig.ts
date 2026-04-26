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

import type { MascotGesture } from "@/types/tools";

/**
 * Maps a logical mascot signal (idle / walk / each `MascotGesture`)
 * onto a clip name in the loaded GLB. Keying by `MascotGesture` instead
 * of hand-typed strings means adding a new gesture in `types/tools.ts`
 * forces the config to be revisited.
 */
export type AnimationMap = Partial<Record<MascotGesture, string>> & {
  idle: string;
  walk: string;
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
 * RobotExpressive's clip names (per three.js repo):
 *   Idle · Walking · Running · Dance · Death · Sitting · Standing · Jump
 *   Wave · ThumbsUp · No · Yes · Punch
 *
 * Mappings lean on obvious names; richer gestures (flip, shy, spin_happy)
 * are intentionally undefined so GlbMascot falls back to procedural cues.
 */
export const mascotConfig: MascotConfig = {
  id: "robot-expressive",
  assetUrl: "/models/RobotExpressive.glb",
  scale: 0.5,
  hoverOffset: 0,
  gestureTimeScale: 1.0,
  animationMap: {
    idle: "Idle",
    walk: "Walking",
    jump: "Jump",
    wave: "Wave",
    dance: "Dance",
    thumbs_up: "ThumbsUp",
    point: "Yes",
    bow: "Sitting",
    head_tilt: "No",
    shy: "No",
    flip: "WalkJump",
    spin_happy: "Dance",
  },
  emoteAnchor: [0, 2.4, 0],
};
