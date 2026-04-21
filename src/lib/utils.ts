/**
 * Lightweight className combiner.
 * Equivalent to shadcn's `cn()` but without the `tailwind-merge` dep —
 * we don't have conflicting-class problems in this project's scope.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Read a CSS custom property off `<html>`. Used by R3F materials to match
 *  2D design tokens without drift. */
export function readCssVar(name: string): string {
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
