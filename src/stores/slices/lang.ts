import type { StateCreator } from "zustand";

export type Lang = "en" | "tr";

const STORAGE_KEY = "enes.lang";

function readPersistedLang(): Lang {
  if (typeof window === "undefined") return "en";
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === "en" || raw === "tr") return raw;
  // Rough auto-detect from browser: Turkish if navigator reports tr*
  const nav = window.navigator.language?.toLowerCase() ?? "";
  return nav.startsWith("tr") ? "tr" : "en";
}

export type LangSlice = {
  lang: Lang;
  setLang: (l: Lang) => void;
};

export const createLangSlice: StateCreator<LangSlice, [], [], LangSlice> = (set) => ({
  lang: readPersistedLang(),
  setLang: (l) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
      document.documentElement.setAttribute("lang", l);
    } catch {
      /* ignore */
    }
    set({ lang: l });
  },
});
