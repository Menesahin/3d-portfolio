import type { StateCreator } from "zustand";

/**
 * Cyber-only. The site is permanently dark/cyber; the slice is a typed
 * constant so existing consumers (`useStore((s) => s.theme)`) compile
 * without churn. No `setTheme`/`toggleTheme` because there's nothing
 * to switch to.
 */
export type ThemeId = "cyber";

export type ThemeSlice = {
  theme: ThemeId;
};

export const createThemeSlice: StateCreator<ThemeSlice, [], [], ThemeSlice> = () => {
  if (typeof document !== "undefined") {
    document.documentElement.classList.add("dark");
  }
  return { theme: "cyber" };
};
