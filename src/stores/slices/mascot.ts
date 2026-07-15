import type { StateCreator } from "zustand";
import type { DartDirection, EmoteIcon, MascotExpression, MascotGesture } from "@/types/tools";
import type { ZoneId } from "@/world/zones";

export type MascotState = "idle" | "moving" | "gesturing" | "expressing";

export type MascotSpecialMotion =
  | { kind: "orbit"; target: ZoneId; revolutions: number; startedAt: number }
  | { kind: "dart"; direction: DartDirection; startedAt: number };

export type MascotSlice = {
  mascot: {
    state: MascotState;
    expression: MascotExpression;
    emote: EmoteIcon | null;
    gesture: MascotGesture | null;
    currentZone: ZoneId;
    targetZone: ZoneId | null;
    specialMotion: MascotSpecialMotion | null;
    pointTarget: { target: ZoneId | "user"; startedAt: number } | null;
  };
  setMascotState: (s: MascotState) => void;
  setExpression: (e: MascotExpression) => void;
  setEmote: (e: EmoteIcon | null) => void;
  setGesture: (g: MascotGesture | null) => void;
  moveMascotTo: (zone: ZoneId) => void;
  arriveAtZone: () => void;
  startMascotOrbit: (target: ZoneId, revolutions: number) => void;
  startMascotDart: (direction: DartDirection) => void;
  finishMascotSpecialMotion: () => void;
  pointMascotAt: (target: ZoneId | "user") => void;
  clearMascotPoint: () => void;
};

export const createMascotSlice: StateCreator<MascotSlice, [], [], MascotSlice> = (set, get) => ({
  mascot: {
    state: "idle",
    expression: "idle",
    emote: null,
    gesture: null,
    currentZone: "hub",
    targetZone: null,
    specialMotion: null,
    pointTarget: null,
  },
  setMascotState: (s) => set((prev) => ({ mascot: { ...prev.mascot, state: s } })),
  setExpression: (e) => set((prev) => ({ mascot: { ...prev.mascot, expression: e } })),
  setEmote: (e) => set((prev) => ({ mascot: { ...prev.mascot, emote: e } })),
  setGesture: (g) => set((prev) => ({ mascot: { ...prev.mascot, gesture: g } })),
  moveMascotTo: (zone) =>
    set((prev) => ({
      mascot: { ...prev.mascot, state: "moving", targetZone: zone, specialMotion: null },
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
  startMascotOrbit: (target, revolutions) =>
    set((prev) => ({
      mascot: {
        ...prev.mascot,
        state: "moving",
        targetZone: null,
        specialMotion: {
          kind: "orbit",
          target,
          revolutions: Math.max(1, Math.min(3, revolutions)),
          startedAt: performance.now(),
        },
      },
    })),
  startMascotDart: (direction) =>
    set((prev) => ({
      mascot: {
        ...prev.mascot,
        state: "moving",
        targetZone: null,
        specialMotion: { kind: "dart", direction, startedAt: performance.now() },
      },
    })),
  finishMascotSpecialMotion: () =>
    set((prev) => ({
      mascot: { ...prev.mascot, state: "idle", specialMotion: null },
    })),
  pointMascotAt: (target) =>
    set((prev) => ({
      mascot: {
        ...prev.mascot,
        gesture: "point",
        pointTarget: { target, startedAt: performance.now() },
      },
    })),
  clearMascotPoint: () => set((prev) => ({ mascot: { ...prev.mascot, pointTarget: null } })),
});
