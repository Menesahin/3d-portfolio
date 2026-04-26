import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { useActiveTheme } from "@/hooks/useActiveTheme";
import { Mascot } from "@/mascot/Mascot";
import { CameraRig } from "./CameraRig";
import { HologramStage } from "./holograms/HologramStage";
import { MascotSpeechBubble } from "./MascotSpeechBubble";
import { OnboardingHint } from "./OnboardingHint";
import { Showcase } from "./Showcase";

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

  useEffect(() => {
    scene.background = new THREE.Color(theme.palette.skyBottom);
    scene.fog = new THREE.Fog(theme.palette.fog, theme.fog.near, theme.fog.far);
    gl.toneMappingExposure = theme.exposure;
    return () => {
      scene.fog = null;
    };
  }, [scene, gl, theme]);

  return (
    <>
      <Showcase />
      <Mascot />
      <MascotSpeechBubble />
      <HologramStage />
      <OnboardingHint />
      <CameraRig />
    </>
  );
}
