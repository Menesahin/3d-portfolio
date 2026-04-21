import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { useActiveTheme } from "@/hooks/useActiveTheme";
import { Mascot } from "@/mascot/Mascot";
import { CameraRig } from "./CameraRig";
import { Ground } from "./Ground";
import { HdriEnvironment } from "./HdriEnvironment";
import { Hologram } from "./Hologram";
import { Contact } from "./islands/Contact";
import { Experience } from "./islands/Experience";
import { Gallery } from "./islands/Gallery";
import { Hub } from "./islands/Hub";
import { Projects } from "./islands/Projects";
import { Skills } from "./islands/Skills";
import { AdaptiveQuality } from "./AdaptiveQuality";
import { Lighting } from "./Lighting";
import { Particles } from "./Particles";
import { AmbientFlyers } from "./props/AmbientFlyers";
import { ArrivalRipple } from "./props/ArrivalRipple";
import { Sky } from "./Sky";
import { ZoneSpotlight } from "./ZoneSpotlight";

/**
 * Everything inside the R3F `<Canvas>`. Mounted once per session; theme
 * changes mutate uniforms and colors, they don't remount geometry.
 */
export function WorldScene() {
  const { scene, gl } = useThree();
  const theme = useActiveTheme();

  // Install the fog once; Sky.tsx lerps its color per frame.
  // biome-ignore lint/correctness/useExhaustiveDependencies: install once on mount; Sky.tsx handles color animation
  useEffect(() => {
    scene.fog = new THREE.Fog(theme.palette.fog, theme.fog.near, theme.fog.far);
    scene.background = new THREE.Color(theme.palette.skyBottom);
    gl.toneMappingExposure = theme.exposure;
    return () => {
      scene.fog = null;
    };
  }, []);

  // Update fog near/far on theme change (color is lerped in Sky.tsx)
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
      <Ground />
      <Particles />

      {/* Theatrical spotlights — one per zone, tuned to the zone's height. */}
      <ZoneSpotlight zone="hub" offset={[0, 10, 3]} intensity={5} accent />
      <ZoneSpotlight zone="experience" offset={[0, 10, 3]} intensity={4.5} />
      <ZoneSpotlight zone="projects" offset={[0, 10, 3]} intensity={4.5} />
      <ZoneSpotlight zone="skills" offset={[0, 10, 2]} intensity={4} />
      <ZoneSpotlight zone="gallery" offset={[0, 9, 3]} intensity={4} />
      <ZoneSpotlight zone="contact" offset={[0, 9, 3]} intensity={4.5} accent />

      <Hub />
      <Experience />
      <Projects />
      <Skills />
      <Gallery />
      <Contact />

      <Hologram />
      <Mascot />
      <AmbientFlyers />
      <ArrivalRipple />

      <AdaptiveQuality />
      <CameraRig />
    </>
  );
}
