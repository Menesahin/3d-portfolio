import { useStore } from "@/stores";
import { themes, type WorldTheme } from "@/world/themes";

/** Returns the currently active `WorldTheme` config driven by Zustand `theme`. */
export function useActiveTheme(): WorldTheme {
  const id = useStore((s) => s.theme);
  return themes[id];
}
