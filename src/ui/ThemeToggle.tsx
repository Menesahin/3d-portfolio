import { useT } from "@/hooks/useT";
import { useStore } from "@/stores";

export function ThemeToggle() {
  const theme = useStore((s) => s.theme);
  const toggle = useStore((s) => s.toggleTheme);
  const t = useT();

  return (
    <button
      type="button"
      onClick={toggle}
      title={t.theme.label}
      aria-label={t.theme.label}
      className="rounded-full border border-[var(--color-fg)]/10 bg-[var(--color-bg)]/80 px-3 py-1.5 text-xs font-medium text-[var(--color-fg)] backdrop-blur-md shadow-sm transition hover:bg-[var(--color-bg)]"
    >
      {theme === "dreamy" ? `${t.theme.dreamy} →` : `${t.theme.cyber} →`}{" "}
      {theme === "dreamy" ? t.theme.cyber : t.theme.dreamy}
    </button>
  );
}
