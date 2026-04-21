import type { WorldTheme } from "./types";

export const cyber: WorldTheme = {
  id: "cyber",
  palette: {
    skyTop: "#05060F",
    skyBottom: "#0A0B14",
    ink: "#F0F0FF",
    accent: "#00F0FF", // cyan
    accent2: "#FF2EC4", // magenta
    island: "#13141F",
    plinth: "#1E2332",
    fog: "#040513",
  },
  lighting: {
    ambient: 0.18,
    directional: 0.6,
    hemisphere: 0.15,
  },
  fog: {
    near: 15,
    far: 60,
  },
  particles: "grid-sparks",
  postFX: {
    bloom: 0.9,
    chromaticAberration: true,
    scanlines: true,
    vignette: 0.75,
  },
  exposure: 0.9,
};
