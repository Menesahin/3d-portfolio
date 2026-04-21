import { Environment } from "@react-three/drei";
import { useActiveTheme } from "@/hooks/useActiveTheme";

/**
 * HDRI environment for image-based lighting. Materials get their reflections
 * and ambient fill from this map; our custom Sky shader continues to draw
 * the actual visible background, so `background={false}` here is critical.
 *
 * drei's presets come from the pmndrs/assets CDN — no local files needed.
 * Swap for a custom HDR later by dropping a `.hdr` into `/public/hdri/`
 * and using `files="/hdri/your.hdr"` instead of a preset.
 */
export function HdriEnvironment() {
  const theme = useActiveTheme();
  // Preset choices tuned for the two themes:
  //  - sunset  → warm golden fill; complements Dreamy peach→lavender sky
  //  - night   → cool tones + stronger contrast; reads well with Cyber neons
  const preset = theme.id === "cyber" ? "night" : "sunset";
  return (
    <Environment
      preset={preset}
      background={false}
      environmentIntensity={theme.id === "cyber" ? 0.35 : 0.6}
      resolution={256}
    />
  );
}
