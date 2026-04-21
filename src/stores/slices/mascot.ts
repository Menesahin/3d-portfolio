import type { StateCreator } from "zustand";
import type { EmoteIcon, MascotExpression, MascotGesture } from "@/types/tools";
import type { ZoneId } from "@/world/zones";

export type MascotState = "idle" | "moving" | "gesturing" | "expressing";

export type MascotSlice = {
  mascot: {
    state: MascotState;
    expression: MascotExpression;
    emote: EmoteIcon | null;
    gesture: MascotGesture | null;
    currentZone: ZoneId;
    targetZone: ZoneId | null;
  };
  setMascotState: (s: MascotState) => void;
  setExpression: (e: MascotExpression) => void;
  setEmote: (e: EmoteIcon | null) => void;
  setGesture: (g: MascotGesture | null) => void;
  moveMascotTo: (zone: ZoneId) => void;
  arriveAtZone: () => void;
};

export const createMascotSlice: StateCreator<MascotSlice, [], [], MascotSlice> = (set, get) => ({
  mascot: {
    state: "idle",
    expression: "idle",
    emote: null,
    gesture: null,
    currentZone: "hub",
    targetZone: null,
  },
  setMascotState: (s) => set((prev) => ({ mascot: { ...prev.mascot, state: s } })),
  setExpression: (e) => set((prev) => ({ mascot: { ...prev.mascot, expression: e } })),
  setEmote: (e) => set((prev) => ({ mascot: { ...prev.mascot, emote: e } })),
  setGesture: (g) => set((prev) => ({ mascot: { ...prev.mascot, gesture: g } })),
  moveMascotTo: (zone) =>
    set((prev) => ({
      mascot: { ...prev.mascot, state: "moving", targetZone: zone },
    })),
  arriveAtZone: () => {
    const { targetZone } = get().mascot;
    if (targetZone === null) return;
    set((prev) => ({
      mascot: {
        ...prev.mascot,
        state: "idle",
        currentZone: targetZone,
        targetZone: null,
      },
    }));
  },
});
