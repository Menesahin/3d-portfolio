import { useCallback, useEffect, useState } from "react";

/**
 * First-visit gate. Reads `localStorage["enes-portfolio-seen"]` — returns
 * `true` for the very first render on the user's first visit, `false`
 * thereafter. Call `dismiss()` when the onboarding is considered handled
 * so future loads skip it.
 *
 * SSR-safe: on first render `isFirstVisit` is always `true`; the
 * localStorage read happens in a layout effect so it never throws on
 * a server render.
 */
const STORAGE_KEY = "enes-portfolio-seen";

export function useFirstVisit(): { isFirstVisit: boolean; dismiss: () => void } {
  const [isFirstVisit, setIsFirstVisit] = useState(true);

  useEffect(() => {
    try {
      const seen = window.localStorage.getItem(STORAGE_KEY);
      if (seen === "1") setIsFirstVisit(false);
    } catch {
      // privacy mode / quota — treat as first visit (harmless)
    }
  }, []);

  const dismiss = useCallback(() => {
    setIsFirstVisit(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore — we still dismiss in-memory for this session
    }
  }, []);

  return { isFirstVisit, dismiss };
}
