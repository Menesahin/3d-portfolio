import { Island } from "../Island";
import { Plinth } from "../Plinth";
import { ZONES } from "../zones";

export function Experience() {
  return (
    <Island id="experience" title="Experience" position={ZONES.experience.position} radius={2.9}>
      <Plinth position={[-1.75, 0, 0.25]} label="Nar Sistem" sublabel="2025 → now" />
      <Plinth position={[0, 0, -0.55]} label="Formica AI" sublabel="2022–2025" />
      <Plinth position={[1.75, 0, 0.25]} label="ING Bank" sublabel="2022" />
    </Island>
  );
}
