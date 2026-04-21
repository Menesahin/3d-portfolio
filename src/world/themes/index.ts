import type { ThemeId } from "@/stores/slices/theme";
import { cyber } from "./cyber";
import { dreamy } from "./dreamy";
import type { WorldTheme } from "./types";

export type { WorldTheme } from "./types";

export const themes: Record<ThemeId, WorldTheme> = {
  dreamy,
  cyber,
};

export { dreamy, cyber };
