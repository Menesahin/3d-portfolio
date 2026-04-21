import type { StateCreator } from "zustand";

export type ThemeId = "dreamy" | "cyber";

const STORAGE_KEY = "enes.theme";

function readPersistedTheme(): ThemeId {
  if (typeof window === "undefined") return "dreamy";
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === "cyber" ? "cyber" : "dreamy";
}

function persistTheme(t: ThemeId): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, t);
    document.documentElement.classList.toggle("dark", t === "cyber");
  } catch {
    /* Safari private mode etc. — ignore */
  }
}

export type ThemeSlice = {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  toggleTheme: () => void;
};

export const createThemeSlice: StateCreator<ThemeSlice, [], [], ThemeSlice> = (set, get) => {
  const initial = readPersistedTheme();
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", initial === "cyber");
  }
  return {
    theme: initial,
    setTheme: (t) => {
      persistTheme(t);
      set({ theme: t });
    },
    toggleTheme: () => {
      const next: ThemeId = get().theme === "dreamy" ? "cyber" : "dreamy";
      persistTheme(next);
      set({ theme: next });
    },
  };
};
