import type { ThemeId } from "@/stores/slices/theme";

export type WorldTheme = {
  id: ThemeId;
  palette: {
    /** Top colour of the sky gradient (or solid background). */
    skyTop: string;
    /** Bottom colour of the sky gradient. */
    skyBottom: string;
    /** Primary ink color (plinth labels, etc.). */
    ink: string;
    /** Accent color used for highlights, emission. */
    accent: string;
    /** Secondary accent (cyber: magenta; dreamy: coral variant). */
    accent2: string;
    /** Island surface colour. */
    island: string;
    /** Plinth / exhibit surface colour. */
    plinth: string;
    /** Fog colour (matches sky bottom in dreamy). */
    fog: string;
  };
  lighting: {
    ambient: number;
    directional: number;
    hemisphere: number;
  };
  fog: {
    near: number;
    far: number;
  };
  particles: "pollen-dust" | "grid-sparks" | "none";
  postFX: {
    bloom: number;
    chromaticAberration: boolean;
    scanlines: boolean;
    vignette: number;
  };
  /** Exposure for the renderer tone mapper. */
  exposure: number;
};
