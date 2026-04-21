import { Island } from "../Island";
import { Plinth } from "../Plinth";
import { ZONES } from "../zones";

export function Experience() {
  return (
    <Island id="experience" position={ZONES.experience.position} radius={2.6}>
      <Plinth position={[-1.2, 0, 0]} label="Nar Sistem" sublabel="2025 → now" />
      <Plinth position={[0, 0, -0.2]} label="Formica AI" sublabel="2022–2025" />
      <Plinth position={[1.2, 0, 0]} label="ING Bank" sublabel="2022" />
    </Island>
  );
}
