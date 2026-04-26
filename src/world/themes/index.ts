import type { ThemeId } from "@/stores/slices/theme";
import { cyber } from "./cyber";
import type { WorldTheme } from "./types";

export type { WorldTheme } from "./types";

export const themes: Record<ThemeId, WorldTheme> = {
  cyber,
};

export { cyber };
