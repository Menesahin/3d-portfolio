import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { useActiveTheme } from "@/hooks/useActiveTheme";
import { Mascot } from "@/mascot/Mascot";
import { useStore } from "@/stores";
import { CameraRig } from "./CameraRig";
import { CockpitControls } from "./cockpit/CockpitControls";
import { CockpitControlsV7 } from "./cockpit/v7/CockpitControlsV7";
import { ExteriorCameraRig } from "./cockpit/v7/ExteriorCameraRig";
import { SpacecraftExterior } from "./cockpit/v7/SpacecraftExterior";
import { HologramStage } from "./holograms/HologramStage";
import { MascotSpeechBubble } from "./MascotSpeechBubble";
import { OnboardingHint } from "./OnboardingHint";
import { Showcase } from "./Showcase";
import { isCockpitVariant, readWorldVariant } from "./worldVariant";

/**
 * Showcase world — backdrop + ground + 3-point studio lighting
 * (`Showcase`), the mascot at origin, the specialised hologram stage
 * appearing beside the mascot, the first-visit onboarding hint, and
 * the chat-driven camera rig. Scene background is the theme's sky
 * colour so the top of the backdrop fades seamlessly into fog.
 *
 * No post-processing pass is mounted — bloom (the only effect left
 * after AO / chromatic aberration / scanline removals) was leaking
 * its mipmap blur onto the SDF hologram text, corrupting body copy
 * after the fade tween settled. We render straight to the canvas;
 * the scene reads slightly flatter but text stays sharp.
 */
export function WorldScene() {
  const { scene, gl } = useThree();
  const theme = useActiveTheme();
  const variant = readWorldVariant();
  const cockpitView = useStore((state) => state.cockpit.viewMode);
  const exterior = variant === "cockpit-v7" && cockpitView === "exterior";

  useEffect(() => {
    scene.background = new THREE.Color(exterior ? "#010309" : theme.palette.skyBottom);
    scene.fog = exterior
      ? null
      : isCockpitVariant(variant)
        ? new THREE.Fog("#03070b", 28, 160)
        : new THREE.Fog(theme.palette.fog, theme.fog.near, theme.fog.far);
    gl.toneMappingExposure = exterior ? 1.12 : isCockpitVariant(variant) ? 1.26 : theme.exposure;
    return () => {
      scene.fog = null;
    };
  }, [scene, gl, theme, variant, exterior]);

  if (exterior) {
    return (
      <>
        <SpacecraftExterior />
        <ExteriorCameraRig />
      </>
    );
  }

  return (
    <>
      <Showcase variant={variant} />
      <Mascot variant={variant} />
      <MascotSpeechBubble />
      <HologramStage />
      {variant === "cockpit" && <CockpitControls />}
      {variant === "cockpit-v7" && <CockpitControlsV7 />}
      <OnboardingHint />
      <CameraRig variant={variant} />
    </>
  );
}
