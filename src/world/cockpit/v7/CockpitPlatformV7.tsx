import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import type * as THREE from "three";
import { useIsMobile } from "@/hooks/useIsMobile";
import { COCKPIT_V7_ASSETS } from "./layout";
import { cloneSceneWithMaterials, disposeSceneMaterials, tuneV7Scene } from "./materials";

useGLTF.preload(COCKPIT_V7_ASSETS.shell);

/** Blender-authored V7 pressure cabin, batched into 21 material/LOD meshes. */
export function CockpitPlatformV7() {
  const { scene } = useGLTF(COCKPIT_V7_ASSETS.shell);
  const isMobile = useIsMobile();
  const cockpit = useMemo(() => cloneSceneWithMaterials(scene as THREE.Group), [scene]);

  useEffect(() => {
    tuneV7Scene(cockpit, !isMobile);
    cockpit.traverse((object) => {
      if (object.userData.mobileHide === true || object.name.includes("MOBILE_HIDE")) {
        object.visible = !isMobile;
      }
    });
  }, [cockpit, isMobile]);

  useEffect(() => () => disposeSceneMaterials(cockpit), [cockpit]);

  return <primitive object={cockpit} />;
}
