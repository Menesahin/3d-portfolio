import type { StateCreator } from "zustand";
import type {
  CameraTarget,
  CameraZoom,
  CompanyId,
  EmoteIcon,
  MascotExpression,
  MascotGesture,
  ProjectId,
  SkillGroup,
  UiEvent,
} from "@/types/tools";
import type { ZoneId } from "@/world/zones";

export type ContentPanel =
  | { kind: "experience"; company: CompanyId }
  | { kind: "project"; project: ProjectId }
  | { kind: "skill_group"; group: SkillGroup }
  | { kind: "contact_card" };

export type WorldSlice = {
  world: {
    highlightedZone: ZoneId | null;
    activeHologram: { zone: ZoneId; contentId: string } | null;
    cameraTarget: CameraTarget;
    cameraZoom: CameraZoom;
    terminalActive: boolean;
    activeContent: ContentPanel | null;
  };
  highlightZone: (zone: ZoneId | null) => void;
  showHologram: (zone: ZoneId, contentId: string) => void;
  hideHologram: () => void;
  activateTerminal: (on: boolean) => void;
  setCameraTarget: (t: CameraTarget) => void;
  setCameraZoom: (z: CameraZoom) => void;
  showContent: (c: ContentPanel) => void;
  hideContent: () => void;
  resetWorld: () => void;
  /** Dispatch a typed LangGraph UiEvent to the right slice(s). */
  applyUiEvent: (event: UiEvent) => void;
};

const initialWorld: WorldSlice["world"] = {
  highlightedZone: null,
  activeHologram: null,
  cameraTarget: "overview",
  cameraZoom: "medium",
  terminalActive: false,
  activeContent: null,
};

export const createWorldSlice: StateCreator<WorldSlice, [], [], WorldSlice> = (set, get) => ({
  world: initialWorld,
  highlightZone: (zone) => set((prev) => ({ world: { ...prev.world, highlightedZone: zone } })),
  showHologram: (zone, contentId) =>
    set((prev) => ({ world: { ...prev.world, activeHologram: { zone, contentId } } })),
  hideHologram: () => set((prev) => ({ world: { ...prev.world, activeHologram: null } })),
  activateTerminal: (on) => set((prev) => ({ world: { ...prev.world, terminalActive: on } })),
  setCameraTarget: (t) => set((prev) => ({ world: { ...prev.world, cameraTarget: t } })),
  setCameraZoom: (z) => set((prev) => ({ world: { ...prev.world, cameraZoom: z } })),
  showContent: (c) => set((prev) => ({ world: { ...prev.world, activeContent: c } })),
  hideContent: () => set((prev) => ({ world: { ...prev.world, activeContent: null } })),
  resetWorld: () => set({ world: initialWorld }),

  /**
   * Single dispatcher that turns every LangGraph UiEvent into the right
   * slice mutation(s). Keeps the wiring in one place so frontend and
   * backend stay honest about the tool palette (§6).
   */
  applyUiEvent: (event) => {
    // Cross-slice cast: the combined root store exposes mascot-slice actions
    // too. We declare the needed shape here rather than importing MascotSlice
    // directly, to keep this slice file free of cross-dependencies.
    const store = get() as unknown as {
      setCameraTarget: (t: CameraTarget) => void;
      setCameraZoom: (z: CameraZoom) => void;
      highlightZone: (zone: ZoneId | null) => void;
      showHologram: (zone: ZoneId, contentId: string) => void;
      hideHologram: () => void;
      activateTerminal: (on: boolean) => void;
      resetWorld: () => void;
      showContent: (c: ContentPanel) => void;
      moveMascotTo: (zone: ZoneId) => void;
      setEmote: (icon: EmoteIcon | null) => void;
      setExpression: (face: MascotExpression) => void;
      setGesture: (gesture: MascotGesture | null) => void;
    };

    switch (event.kind) {
      case "camera.focus":
        store.setCameraTarget(event.target);
        return;
      case "camera.zoom":
        store.setCameraZoom(event.level);
        return;
      case "mascot.move":
        // "overview" is a camera target, not a mascot destination.
        if (event.zone !== "overview") store.moveMascotTo(event.zone as ZoneId);
        return;
      case "mascot.return_to_hub":
        store.moveMascotTo("hub");
        return;
      case "mascot.orbit":
        // v1: orbit reduces to a highlight + move; richer motion is a
        // post-launch enhancement. (See open items in plan §16.)
        store.highlightZone(event.target);
        store.moveMascotTo(event.target);
        return;
      case "mascot.dart":
        // v1: dart has no dedicated animation yet — we ignore it so the
        // scene stays coherent. Stub for future procedural impulse.
        return;
      case "mascot.gesture":
        store.setGesture(event.gesture);
        return;
      case "mascot.point_at":
        // Treated as a head-tilt gesture in v1 since we don't track
        // per-target orientation on the procedural mascot yet.
        store.setGesture("head_tilt");
        if (event.target !== "user" && event.target !== "hub") {
          store.highlightZone(event.target);
        }
        return;
      case "mascot.emote":
        store.setEmote(event.icon);
        return;
      case "mascot.expression":
        store.setExpression(event.face);
        return;
      case "world.highlight_zone":
        store.highlightZone(event.zone);
        return;
      case "world.show_hologram":
        store.showHologram(event.zone, event.contentId);
        return;
      case "world.activate_terminal":
        store.activateTerminal(true);
        return;
      case "world.reset":
        store.resetWorld();
        return;
      case "content.experience":
        store.showContent({ kind: "experience", company: event.company });
        return;
      case "content.project":
        store.showContent({ kind: "project", project: event.project });
        return;
      case "content.skill_group":
        store.showContent({ kind: "skill_group", group: event.group });
        return;
      case "content.contact_card":
        store.showContent({ kind: "contact_card" });
        return;
    }
  },
});
