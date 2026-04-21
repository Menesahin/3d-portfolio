import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { useActiveTheme } from "@/hooks/useActiveTheme";
import { Mascot } from "@/mascot/Mascot";
import { AdaptiveQuality } from "./AdaptiveQuality";
import { CameraRig } from "./CameraRig";
import { HdriEnvironment } from "./HdriEnvironment";
import { Hologram } from "./Hologram";
import { Lighting } from "./Lighting";
import { Particles } from "./Particles";
import { Park } from "./park/Park";
import { AmbientFlyers } from "./props/AmbientFlyers";
import { ArrivalRipple } from "./props/ArrivalRipple";
import { Sky } from "./Sky";
import { ZoneSpotlight } from "./ZoneSpotlight";

/**
 * Scene root. Outdoor-exposition-park layout: one continuous ground,
 * stone paths connecting six ground-level zones, everything built from
 * Kenney CC0 GLBs. Theme changes mutate materials, not geometry.
 */
export function WorldScene() {
  const { scene, gl } = useThree();
  const theme = useActiveTheme();

  // biome-ignore lint/correctness/useExhaustiveDependencies: install once on mount; Sky.tsx handles color animation
  useEffect(() => {
    scene.fog = new THREE.Fog(theme.palette.fog, theme.fog.near, theme.fog.far);
    scene.background = new THREE.Color(theme.palette.skyBottom);
    gl.toneMappingExposure = theme.exposure;
    return () => {
      scene.fog = null;
    };
  }, []);

  useEffect(() => {
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.near = theme.fog.near;
      scene.fog.far = theme.fog.far;
    }
    gl.toneMappingExposure = theme.exposure;
  }, [theme, scene, gl]);

  return (
    <>
      <Sky />
      <HdriEnvironment />
      <Lighting />
      <Particles />

      {/* Soft theatrical spotlights for each zone. */}
      <ZoneSpotlight zone="hub" offset={[0, 10, 3]} intensity={4} accent />
      <ZoneSpotlight zone="experience" offset={[0, 9, 2]} intensity={3.5} />
      <ZoneSpotlight zone="projects" offset={[0, 9, 2]} intensity={3.5} />
      <ZoneSpotlight zone="skills" offset={[0, 10, 0]} intensity={3.5} />
      <ZoneSpotlight zone="gallery" offset={[0, 9, 2]} intensity={3} />
      <ZoneSpotlight zone="contact" offset={[0, 9, 2]} intensity={3.5} accent />

      <Park />

      <Hologram />
      <Mascot />
      <AmbientFlyers />
      <ArrivalRipple />

      <AdaptiveQuality />
      <CameraRig />
    </>
  );
}
