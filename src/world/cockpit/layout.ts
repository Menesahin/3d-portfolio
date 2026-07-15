import type { CameraTarget } from "@/types/tools";
import type { ZoneId } from "../zones";

export type CockpitShot = {
  pos: [number, number, number];
  target: [number, number, number];
};

export type CockpitShotTable = Record<CameraTarget, CockpitShot>;

// Mirrors public/models/cockpit/cockpit-layout.json, which is emitted by the
// Blender builder and retained as an asset-validation contract.
export const COCKPIT_SHOTS: CockpitShotTable = {
  hub: { pos: [0, 4.1, 7.6], target: [0, 1.5, 0.4] },
  overview: { pos: [0, 6.0, 8.25], target: [0, 3.45, -2.3] },
  gallery: { pos: [0, 3.3, 6.6], target: [0, 2.05, -6.585] },
  projects: { pos: [0, 3.3, 6.6], target: [0, 2.05, -6.585] },
  experience: { pos: [2.0, 4.5, 1.0], target: [-7.685, 3.52, -0.45] },
  skills: { pos: [-2.0, 4.5, 1.0], target: [7.685, 3.52, -0.45] },
  contact: { pos: [0.8, 3.3, 7.8], target: [4.5, 2.25, 5.98] },
};

export const COCKPIT_MOBILE_SHOTS: CockpitShotTable = {
  hub: { pos: [0, 5.7, 8.1], target: [0, 1.8, -0.2] },
  overview: { pos: [0, 6.8, 8.45], target: [0, 3.8, -2.8] },
  gallery: { pos: [0, 4.4, 8.8], target: [0, 2.05, -6.585] },
  projects: { pos: [0, 4.4, 8.8], target: [0, 2.05, -6.585] },
  experience: { pos: [3.6, 4.8, 1.5], target: [-7.685, 3.52, -0.45] },
  skills: { pos: [-3.6, 4.8, 1.5], target: [7.685, 3.52, -0.45] },
  contact: { pos: [0.8, 4.4, 8.4], target: [4.5, 2.25, 5.98] },
};

export const COCKPIT_MASCOT_POSITIONS: Record<ZoneId, readonly [number, number, number]> = {
  hub: [0, 0, 1.0],
  gallery: [0, 0, -4.65],
  projects: [0, 0, -4.65],
  experience: [-4.75, 0, -0.45],
  skills: [4.75, 0, -0.45],
  contact: [2.3, 0, 4.65],
};

export const COCKPIT_MASCOT_FACE_TARGETS: Record<ZoneId, readonly [number, number, number]> = {
  hub: [0, 1, 9],
  gallery: [0, 1, 2],
  projects: [0, 1, 2],
  experience: [2, 1, 0],
  skills: [-2, 1, 0],
  contact: [0, 1, 9],
};

export const COCKPIT_WALL_SLOTS = {
  projects: { position: [0, 2.05, -6.52], rotation: [0, 0, 0] },
  experience: { position: [-7.62, 3.52, -0.45], rotation: [0, Math.PI / 2, 0] },
  skills: { position: [7.62, 3.52, -0.45], rotation: [0, -Math.PI / 2, 0] },
} as const;
