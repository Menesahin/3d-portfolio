import { useState } from "react";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";
import { useStore } from "@/stores";
import type { CameraTarget, EmoteIcon, MascotGesture } from "@/types/tools";
import { ZONE_IDS, type ZoneId } from "@/world/zones";

/**
 * Dev-only panel for driving the world manually before the AI is wired up.
 * Enable via `?debug=1`. Every button fires the same store mutations the
 * orchestrator will fire in Phase 3 when the LLM emits tool events.
 */

const EMOTES: EmoteIcon[] = [
  "heart",
  "question",
  "lightbulb",
  "sparkle",
  "zzz",
  "exclamation",
  "star",
  "note",
];

const GESTURES: MascotGesture[] = [
  "wave",
  "point",
  "thumbs_up",
  "head_tilt",
  "bow",
  "dance",
  "flip",
  "spin_happy",
  "shy",
];

const HOLOGRAM_CONTENT_MAP: Record<ZoneId, string | null> = {
  hub: null,
  experience: "formica",
  projects: "vocabuddy",
  skills: null,
  gallery: null,
  contact: null,
};

export function DebugPanel() {
  const t = useT();
  const [collapsed, setCollapsed] = useState(false);

  const setCameraTarget = useStore((s) => s.setCameraTarget);
  const moveMascotTo = useStore((s) => s.moveMascotTo);
  const setEmote = useStore((s) => s.setEmote);
  const setGesture = useStore((s) => s.setGesture);
  const highlightZone = useStore((s) => s.highlightZone);
  const showHologram = useStore((s) => s.showHologram);
  const hideHologram = useStore((s) => s.hideHologram);
  const activateTerminal = useStore((s) => s.activateTerminal);
  const resetWorld = useStore((s) => s.resetWorld);

  const targets: CameraTarget[] = ["overview", ...ZONE_IDS];

  return (
    <div className="pointer-events-auto fixed right-3 top-16 z-30 w-72 rounded-xl border border-[var(--color-fg)]/10 bg-[var(--color-bg)]/90 p-3 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-fg)]/70">
          {t.debug.label}
        </h2>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="text-xs text-[var(--color-fg)]/50 hover:text-[var(--color-fg)]"
        >
          {collapsed ? "▸" : "▾"}
        </button>
      </div>

      {!collapsed && (
        <div className="mt-3 flex flex-col gap-3 text-[11px]">
          <Section title={t.debug.cameraTo}>
            {targets.map((target) => (
              <Chip key={target} onClick={() => setCameraTarget(target)}>
                {target}
              </Chip>
            ))}
          </Section>

          <Section title={t.debug.moveTo}>
            {ZONE_IDS.map((z) => (
              <Chip key={z} onClick={() => moveMascotTo(z)}>
                {z}
              </Chip>
            ))}
          </Section>

          <Section title={t.debug.emote}>
            {EMOTES.map((e) => (
              <Chip key={e} onClick={() => setEmote(e)}>
                {e}
              </Chip>
            ))}
          </Section>

          <Section title={t.debug.gesture}>
            {GESTURES.map((g) => (
              <Chip key={g} onClick={() => setGesture(g)}>
                {g}
              </Chip>
            ))}
          </Section>

          <Section title={t.debug.highlight}>
            {ZONE_IDS.map((z) => (
              <Chip key={z} onClick={() => highlightZone(z)}>
                {z}
              </Chip>
            ))}
            <Chip onClick={() => highlightZone(null)}>off</Chip>
          </Section>

          <Section title={t.debug.hologram}>
            {ZONE_IDS.map((z) => {
              const contentId = HOLOGRAM_CONTENT_MAP[z];
              if (!contentId) return null;
              return (
                <Chip key={z} onClick={() => showHologram(z, contentId)}>
                  {z}:{contentId}
                </Chip>
              );
            })}
            <Chip onClick={hideHologram}>off</Chip>
          </Section>

          <Section title="terminal">
            <Chip onClick={() => activateTerminal(true)}>on</Chip>
            <Chip onClick={() => activateTerminal(false)}>off</Chip>
          </Section>

          <button
            type="button"
            onClick={() => resetWorld()}
            className="mt-1 rounded-md bg-[var(--color-fg)]/10 py-1.5 text-[11px] font-medium text-[var(--color-fg)] hover:bg-[var(--color-fg)]/20"
          >
            {t.debug.reset}
          </button>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg)]/50">
        {title}
      </p>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function Chip({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full bg-[var(--color-fg)]/10 px-2 py-0.5 text-[10px] text-[var(--color-fg)] transition hover:bg-[var(--color-fg)]/20",
        className,
      )}
    >
      {children}
    </button>
  );
}
