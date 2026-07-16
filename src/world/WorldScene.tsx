import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { useActiveTheme } from "@/hooks/useActiveTheme";
import { Mascot } from "@/mascot/Mascot";
import { useStore } from "@/stores";
import { CameraRig } from "./CameraRig";
import { CockpitControlsV7 } from "./cockpit/v7/CockpitControlsV7";
import { ExteriorCameraRig } from "./cockpit/v7/ExteriorCameraRig";
import { SpacecraftExterior } from "./cockpit/v7/SpacecraftExterior";
import { HologramStage } from "./holograms/HologramStage";
import { MascotSpeechBubble } from "./MascotSpeechBubble";
import { OnboardingHint } from "./OnboardingHint";
import { Showcase } from "./Showcase";

/** KEX-07 interior/exterior scene coordinator. */
export function WorldScene() {
  const { scene, gl } = useThree();
  const theme = useActiveTheme();
  const cockpitView = useStore((state) => state.cockpit.viewMode);
  const exterior = cockpitView === "exterior";

  useEffect(() => {
    scene.background = new THREE.Color(exterior ? "#010309" : theme.palette.skyBottom);
    scene.fog = exterior ? null : new THREE.Fog("#03070b", 28, 160);
    gl.toneMappingExposure = exterior ? 1.12 : 1.26;
    return () => {
      scene.fog = null;
    };
  }, [scene, gl, theme, exterior]);

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
      <Showcase />
      <Mascot />
      <MascotSpeechBubble />
      <HologramStage />
      <CockpitControlsV7 />
      <OnboardingHint />
      <CameraRig />
    </>
  );
}
