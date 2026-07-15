import { playCockpitSound } from "@/audio/cockpitAudio";
import { useStore } from "@/stores";

/** Guaranteed return path between the physical flight deck and orbital hull camera. */
export function CockpitViewToggle() {
  const mode = useStore((state) => state.cockpit.viewMode);
  const applyUiEvent = useStore((state) => state.applyUiEvent);
  const exterior = mode === "exterior";

  return (
    <button
      type="button"
      aria-label={exterior ? "Return to cockpit interior" : "Show spacecraft exterior"}
      aria-pressed={exterior}
      onClick={() => {
        playCockpitSound("console");
        applyUiEvent({ kind: "cockpit.view", mode: exterior ? "interior" : "exterior" });
      }}
      className="holo-chip rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent)] transition hover:bg-[var(--color-accent)]/10 max-[480px]:px-2.5"
    >
      <span className="max-[480px]:hidden">{exterior ? "INT VIEW" : "EXT VIEW"}</span>
      <span aria-hidden className="hidden text-[13px] max-[480px]:inline">
        {exterior ? "⌂" : "◇"}
      </span>
    </button>
  );
}
