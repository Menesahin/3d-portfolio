import type { WorldTheme } from "./types";

export const dreamy: WorldTheme = {
  id: "dreamy",
  palette: {
    skyTop: "#F5E6D8", // peach
    skyBottom: "#D8C8F0", // lavender
    ink: "#1A1A2E",
    accent: "#FF6B6B", // coral
    accent2: "#FFB38A",
    island: "#F4ECE1",
    plinth: "#E8DCC6",
    fog: "#E8DAD0",
  },
  lighting: {
    ambient: 0.55,
    directional: 1.1,
    hemisphere: 0.4,
  },
  fog: {
    near: 25,
    far: 70,
  },
  particles: "pollen-dust",
  postFX: {
    bloom: 0.6,
    chromaticAberration: false,
    scanlines: false,
    vignette: 0.55,
  },
  exposure: 1.1,
};
