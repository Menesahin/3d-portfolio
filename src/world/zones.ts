/**
 * Canonical world zones. Positions are in world-space units.
 * The camera rig and mascot orchestrator both read this map.
 * Adding / renaming a zone => update this file plus corresponding island.
 */
export const ZONES = {
  hub: { position: [0, 0, 0], label: "Hub" },
  experience: { position: [-8, 0, -4], label: "Experience" },
  projects: { position: [8, 0, -4], label: "Projects" },
  skills: { position: [0, 2, -10], label: "Skills" },
  gallery: { position: [-8, -1, 6], label: "Gallery" },
  contact: { position: [8, -1, 6], label: "Contact" },
} as const satisfies Record<string, { position: readonly [number, number, number]; label: string }>;

export type ZoneId = keyof typeof ZONES;

export const ZONE_IDS = Object.keys(ZONES) as ZoneId[];
