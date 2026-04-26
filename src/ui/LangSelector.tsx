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
      className="holo-chip flex items-center gap-0.5 rounded-full p-1 text-[11px] font-mono"
    >
      {(["en", "tr"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          className={cn(
            "rounded-full px-2.5 py-0.5 uppercase tracking-wider transition",
            lang === code
              ? "bg-[var(--color-accent)]/25 text-[var(--color-accent)]"
              : "text-[var(--color-fg)]/55 hover:text-[var(--color-fg)]",
          )}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
