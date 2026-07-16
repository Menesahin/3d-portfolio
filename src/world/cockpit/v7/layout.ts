import type { CameraTarget } from "@/types/tools";
import type { ZoneId } from "@/world/zones";
import generatedLayout from "./cockpit-v7-layout.json";

export type CockpitShotTable = Record<
  CameraTarget,
  { pos: [number, number, number]; target: [number, number, number] }
>;

export type CockpitV7ControlKind = "button" | "rocker" | "cover" | "guarded" | "dial" | "lever";

export type CockpitV7ControlDefinition = {
  node: string;
  label: string;
  action: string;
  kind: CockpitV7ControlKind;
  position: [number, number, number];
  hitSize: [number, number, number];
};

type ScreenDefinition = {
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number];
};

type CockpitV7Manifest = {
  version: 7;
  assetName: string;
  assets: {
    shell: string;
    controls: string;
    exterior: string;
    mascot: string;
  };
  sockets: Record<ZoneId, [number, number, number]>;
  screens: Record<"projects" | "experience" | "skills" | "contact", ScreenDefinition>;
  controls: Record<string, CockpitV7ControlDefinition>;
  observationAperture: [number, number, number];
  earthAnchor: [number, number, number];
  shots: {
    desktop: Record<
      CameraTarget,
      { position: [number, number, number]; target: [number, number, number] }
    >;
    mobile: Record<
      CameraTarget,
      { position: [number, number, number]; target: [number, number, number] }
    >;
  };
};

export const COCKPIT_V7_LAYOUT = generatedLayout as unknown as CockpitV7Manifest;
export const COCKPIT_V7_ASSETS = COCKPIT_V7_LAYOUT.assets;
export const COCKPIT_V7_CONTROLS = COCKPIT_V7_LAYOUT.controls;

function shotTable(shots: CockpitV7Manifest["shots"]["desktop"]): CockpitShotTable {
  return Object.fromEntries(
    Object.entries(shots).map(([key, shot]) => [
      key,
      { pos: [...shot.position], target: [...shot.target] },
    ]),
  ) as CockpitShotTable;
}

export const COCKPIT_V7_SHOTS = shotTable(COCKPIT_V7_LAYOUT.shots.desktop);
export const COCKPIT_V7_MOBILE_SHOTS = shotTable(COCKPIT_V7_LAYOUT.shots.mobile);

export const COCKPIT_V7_MASCOT_POSITIONS: Record<ZoneId, readonly [number, number, number]> = {
  hub: [0, 0, 3.4],
  gallery: [3.45, 0.2, -5.0],
  projects: [3.45, 0.2, -5.0],
  experience: [-5.55, 0.9, 1.45],
  skills: [5.55, 0.9, -1.45],
  contact: [3.55, 0.5, 5.65],
};

export const COCKPIT_V7_MASCOT_FACE_TARGETS: Record<ZoneId, readonly [number, number, number]> = {
  hub: [0, 1.5, 12],
  gallery: [0, 1.4, 7.4],
  projects: [0, 1.4, 7.4],
  experience: [3.8, 1.4, 1.6],
  skills: [-3.8, 1.4, 1.6],
  contact: [1.2, 1.5, 10.4],
};

export const COCKPIT_V7_WALL_SLOTS = {
  projects: COCKPIT_V7_LAYOUT.screens.projects,
  experience: COCKPIT_V7_LAYOUT.screens.experience,
  skills: COCKPIT_V7_LAYOUT.screens.skills,
} as const;
