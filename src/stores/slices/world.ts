import type { StateCreator } from "zustand";
import type { CameraTarget, CameraZoom, CompanyId, ProjectId, SkillGroup } from "@/types/tools";

export type ContentPanel =
  | { kind: "experience"; company: CompanyId }
  | { kind: "project"; project: ProjectId }
  | { kind: "skill_group"; group: SkillGroup }
  | { kind: "contact_card" };

export type WorldSlice = {
  world: {
    cameraTarget: CameraTarget;
    cameraZoom: CameraZoom;
    activeContent: ContentPanel | null;
  };
  setCameraTarget: (t: CameraTarget) => void;
  setCameraZoom: (z: CameraZoom) => void;
  showContent: (c: ContentPanel) => void;
  hideContent: () => void;
  resetWorld: () => void;
};

const initialWorld: WorldSlice["world"] = {
  cameraTarget: "overview",
  cameraZoom: "medium",
  activeContent: null,
};

export const createWorldSlice: StateCreator<WorldSlice, [], [], WorldSlice> = (set) => ({
  world: initialWorld,
  setCameraTarget: (t) => set((prev) => ({ world: { ...prev.world, cameraTarget: t } })),
  setCameraZoom: (z) => set((prev) => ({ world: { ...prev.world, cameraZoom: z } })),
  showContent: (c) => set((prev) => ({ world: { ...prev.world, activeContent: c } })),
  hideContent: () => set((prev) => ({ world: { ...prev.world, activeContent: null } })),
  resetWorld: () => set({ world: initialWorld }),
});
