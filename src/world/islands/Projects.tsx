import { useStore } from "@/stores";
import type { ProjectId } from "@/types/tools";
import { Island } from "../Island";
import { Plinth } from "../Plinth";
import { IslandDecor } from "../props/IslandDecor";
import { ZONES } from "../zones";

const PROJECT_LIST: ReadonlyArray<{
  id: ProjectId;
  pos: [number, number, number];
  label: string;
  sublabel: string;
}> = [
  { id: "vocabuddy", pos: [-1.75, 0, 0.25], label: "Vocabuddy", sublabel: "iOS · AI" },
  { id: "shotmock", pos: [0, 0, -0.55], label: "ShotMock", sublabel: "SaaS · ASO" },
  { id: "claude-voice", pos: [1.75, 0, 0.25], label: "Claude Voice", sublabel: "OSS · npm" },
];

export function Projects() {
  const activate = (project: ProjectId) => {
    const apply = useStore.getState().applyUiEvent;
    apply({ kind: "camera.focus", target: "projects" });
    apply({ kind: "mascot.move", zone: "projects" });
    apply({ kind: "mascot.emote", icon: "sparkle" });
    apply({ kind: "content.project", project });
  };

  return (
    <Island id="projects" title="Projects" position={ZONES.projects.position} radius={2.9}>
      <IslandDecor
        variant="monitor"
        position={[-2.3, 0.25, 1.35]}
        rotation={[0, 0.4, 0]}
        scale={1.1}
      />
      <IslandDecor
        variant="monitor"
        position={[2.3, 0.25, 1.35]}
        rotation={[0, -0.4, 0]}
        scale={1.1}
      />
      {PROJECT_LIST.map((p) => (
        <Plinth
          key={p.id}
          position={p.pos}
          label={p.label}
          sublabel={p.sublabel}
          onActivate={() => activate(p.id)}
        />
      ))}
    </Island>
  );
}
