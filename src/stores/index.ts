import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { createDispatcherSlice, type DispatcherSlice } from "./dispatcher";
import { type ChatSlice, createChatSlice } from "./slices/chat";
import { type CockpitSlice, createCockpitSlice } from "./slices/cockpit";
import { createLangSlice, type LangSlice } from "./slices/lang";
import { createMascotSlice, type MascotSlice } from "./slices/mascot";
import { createThemeSlice, type ThemeSlice } from "./slices/theme";
import { createWorldSlice, type WorldSlice } from "./slices/world";

export type AppState = ThemeSlice &
  LangSlice &
  MascotSlice &
  CockpitSlice &
  WorldSlice &
  ChatSlice &
  DispatcherSlice;

export const useStore = create<AppState>()(
  subscribeWithSelector((...a) => ({
    ...createThemeSlice(...a),
    ...createLangSlice(...a),
    ...createMascotSlice(...a),
    ...createCockpitSlice(...a),
    ...createWorldSlice(...a),
    ...createChatSlice(...a),
    ...createDispatcherSlice(...a),
  })),
);

/**
 * Transient read helper. Use inside R3F `useFrame` / imperative code where
 * you do NOT want to trigger a React re-render on every store change.
 *
 *   const targetZoneRef = useStoreRef((s) => s.mascot.targetZone);
 *   useFrame(() => { if (targetZoneRef.current) ... });
 */
export { useStoreRef } from "./useStoreRef";
