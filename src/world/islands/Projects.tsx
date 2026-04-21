import { Island } from "../Island";
import { Plinth } from "../Plinth";
import { ZONES } from "../zones";

export function Projects() {
  return (
    <Island id="projects" position={ZONES.projects.position} radius={2.6}>
      <Plinth position={[-1.2, 0, 0]} label="Vocabuddy" sublabel="iOS · AI" />
      <Plinth position={[0, 0, -0.2]} label="ShotMock" sublabel="SaaS · ASO" />
      <Plinth position={[1.2, 0, 0]} label="Claude Voice" sublabel="OSS · npm" />
    </Island>
  );
}
