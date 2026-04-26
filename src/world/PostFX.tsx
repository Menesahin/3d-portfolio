import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { KernelSize } from "postprocessing";
import { useActiveTheme } from "@/hooks/useActiveTheme";

/**
 * Cyber-only post-processing stack.
 *   Bloom → Vignette
 *
 * Deliberately minimal:
 *  - Holograms already carry a shader-based scanline + grid + sweep
 *    overlay (`HoloScanlines` via `useHoloFade`); a screen-space
 *    `Scanline` pass on top duplicated and ate text legibility.
 *  - Chromatic aberration's colour fringing washed out the SDF text on
 *    the wall holograms.
 *  - N8AO was tried for crevice darkening but its temporal denoise
 *    accumulated artefacts on the troika-three-text SDF planes after
 *    a few seconds of streaming, corrupting hologram body text.
 *    Removed; the room reads slightly flatter but text stays crisp.
 *
 * Bloom uses `luminanceThreshold={1.0}` — only HDR colour values
 * (>1.0, set in `useHoloFade.ts` for the active wall) get picked up;
 * idle holograms render at LDR and don't glow.
 */
export function PostFX() {
  const theme = useActiveTheme();

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        mipmapBlur
        intensity={theme.postFX.bloom}
        luminanceThreshold={1.0}
        luminanceSmoothing={0.2}
        kernelSize={KernelSize.LARGE}
      />
      <Vignette eskil={false} offset={0.3} darkness={theme.postFX.vignette} />
    </EffectComposer>
  );
}
