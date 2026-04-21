import type { StateCreator } from "zustand";
import type { CameraTarget, CameraZoom } from "@/types/tools";
import type { ZoneId } from "@/world/zones";

export type WorldSlice = {
  world: {
    highlightedZone: ZoneId | null;
    activeHologram: { zone: ZoneId; contentId: string } | null;
    cameraTarget: CameraTarget;
    cameraZoom: CameraZoom;
    terminalActive: boolean;
  };
  highlightZone: (zone: ZoneId | null) => void;
  showHologram: (zone: ZoneId, contentId: string) => void;
  hideHologram: () => void;
  activateTerminal: (on: boolean) => void;
  setCameraTarget: (t: CameraTarget) => void;
  setCameraZoom: (z: CameraZoom) => void;
  resetWorld: () => void;
};

const initialWorld: WorldSlice["world"] = {
  highlightedZone: null,
  activeHologram: null,
  cameraTarget: "overview",
  cameraZoom: "medium",
  terminalActive: false,
};

export const createWorldSlice: StateCreator<WorldSlice, [], [], WorldSlice> = (set) => ({
  world: initialWorld,
  highlightZone: (zone) => set((prev) => ({ world: { ...prev.world, highlightedZone: zone } })),
  showHologram: (zone, contentId) =>
    set((prev) => ({ world: { ...prev.world, activeHologram: { zone, contentId } } })),
  hideHologram: () => set((prev) => ({ world: { ...prev.world, activeHologram: null } })),
  activateTerminal: (on) => set((prev) => ({ world: { ...prev.world, terminalActive: on } })),
  setCameraTarget: (t) => set((prev) => ({ world: { ...prev.world, cameraTarget: t } })),
  setCameraZoom: (z) => set((prev) => ({ world: { ...prev.world, cameraZoom: z } })),
  resetWorld: () => set({ world: initialWorld }),
});
