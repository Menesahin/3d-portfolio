/** Stable navigation IDs shared by the camera, mascot, and agent tools. */
export const ZONES = {
  hub: { label: "Hub" },
  gallery: { label: "Gallery" },
  projects: { label: "Projects" },
  experience: { label: "Experience" },
  skills: { label: "Skills" },
  contact: { label: "Contact" },
} as const satisfies Record<string, { label: string }>;

export type ZoneId = keyof typeof ZONES;

export const ZONE_IDS = Object.keys(ZONES) as ZoneId[];
