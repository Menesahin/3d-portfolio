/**
 * Pluggable mascot configuration.
 *
 * The `Mascot` component reads this config and chooses its render path:
 *   - If `assetUrl` is set, it loads the GLB via `useGLTF` and maps
 *     `animationMap` clip names to our logical states (idle / walk / ...).
 *   - Otherwise, it renders a small procedural placeholder robot.
 *
 * KEX-07 has one production mascot: the custom Köfte Blender export.
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
  /** Optional loop used while the assistant is streaming prose. */
  talk?: string;
  animationMap: AnimationMap;
  emoteAnchor: [number, number, number];
};

/** Bump the query when Blender publishes a materially different Köfte GLB. */
export const KOFTE_ASSET_URL = "/models/cockpit/kofte.glb?v=4";

/** V7 copilot authored in the KOFTE_MK2 scene and exported through Blender MCP. */
export const kofteMascotConfig: MascotConfig = {
  id: "kofte",
  assetUrl: KOFTE_ASSET_URL,
  scale: 1.05,
  hoverOffset: 0,
  gestureTimeScale: 1,
  talk: "Talk",
  animationMap: {
    idle: "Idle",
    walk: "HoverMove",
    wave: "Wave",
    point: "Point",
    thumbs_up: "ThumbsUp",
    head_tilt: "HeadTilt",
    bow: "Bow",
    dance: "Dance",
    flip: "Flip",
    spin_happy: "SpinHappy",
    shy: "Shy",
    celebrate: "Celebrate",
  },
  emoteAnchor: [0, 2.2, 0],
};
