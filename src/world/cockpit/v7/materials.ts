import * as THREE from "three";

export function cloneSceneWithMaterials(source: THREE.Group): THREE.Group {
  const clone = source.clone(true);
  clone.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map((material) => material.clone())
      : mesh.material.clone();
  });
  return clone;
}

export function tuneV7Material(material: THREE.Material): void {
  if (!(material instanceof THREE.MeshStandardMaterial)) return;
  const name = material.name;
  material.envMapIntensity = 0.86;

  if (/V7EngineEmission/.test(name)) {
    material.color.set("#063044");
    material.emissive.set("#22dfff");
    material.emissiveIntensity = 3.4;
    material.metalness = 0.18;
    material.roughness = 0.16;
    material.toneMapped = false;
  } else if (/V7RCSEmission/.test(name)) {
    material.color.set("#43150a");
    material.emissive.set("#ff8a38");
    material.emissiveIntensity = 2.4;
    material.metalness = 0.12;
    material.roughness = 0.22;
    material.toneMapped = false;
  } else if (/V7CanopyGlass/.test(name)) {
    material.color.set("#082c37");
    material.metalness = 0.18;
    material.roughness = 0.11;
    material.transparent = true;
    material.opacity = 0.38;
    material.depthWrite = false;
    material.side = THREE.DoubleSide;
    material.envMapIntensity = 1.45;
  } else if (/V7GraphiteHull/.test(name)) {
    material.color.set("#091820");
    material.metalness = 0.82;
    material.roughness = 0.3;
    material.envMapIntensity = 1.12;
  } else if (/V7WhiteArmor/.test(name)) {
    material.color.set("#95a6a5");
    material.metalness = 0.52;
    material.roughness = 0.28;
    material.envMapIntensity = 1.18;
  } else if (/V7BellyArmor/.test(name)) {
    material.color.set("#16272d");
    material.metalness = 0.72;
    material.roughness = 0.36;
    material.envMapIntensity = 0.96;
  } else if (/Screen/.test(name)) {
    material.color.set("#02080b");
    material.metalness = 0.08;
    material.roughness = 0.18;
    material.emissive.set("#03151b");
    material.emissiveIntensity = 0.5;
  } else if (/CyanEmission/.test(name)) {
    material.color.set("#8ff7ff");
    material.emissive.set("#24dbea");
    material.emissiveIntensity = 2.2;
    material.roughness = 0.28;
    material.metalness = 0.1;
    material.toneMapped = false;
  } else if (/AmberEmission|CreamEmission/.test(name)) {
    material.color.set("#ffe4b5");
    material.emissive.set("#eaa66a");
    material.emissiveIntensity = 1.65;
    material.roughness = 0.34;
    material.metalness = 0.08;
  } else if (/RedEmission|SafetyRed/.test(name)) {
    material.color.set("#8f2524");
    material.emissive.set("#ff4b3e");
    material.emissiveIntensity = 1.25;
    material.roughness = 0.38;
  } else if (/GreenEmission/.test(name)) {
    material.emissive.set("#5af7b4");
    material.emissiveIntensity = 1.35;
  } else if (/V7PressureShell/.test(name)) {
    material.color.set("#10232b");
    material.metalness = 0.68;
    material.roughness = 0.34;
    material.envMapIntensity = 0.96;
  } else if (/V7Frame/.test(name)) {
    material.color.set("#7f8e90");
    material.metalness = 0.82;
    material.roughness = 0.23;
    material.envMapIntensity = 1.15;
  } else if (/V7InnerPanel|Panel/.test(name)) {
    material.color.set("#243f49");
    material.metalness = 0.32;
    material.roughness = 0.55;
  } else if (/WorktopComposite/.test(name)) {
    material.color.set("#3d5963");
    material.metalness = 0.18;
    material.roughness = 0.52;
  } else if (/BronzeHardware/.test(name)) {
    material.color.set("#a57a50");
    material.metalness = 0.7;
    material.roughness = 0.3;
    material.envMapIntensity = 1.2;
  } else if (/CreamStructure|LeverIvory/.test(name)) {
    material.color.set("#d8d0bd");
    material.metalness = 0.18;
    material.roughness = 0.46;
  } else if (/ControlSteel/.test(name)) {
    material.color.set("#536b75");
    material.metalness = 0.62;
    material.roughness = 0.28;
  } else if (/Rubber/.test(name)) {
    material.color.set("#05090b");
    material.metalness = 0.02;
    material.roughness = 0.9;
  } else if (/HullSoft/.test(name)) {
    material.color.set("#192b34");
    material.metalness = 0.42;
    material.roughness = 0.58;
  } else if (/Hull/.test(name)) {
    material.color.set("#0b171e");
    material.metalness = 0.58;
    material.roughness = 0.48;
  }

  material.needsUpdate = true;
}

export function tuneV7Scene(scene: THREE.Object3D, shadows: boolean): void {
  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) tuneV7Material(material);
    mesh.castShadow = shadows && !/Emission|Screen/.test(materials[0]?.name ?? "");
    mesh.receiveShadow = !/Emission/.test(materials[0]?.name ?? "");
  });
}

export function disposeSceneMaterials(scene: THREE.Object3D): void {
  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) material.dispose();
  });
}
