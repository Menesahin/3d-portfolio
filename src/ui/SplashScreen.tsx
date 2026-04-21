import { useT } from "@/hooks/useT";

/** Fullscreen splash shown while the 3D chunk loads. */
export function SplashScreen() {
  const t = useT();
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-[var(--color-bg)] text-[var(--color-fg)]">
      <div className="relative h-10 w-10">
        <span className="absolute inset-0 animate-ping rounded-full bg-[var(--color-accent)] opacity-40" />
        <span className="absolute inset-1 rounded-full bg-[var(--color-accent)]" />
      </div>
      <p className="text-sm font-medium">{t.meta.name}</p>
      <p className="text-xs text-[var(--color-fg)]/50">{t.meta.role}</p>
    </div>
  );
}
