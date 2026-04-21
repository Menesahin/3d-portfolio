import { useState } from "react";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";
import { useStore } from "@/stores";

/**
 * Chat dock overlay. Fixed bottom-center; collapses into a pill when
 * closed. In Phase 1 the input is disabled and shows a "coming soon"
 * placeholder — the network layer is wired in Phase 3.
 */
export function ChatDock() {
  const t = useT();
  const isOpen = useStore((s) => s.chat.isOpen);
  const toggle = useStore((s) => s.toggleChat);
  const [draft, setDraft] = useState("");

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 flex justify-center z-20">
      <div
        className={cn(
          "pointer-events-auto flex w-[min(560px,92vw)] flex-col overflow-hidden rounded-2xl border border-[var(--color-fg)]/10 bg-[var(--color-bg)]/85 shadow-xl backdrop-blur-xl transition-[max-height] duration-300",
          isOpen ? "max-h-[340px]" : "max-h-[54px]",
        )}
      >
        <button
          type="button"
          onClick={toggle}
          aria-expanded={isOpen}
          className="flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-[var(--color-fg)]"
        >
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-2 w-2 rounded-full bg-[var(--color-accent)]"
            />
            {t.hero.greeting}
          </span>
          <span className="text-xs text-[var(--color-fg)]/50">{isOpen ? "▼" : "▲"}</span>
        </button>

        {isOpen && (
          <div className="flex flex-col gap-2 px-4 pb-4">
            <div className="min-h-[140px] rounded-xl bg-[var(--color-fg)]/5 p-3 text-sm text-[var(--color-fg)]/80">
              {t.chat.comingSoon}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                disabled
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t.chat.disabled}
                className="flex-1 rounded-full border border-[var(--color-fg)]/15 bg-[var(--color-bg)]/70 px-4 py-2 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg)]/40 outline-none disabled:cursor-not-allowed disabled:opacity-70"
              />
              <button
                type="button"
                disabled
                className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t.chat.send}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
