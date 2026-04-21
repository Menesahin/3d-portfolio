import { useStore } from "@/stores";
import type { CompanyId } from "@/types/tools";
import { Island } from "../Island";
import { Plinth } from "../Plinth";
import { GlbProp } from "../props/GlbProp";
import { IslandDecor } from "../props/IslandDecor";
import { ExperienceArches } from "../props/ZoneStaging";
import { ZONES } from "../zones";

const COMPANIES: ReadonlyArray<{
  id: CompanyId;
  pos: [number, number, number];
  label: string;
  sublabel: string;
}> = [
  { id: "nar-sistem", pos: [-1.75, 0, 0.25], label: "Nar Sistem", sublabel: "2025 → now" },
  { id: "formica", pos: [0, 0, -0.55], label: "Formica AI", sublabel: "2022–2025" },
  { id: "ing-bank", pos: [1.75, 0, 0.25], label: "ING Bank", sublabel: "2022" },
];

export function Experience() {
  const activate = (company: CompanyId) => {
    const apply = useStore.getState().applyUiEvent;
    apply({ kind: "camera.focus", target: "experience" });
    apply({ kind: "mascot.move", zone: "experience" });
    apply({ kind: "world.show_hologram", zone: "experience", contentId: company });
    apply({ kind: "content.experience", company });
  };

  return (
    <Island id="experience" title="Experience" position={ZONES.experience.position} radius={2.9}>
      <ExperienceArches />
      <IslandDecor variant="lantern" position={[-2.3, 0.25, 1.5]} scale={1.2} />
      <IslandDecor variant="lantern" position={[2.3, 0.25, 1.5]} scale={1.2} />
      {/* Anchoring weight — a real stone at the back corners. */}
      <GlbProp
        url="/models/props/kenney/rock_largeA.glb"
        position={[-2.4, 0.25, -1.0]}
        scale={0.7}
      />
      <GlbProp
        url="/models/props/kenney/rock_largeA.glb"
        position={[2.4, 0.25, -1.0]}
        scale={0.7}
        rotation={[0, 1.2, 0]}
      />
      {COMPANIES.map((c) => (
        <Plinth
          key={c.id}
          position={c.pos}
          label={c.label}
          sublabel={c.sublabel}
          onActivate={() => activate(c.id)}
        />
      ))}
    </Island>
  );
}
