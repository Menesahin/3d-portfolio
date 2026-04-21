import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Scanline,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction, KernelSize } from "postprocessing";
import { useActiveTheme } from "@/hooks/useActiveTheme";

/**
 * Post-processing stack. We branch the composer by theme because the
 * EffectComposer type doesn't accept `null` children, so conditional
 * inclusion has to be at the composer level. See plan §10.6.
 */
export function PostFX() {
  const theme = useActiveTheme();

  if (theme.id === "cyber") {
    return (
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom
          mipmapBlur
          intensity={theme.postFX.bloom}
          luminanceThreshold={0.82}
          luminanceSmoothing={0.2}
          kernelSize={KernelSize.LARGE}
        />
        <ChromaticAberration
          offset={[0.0015, 0.0012]}
          blendFunction={BlendFunction.NORMAL}
          radialModulation={false}
          modulationOffset={0}
        />
        <Scanline density={1.1} opacity={0.06} blendFunction={BlendFunction.OVERLAY} />
        <Vignette eskil={false} offset={0.25} darkness={theme.postFX.vignette} />
      </EffectComposer>
    );
  }

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom
        mipmapBlur
        intensity={theme.postFX.bloom}
        luminanceThreshold={0.82}
        luminanceSmoothing={0.2}
        kernelSize={KernelSize.LARGE}
      />
      <Vignette eskil={false} offset={0.25} darkness={theme.postFX.vignette} />
    </EffectComposer>
  );
}
