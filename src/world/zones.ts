/**
 * Wall-anchored staging — the mascot now physically walks to wall-side
 * stations when its section becomes active. Each zone lives near the
 * wall its content lives on:
 *
 *   gallery / projects → back wall (Z = −3.5, faces −Z)
 *   experience         → left wall (X = −3.5, faces −X)
 *   skills             → right wall (X = +3.5, faces +X)
 *   hub / contact      → centre, slightly forward (Z = +1.5)
 *
 * Wall hologram coords + facing vectors live in
 * `src/world/holograms/wallSlots.ts` so camera, mascot, and HologramStage
 * all read the same numbers.
 *
 * Zone IDs unchanged — `CameraRig`, `Mascot`, and the LangGraph tool
 * palette all reference these keys; that contract stays intact.
 */
export const ZONES = {
  hub: { position: [0, 0, 1.5], label: "Hub" },
  gallery: { position: [0, 0, -3.5], label: "Gallery" },
  projects: { position: [0, 0, -3.5], label: "Projects" },
  experience: { position: [-3.5, 0, 0], label: "Experience" },
  skills: { position: [3.5, 0, 0], label: "Skills" },
  contact: { position: [0, 0, 1.5], label: "Contact" },
} as const satisfies Record<string, { position: readonly [number, number, number]; label: string }>;

export type ZoneId = keyof typeof ZONES;

export const ZONE_IDS = Object.keys(ZONES) as ZoneId[];
