import { useState } from "react";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";
import { useStore } from "@/stores";
import type {
  CameraTarget,
  CompanyId,
  EmoteIcon,
  MascotGesture,
  ProjectId,
  SkillGroup,
} from "@/types/tools";
import { ZONE_IDS } from "@/world/zones";

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

const COMPANIES: CompanyId[] = ["nar-sistem", "formica", "ing-bank"];
const PROJECT_IDS: ProjectId[] = ["vocabuddy", "shotmock", "claude-voice", "thecupxi"];
const SKILL_GROUPS: SkillGroup[] = ["ai", "backend", "frontend", "devops"];

export function DebugPanel() {
  const t = useT();
  const [collapsed, setCollapsed] = useState(false);

  const setCameraTarget = useStore((s) => s.setCameraTarget);
  const moveMascotTo = useStore((s) => s.moveMascotTo);
  const setEmote = useStore((s) => s.setEmote);
  const setGesture = useStore((s) => s.setGesture);
  const showContent = useStore((s) => s.showContent);
  const hideContent = useStore((s) => s.hideContent);
  const resetWorld = useStore((s) => s.resetWorld);

  const targets: CameraTarget[] = ["overview", ...ZONE_IDS];

  return (
    <div className="holo-surface pointer-events-auto fixed right-3 top-16 z-30 w-72 rounded-xl p-3 shadow-[0_0_28px_-10px_var(--color-accent)]">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
          {t.debug.label}
        </h2>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="text-[11px] text-[var(--color-accent)]/60 hover:text-[var(--color-accent)]"
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

          <Section title={t.debug.hologram}>
            {COMPANIES.map((c) => (
              <Chip key={c} onClick={() => showContent({ kind: "experience", company: c })}>
                exp:{c}
              </Chip>
            ))}
            {PROJECT_IDS.map((p) => (
              <Chip key={p} onClick={() => showContent({ kind: "project", project: p })}>
                proj:{p}
              </Chip>
            ))}
            {SKILL_GROUPS.map((g) => (
              <Chip key={g} onClick={() => showContent({ kind: "skill_group", group: g })}>
                skill:{g}
              </Chip>
            ))}
            <Chip onClick={() => showContent({ kind: "contact_card" })}>contact</Chip>
            <Chip onClick={hideContent}>off</Chip>
          </Section>

          <button
            type="button"
            onClick={() => resetWorld()}
            className="mt-1 rounded-md border border-[var(--color-accent)]/30 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--color-accent)] transition hover:bg-[var(--color-accent)]/15"
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
      <p className="mb-1 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)]/60">
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
        "rounded-md border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/8 px-2 py-0.5 font-mono text-[10px] text-[var(--color-fg)] transition hover:border-[var(--color-accent)]/60 hover:bg-[var(--color-accent)]/20",
        className,
      )}
    >
      {children}
    </button>
  );
}
