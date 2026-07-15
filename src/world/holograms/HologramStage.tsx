import { useEffect, useState } from "react";
import { useStore } from "@/stores";
import type { ContentPanel } from "@/stores/slices/world";
import type { CompanyId, ProjectId, SkillGroup } from "@/types/tools";
import { ContactHologram } from "./ContactHologram";
import { ExperienceHologram } from "./ExperienceHologram";
import { ProjectsHologram } from "./ProjectsHologram";
import { SkillsHologram } from "./SkillsHologram";

const IDLE_INTENSITY = 0.4;
const ACTIVE_INTENSITY = 1.0;

// Defaults shown by each wall hologram while idle. Typed against the
// literal unions so a rename in `types/tools.ts` raises a compile error
// instead of silently breaking the idle-state render.
const DEFAULT_PROJECT: ProjectId = "vocabuddy";
const DEFAULT_COMPANY: CompanyId = "formica";
const DEFAULT_SKILL: SkillGroup = "ai";

/**
 * Wall holograms (Projects on back wall, Experience on left, Skills on
 * right) render permanently as ambient signage at IDLE_INTENSITY. The one
 * matching `activeContent.kind` bumps to ACTIVE_INTENSITY. Contact stays
 * a mascot-anchored Billboard, gated by `activeContent.kind ===
 * "contact_card"` and remembered across the fade-out so the panel
 * fades smoothly before unmounting.
 */
export function HologramStage() {
  const active = useStore((s) => s.world.activeContent);
  const hide = useStore((s) => s.hideContent);
  const setCameraTarget = useStore((s) => s.setCameraTarget);

  // Dismiss = hide content AND return camera to hub. The CameraRig's
  // active→cameraTarget effect intentionally doesn't fire on null, so
  // the dismiss path has to set the post-dismiss target explicitly.
  const dismiss = () => {
    hide();
    setCameraTarget("hub");
  };

  const projectsKey = active?.kind === "project" ? active.project : DEFAULT_PROJECT;
  const experienceKey = active?.kind === "experience" ? active.company : DEFAULT_COMPANY;
  const skillsKey = active?.kind === "skill_group" ? active.group : DEFAULT_SKILL;

  const projectsIntensity = active?.kind === "project" ? ACTIVE_INTENSITY : IDLE_INTENSITY;
  const experienceIntensity = active?.kind === "experience" ? ACTIVE_INTENSITY : IDLE_INTENSITY;
  const skillsIntensity = active?.kind === "skill_group" ? ACTIVE_INTENSITY : IDLE_INTENSITY;

  // Contact uses the "remember last shown" pattern so the panel can fade
  // out before unmounting.
  const [shownContact, setShownContact] = useState<ContentPanel | null>(
    active?.kind === "contact_card" ? active : null,
  );
  useEffect(() => {
    if (active?.kind === "contact_card") setShownContact(active);
  }, [active]);

  // Drop the remembered contact entry once enough time has passed for
  // its fade-out to finish. 600 ms covers the useHoloFade tween easily.
  useEffect(() => {
    if (active?.kind === "contact_card") return;
    if (!shownContact) return;
    const id = window.setTimeout(() => setShownContact(null), 600);
    return () => window.clearTimeout(id);
  }, [active, shownContact]);

  const contactVisible = active?.kind === "contact_card";

  return (
    <>
      <ProjectsHologram active={projectsKey} intensity={projectsIntensity} onDismiss={dismiss} />
      <ExperienceHologram
        active={experienceKey}
        intensity={experienceIntensity}
        onDismiss={dismiss}
      />
      <SkillsHologram active={skillsKey} intensity={skillsIntensity} onDismiss={dismiss} />
      {shownContact && <ContactHologram visible={contactVisible} onDismiss={dismiss} />}
    </>
  );
}
