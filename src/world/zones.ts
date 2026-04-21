/**
 * Canonical world zones — park layout (flat ground, no tables/islands).
 * Positions are in world-space units. Camera rig + mascot orchestrator
 * both read this map. Adding or renaming a zone → update this file plus
 * the matching park/zones/*.tsx component.
 */
export const ZONES = {
  hub: { position: [0, 0, 0], label: "Hub" },
  gallery: { position: [-14, 0, -8], label: "Gallery" },
  projects: { position: [14, 0, -8], label: "Projects" },
  experience: { position: [-14, 0, 4], label: "Experience" },
  contact: { position: [14, 0, 4], label: "Contact" },
  skills: { position: [0, 0, 10], label: "Skills" },
} as const satisfies Record<string, { position: readonly [number, number, number]; label: string }>;

export type ZoneId = keyof typeof ZONES;

export const ZONE_IDS = Object.keys(ZONES) as ZoneId[];
