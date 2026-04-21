import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";
import { useStore } from "@/stores";

export function LangSelector() {
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);
  const t = useT();

  return (
    <div
      role="group"
      aria-label={t.lang.label}
      className="flex items-center gap-0.5 rounded-full border border-[var(--color-fg)]/10 bg-[var(--color-bg)]/80 p-1 text-xs backdrop-blur-md shadow-sm"
    >
      {(["en", "tr"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          className={cn(
            "rounded-full px-3 py-1 font-medium transition",
            lang === code
              ? "bg-[var(--color-fg)] text-[var(--color-bg)]"
              : "text-[var(--color-fg)]/60 hover:text-[var(--color-fg)]",
          )}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
