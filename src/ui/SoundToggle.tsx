import { useEffect, useRef, useState } from "react";
import {
  onCockpitSoundPreference,
  playCockpitSound,
  readCockpitSoundPreference,
  setCockpitSoundPreference,
} from "@/audio/cockpitAudio";
import { useStore } from "@/stores";
import { onCockpitEffect } from "@/world/cockpit/cockpitEvents";

export function SoundToggle() {
  const [enabled, setEnabled] = useState(readCockpitSoundPreference);
  const activeContent = useStore((state) => state.world.activeContent);
  const previousContent = useRef(activeContent);

  useEffect(() => onCockpitSoundPreference(setEnabled), []);

  useEffect(
    () =>
      onCockpitEffect((effect) => {
        playCockpitSound(effect === "warp" ? "warp" : "dance");
      }),
    [],
  );

  useEffect(() => {
    if (activeContent && activeContent !== previousContent.current) playCockpitSound("console");
    previousContent.current = activeContent;
  }, [activeContent]);

  return (
    <button
      type="button"
      aria-label={enabled ? "Disable cockpit sound effects" : "Enable cockpit sound effects"}
      aria-pressed={enabled}
      onClick={() => {
        const next = !enabled;
        setEnabled(next);
        void setCockpitSoundPreference(next).then(() => {
          if (next) playCockpitSound("console");
        });
      }}
      className="holo-chip rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent)] transition hover:bg-[var(--color-accent)]/10 max-[480px]:px-2.5"
    >
      <span className="max-[480px]:hidden">SFX {enabled ? "ON" : "OFF"}</span>
      <span aria-hidden className="hidden text-[13px] max-[480px]:inline">
        ♪
      </span>
    </button>
  );
}
