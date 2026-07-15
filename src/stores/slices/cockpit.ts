import type { StateCreator } from "zustand";

export type CockpitLightingPreset = "standard" | "observation" | "cool" | "warm" | "alert" | "dim";
export type CockpitFlightMode = "park" | "cruise" | "warp";
export type CockpitViewMode = "interior" | "exterior";

export type CockpitSlice = {
  cockpit: {
    lighting: CockpitLightingPreset;
    flightMode: CockpitFlightMode;
    viewMode: CockpitViewMode;
    masterPower: boolean;
    systemCoverOpen: boolean;
    powerCoverOpen: boolean;
    activeControl: string | null;
    statusMessage: string;
  };
  setCockpitLighting: (preset: CockpitLightingPreset) => void;
  cycleCockpitLighting: () => void;
  setCockpitFlightMode: (mode: CockpitFlightMode) => void;
  cycleCockpitFlightMode: () => CockpitFlightMode;
  setCockpitViewMode: (mode: CockpitViewMode) => void;
  toggleCockpitViewMode: () => CockpitViewMode;
  toggleCockpitMasterPower: () => void;
  toggleCockpitSystemCover: () => void;
  toggleCockpitPowerCover: () => void;
  setActiveCockpitControl: (id: string | null) => void;
  setCockpitStatus: (message: string) => void;
};

const LIGHTING_SEQUENCE: CockpitLightingPreset[] = ["standard", "observation", "cool", "warm"];
const FLIGHT_SEQUENCE: CockpitFlightMode[] = ["park", "cruise", "warp"];

export const createCockpitSlice: StateCreator<CockpitSlice, [], [], CockpitSlice> = (set, get) => ({
  cockpit: {
    lighting: "standard",
    flightMode: "park",
    viewMode: "interior",
    masterPower: true,
    systemCoverOpen: false,
    powerCoverOpen: false,
    activeControl: null,
    statusMessage: "KEX-07 · SYSTEMS NOMINAL",
  },
  setCockpitLighting: (lighting) =>
    set((state) => ({
      cockpit: {
        ...state.cockpit,
        lighting,
        statusMessage: `CABIN LIGHT · ${lighting.toUpperCase()}`,
      },
    })),
  cycleCockpitLighting: () => {
    const current = get().cockpit.lighting;
    const index = LIGHTING_SEQUENCE.indexOf(current);
    const lighting =
      LIGHTING_SEQUENCE[(index + 1 + LIGHTING_SEQUENCE.length) % LIGHTING_SEQUENCE.length]!;
    set((state) => ({
      cockpit: {
        ...state.cockpit,
        lighting,
        statusMessage: `CABIN LIGHT · ${lighting.toUpperCase()}`,
      },
    }));
  },
  setCockpitFlightMode: (flightMode) =>
    set((state) => ({
      cockpit: {
        ...state.cockpit,
        flightMode,
        statusMessage: `FLIGHT MODE · ${flightMode.toUpperCase()}`,
      },
    })),
  cycleCockpitFlightMode: () => {
    const current = get().cockpit.flightMode;
    const index = FLIGHT_SEQUENCE.indexOf(current);
    const flightMode = FLIGHT_SEQUENCE[(index + 1) % FLIGHT_SEQUENCE.length]!;
    set((state) => ({
      cockpit: {
        ...state.cockpit,
        flightMode,
        statusMessage: `FLIGHT MODE · ${flightMode.toUpperCase()}`,
      },
    }));
    return flightMode;
  },
  setCockpitViewMode: (viewMode) =>
    set((state) => ({
      cockpit: {
        ...state.cockpit,
        viewMode,
        statusMessage: viewMode === "exterior" ? "OPTICS · EXTERIOR ORBIT" : "OPTICS · COCKPIT",
      },
    })),
  toggleCockpitViewMode: () => {
    const viewMode = get().cockpit.viewMode === "interior" ? "exterior" : "interior";
    set((state) => ({
      cockpit: {
        ...state.cockpit,
        viewMode,
        statusMessage: viewMode === "exterior" ? "OPTICS · EXTERIOR ORBIT" : "OPTICS · COCKPIT",
      },
    }));
    return viewMode;
  },
  toggleCockpitMasterPower: () =>
    set((state) => {
      const masterPower = !state.cockpit.masterPower;
      return {
        cockpit: {
          ...state.cockpit,
          masterPower,
          lighting: masterPower ? "standard" : "dim",
          statusMessage: masterPower ? "MAIN BUS · ONLINE" : "MAIN BUS · STANDBY",
        },
      };
    }),
  toggleCockpitSystemCover: () =>
    set((state) => ({
      cockpit: {
        ...state.cockpit,
        systemCoverOpen: !state.cockpit.systemCoverOpen,
        statusMessage: `RESET GUARD · ${state.cockpit.systemCoverOpen ? "CLOSED" : "OPEN"}`,
      },
    })),
  toggleCockpitPowerCover: () =>
    set((state) => ({
      cockpit: {
        ...state.cockpit,
        powerCoverOpen: !state.cockpit.powerCoverOpen,
        statusMessage: `POWER GUARD · ${state.cockpit.powerCoverOpen ? "CLOSED" : "OPEN"}`,
      },
    })),
  setActiveCockpitControl: (activeControl) =>
    set((state) => ({ cockpit: { ...state.cockpit, activeControl } })),
  setCockpitStatus: (statusMessage) =>
    set((state) => ({ cockpit: { ...state.cockpit, statusMessage } })),
});
