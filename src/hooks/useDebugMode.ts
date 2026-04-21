import { useMemo } from "react";

/** Returns true if the URL has `?debug=1` (or any truthy value). */
export function useDebugMode(): boolean {
  return useMemo(() => {
    if (typeof window === "undefined") return false;
    const p = new URLSearchParams(window.location.search);
    const v = p.get("debug");
    return v !== null && v !== "0" && v !== "false";
  }, []);
}
