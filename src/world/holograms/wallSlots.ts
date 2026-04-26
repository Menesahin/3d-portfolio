import type { ContentPanel } from "@/stores/slices/world";

/**
 * Wall-anchored hologram layout. Stage geometry (post-scale [0.5, 1.0, 0.5]):
 *   X: −9.94 → +9.94, Y: 0 → +11.11, Z: −9.94 → +9.94.
 * Camera always sits on the +Z side. Each wall hologram lives ~0.9u in front
 * of its wall plane to avoid z-fighting against the GLB geometry, and is
 * rotated so its face points outward (toward the open side / camera).
 */
type Slot = {
  position: readonly [number, number, number];
  rotation: readonly [number, number, number];
};

export const WALL_SLOTS = {
  // Back wall — face points +Z (toward camera). No rotation.
  projects: { position: [0, 4.5, -9.0], rotation: [0, 0, 0] },
  // Left wall — rotate +π/2 around Y so the panel's +Z face points +X.
  experience: { position: [-9.0, 4.5, 0], rotation: [0, Math.PI / 2, 0] },
  // Right wall — rotate −π/2 around Y so the panel's +Z face points −X.
  skills: { position: [9.0, 4.5, 0], rotation: [0, -Math.PI / 2, 0] },
} as const satisfies Record<"projects" | "experience" | "skills", Slot>;

export type WallSlotId = keyof typeof WALL_SLOTS;

/**
 * Where the mascot stands per active section, and which world-space point
 * it should face. faceTarget is interpreted by Mascot.tsx as a 3D look-at
 * point — yaw = atan2(fx − pos.x, fz − pos.z).
 */
export const MASCOT_STATIONS = {
  hub: { position: [0, 0, 1.5], faceTarget: [0, 1, 9] },
  projects: { position: [0, 0, -3.5], faceTarget: [0, 1, -9] },
  experience: { position: [-3.5, 0, 0], faceTarget: [-9, 1, 0] },
  skills: { position: [3.5, 0, 0], faceTarget: [9, 1, 0] },
  contact: { position: [0, 0, 1.5], faceTarget: [0, 1, 9] },
} as const satisfies Record<
  "hub" | "projects" | "experience" | "skills" | "contact",
  { position: readonly [number, number, number]; faceTarget: readonly [number, number, number] }
>;

export type MascotStationId = keyof typeof MASCOT_STATIONS;

/** Maps a ContentPanel kind to its wall slot, or null when no wall applies. */
export function activeWall(c: ContentPanel | null): WallSlotId | null {
  if (!c) return null;
  if (c.kind === "project") return "projects";
  if (c.kind === "experience") return "experience";
  if (c.kind === "skill_group") return "skills";
  return null;
}
