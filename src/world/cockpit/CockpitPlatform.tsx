import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useIsMobile } from "@/hooks/useIsMobile";

const ASSET_URL = "/models/cockpit/cockpit.glb";
const MOBILE_OCCLUDER_PREFIX = "MobileOccluder_";
const MOBILE_CANOPY_ARCH = /Cockpit_Observation(?:Frame|Gasket)$/;
const SHADOW_CASTER =
  /Pressure|Wall|Bulkhead|Dashboard|DeskWing|Console_.*_(Chassis|Bezel)|CeilingShell|Window(Sill|Header|Left|Right)|CanopyMullion|Airlock/;

useGLTF.preload(ASSET_URL);

type SurfaceMaps = {
  metal: THREE.DataTexture;
  composite: THREE.DataTexture;
  rubber: THREE.DataTexture;
};

function surfaceTexture(seed: number, base: number, variation: number, grooves: number) {
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  let state = seed;
  const random = () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const fine = (random() - 0.5) * variation;
      const broad = Math.sin(x * 0.19 + seed) * variation * 0.12;
      const groove = grooves > 0 && (x + seed * 7) % grooves === 0 ? -variation * 0.8 : 0;
      const value = THREE.MathUtils.clamp(Math.round(base + fine + broad + groove), 12, 245);
      const offset = (y * size + x) * 4;
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(grooves > 0 ? 7 : 4, grooves > 0 ? 7 : 4);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function createSurfaceMaps(): SurfaceMaps {
  return {
    metal: surfaceTexture(19, 188, 34, 53),
    composite: surfaceTexture(41, 214, 22, 0),
    rubber: surfaceTexture(73, 226, 42, 31),
  };
}

function tuneMaterial(material: THREE.Material, maps: SurfaceMaps) {
  if (!(material instanceof THREE.MeshStandardMaterial)) return;

  const name = material.name;
  material.envMapIntensity = 0.9;

  if (name.includes("Screen")) {
    material.color.set("#03090d");
    material.metalness = 0.14;
    material.roughness = 0.2;
    material.emissive.set("#031116");
    material.emissiveIntensity = 0.36;
    return;
  }

  if (name.includes("Cyan") || name.includes("Amber") || name.includes("Red")) {
    material.metalness = 0.08;
    material.roughness = 0.42;
    material.emissiveIntensity *= 0.74;
    material.envMapIntensity = 0.42;
    return;
  }

  if (name.includes("WorktopComposite")) {
    material.color.set("#263b44");
    material.metalness = 0.16;
    material.roughness = 0.62;
    material.roughnessMap = maps.composite;
    material.bumpMap = maps.composite;
    material.bumpScale = 0.009;
    material.envMapIntensity = 0.62;
  } else if (name.includes("BronzeHardware")) {
    material.color.set("#966f4c");
    material.metalness = 0.62;
    material.roughness = 0.38;
    material.roughnessMap = maps.metal;
    material.bumpMap = maps.metal;
    material.bumpScale = 0.006;
    material.envMapIntensity = 1.02;
  } else if (name.includes("Rubber")) {
    material.color.set("#06090b");
    material.metalness = 0.02;
    material.roughness = 0.92;
    material.roughnessMap = maps.rubber;
    material.bumpMap = maps.rubber;
    material.bumpScale = 0.018;
  } else if (name.includes("Cream")) {
    material.color.set("#a49b88");
    material.metalness = 0.22;
    material.roughness = 0.64;
    material.roughnessMap = maps.composite;
    material.bumpMap = maps.composite;
    material.bumpScale = 0.008;
  } else if (name.includes("Panel")) {
    material.color.set("#2b3d47");
    material.metalness = 0.3;
    material.roughness = 0.67;
    material.roughnessMap = maps.composite;
    material.bumpMap = maps.composite;
    material.bumpScale = 0.01;
  } else if (name.includes("HullSoft")) {
    material.color.set("#1b2932");
    material.metalness = 0.4;
    material.roughness = 0.68;
    material.roughnessMap = maps.metal;
    material.bumpMap = maps.metal;
    material.bumpScale = 0.009;
  } else if (name.includes("Hull")) {
    material.color.set("#0d151c");
    material.metalness = 0.55;
    material.roughness = 0.58;
    material.roughnessMap = maps.metal;
    material.bumpMap = maps.metal;
    material.bumpScale = 0.008;
  } else if (name.includes("Orange")) {
    material.metalness = 0.24;
    material.roughness = 0.56;
    material.roughnessMap = maps.metal;
    material.bumpMap = maps.metal;
    material.bumpScale = 0.006;
  }

  material.needsUpdate = true;
}

/** Production cockpit shell with runtime PBR surface finishing. */
export function CockpitPlatform() {
  const { scene } = useGLTF(ASSET_URL);
  const isMobile = useIsMobile();
  const surfaceMaps = useMemo(createSurfaceMaps, []);
  const cockpit = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((material) => material.clone())
        : mesh.material.clone();
    });
    return clone;
  }, [scene]);

  useEffect(() => {
    cockpit.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of materials) tuneMaterial(material, surfaceMaps);
        mesh.castShadow = !isMobile && SHADOW_CASTER.test(obj.name);
        mesh.receiveShadow = !materials.some((material) => /Cyan|Amber|Red/.test(material.name));
      }
      if (obj.name.startsWith(MOBILE_OCCLUDER_PREFIX) || MOBILE_CANOPY_ARCH.test(obj.name)) {
        obj.visible = !isMobile;
      }
    });
  }, [cockpit, isMobile, surfaceMaps]);

  useEffect(
    () => () => {
      cockpit.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of materials) material.dispose();
      });
      surfaceMaps.metal.dispose();
      surfaceMaps.composite.dispose();
      surfaceMaps.rubber.dispose();
    },
    [cockpit, surfaceMaps],
  );

  return <primitive object={cockpit} />;
}
