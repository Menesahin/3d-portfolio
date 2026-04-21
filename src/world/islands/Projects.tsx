import { Island } from "../Island";
import { Plinth } from "../Plinth";
import { ZONES } from "../zones";

export function Projects() {
  return (
    <Island id="projects" title="Projects" position={ZONES.projects.position} radius={2.9}>
      <Plinth position={[-1.75, 0, 0.25]} label="Vocabuddy" sublabel="iOS · AI" />
      <Plinth position={[0, 0, -0.55]} label="ShotMock" sublabel="SaaS · ASO" />
      <Plinth position={[1.75, 0, 0.25]} label="Claude Voice" sublabel="OSS · npm" />
    </Island>
  );
}
