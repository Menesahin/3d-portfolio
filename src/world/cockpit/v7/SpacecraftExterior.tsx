import { Environment, Lightformer, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useIsMobile } from "@/hooks/useIsMobile";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useStore } from "@/stores";
import { cockpitSunDirectionRef } from "../lightingState";
import { PlanetVista } from "../PlanetVista";
import { COCKPIT_V7_ASSETS } from "./layout";
import { cloneSceneWithMaterials, disposeSceneMaterials, tuneV7Scene } from "./materials";

useGLTF.preload(COCKPIT_V7_ASSETS.exterior);

export function SpacecraftExterior() {
  return (
    <>
      <PlanetVista />
      <ExteriorLighting />
      <SpacecraftBody />
    </>
  );
}

function SpacecraftBody() {
  const { scene } = useGLTF(COCKPIT_V7_ASSETS.exterior);
  const spacecraft = useMemo(() => cloneSceneWithMaterials(scene), [scene]);
  const vesselRef = useRef<THREE.Group>(null);
  const reduceMotion = usePrefersReducedMotion();
  const flightMode = useStore((state) => state.cockpit.flightMode);
  const masterPower = useStore((state) => state.cockpit.masterPower);

  const engineMaterials = useMemo(() => {
    const result = new Set<THREE.MeshStandardMaterial>();
    spacecraft.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        if (material instanceof THREE.MeshStandardMaterial && /V7EngineEmission/.test(material.name)) {
          result.add(material);
        }
      }
    });
    return [...result];
  }, [spacecraft]);

  useEffect(() => {
    tuneV7Scene(spacecraft, true);
    return () => disposeSceneMaterials(spacecraft);
  }, [spacecraft]);

  useFrame((state, dt) => {
    const vessel = vesselRef.current;
    if (!vessel) return;
    const time = state.clock.elapsedTime;
    const thrust = !masterPower ? 0.12 : flightMode === "park" ? 0.34 : flightMode === "cruise" ? 0.78 : 1.35;
    const pulse = reduceMotion ? 1 : 1 + Math.sin(time * (flightMode === "warp" ? 27 : 5.4)) * 0.08;

    for (const material of engineMaterials) {
      material.emissiveIntensity = THREE.MathUtils.damp(
        material.emissiveIntensity,
        1.2 + thrust * 4.2 * pulse,
        9,
        dt,
      );
    }

    const motion = reduceMotion ? 0 : flightMode === "warp" ? 1 : flightMode === "cruise" ? 0.45 : 0.22;
    const targetY = Math.sin(time * 0.38) * 0.18 * motion;
    const targetX = Math.sin(time * 0.21) * 0.07 * motion;
    const targetRoll = Math.sin(time * 0.27) * 0.006 * motion;
    vessel.position.x = THREE.MathUtils.damp(vessel.position.x, targetX, 3.5, dt);
    vessel.position.y = THREE.MathUtils.damp(vessel.position.y, targetY, 3.5, dt);
    vessel.rotation.z = THREE.MathUtils.damp(vessel.rotation.z, targetRoll, 3.5, dt);
  });

  return (
    <group ref={vesselRef}>
      <primitive object={spacecraft} />
      <EngineWake />
    </group>
  );
}

function EngineWake() {
  const portRef = useRef<THREE.Mesh>(null);
  const starboardRef = useRef<THREE.Mesh>(null);
  const portMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const starboardMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const flightMode = useStore((state) => state.cockpit.flightMode);
  const masterPower = useStore((state) => state.cockpit.masterPower);
  const reduceMotion = usePrefersReducedMotion();

  useFrame((state, dt) => {
    const time = state.clock.elapsedTime;
    const output = !masterPower ? 0.05 : flightMode === "park" ? 0.18 : flightMode === "cruise" ? 0.66 : 1;
    const pulse = reduceMotion ? 1 : 1 + Math.sin(time * (flightMode === "warp" ? 31 : 8)) * 0.12;
    for (const mesh of [portRef.current, starboardRef.current]) {
      if (!mesh) continue;
      mesh.scale.x = THREE.MathUtils.damp(mesh.scale.x, 0.72 + output * 0.34, 10, dt);
      mesh.scale.z = THREE.MathUtils.damp(mesh.scale.z, 0.72 + output * 0.34, 10, dt);
      mesh.scale.y = THREE.MathUtils.damp(mesh.scale.y, (0.28 + output * 1.48) * pulse, 12, dt);
    }
    for (const material of [portMaterial.current, starboardMaterial.current]) {
      if (!material) continue;
      material.opacity = THREE.MathUtils.damp(material.opacity, 0.08 + output * 0.42, 12, dt);
    }
  });

  return (
    <>
      {([-5.6, 5.6] as const).map((x, index) => (
        <mesh
          key={x}
          ref={index === 0 ? portRef : starboardRef}
          position={[x, 2.55, 25.1]}
          rotation={[Math.PI / 2, 0, 0]}
          renderOrder={3}
        >
          <coneGeometry args={[1.24, 9.8, 24, 1, true]} />
          <meshBasicMaterial
            ref={index === 0 ? portMaterial : starboardMaterial}
            color="#52e8ff"
            transparent
            opacity={0.2}
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
      <pointLight position={[-5.6, 2.55, 20.8]} color="#4ce6ff" intensity={45} distance={14} decay={2} />
      <pointLight position={[5.6, 2.55, 20.8]} color="#4ce6ff" intensity={45} distance={14} decay={2} />
    </>
  );
}

function ExteriorLighting() {
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const isMobile = useIsMobile();

  useFrame(() => {
    const sun = sunRef.current;
    if (!sun) return;
    sun.position.copy(cockpitSunDirectionRef.current).multiplyScalar(180);
  });

  return (
    <>
      <Environment background={false} resolution={256} frames={1} environmentIntensity={0.88}>
        <Lightformer
          form="rect"
          color="#bfeaff"
          intensity={3.2}
          scale={[90, 34, 1]}
          position={[-54, 48, 88]}
          target={[0, 2, 0]}
        />
        <Lightformer
          form="rect"
          color="#327fac"
          intensity={2.1}
          scale={[70, 28, 1]}
          position={[62, 18, -28]}
          target={[0, 2, 0]}
        />
        <Lightformer
          form="ring"
          color="#ffbd72"
          intensity={1.4}
          scale={[34, 34, 1]}
          position={[0, -30, 52]}
          target={[0, 0, 0]}
        />
      </Environment>
      <hemisphereLight args={["#6f9ab1", "#010306", 0.92]} />
      <directionalLight
        ref={sunRef}
        color="#e7f4ff"
        intensity={2.75}
        castShadow
        shadow-mapSize-width={isMobile ? 1024 : 2048}
        shadow-mapSize-height={isMobile ? 1024 : 2048}
        shadow-camera-near={50}
        shadow-camera-far={330}
        shadow-camera-left={-48}
        shadow-camera-right={48}
        shadow-camera-top={48}
        shadow-camera-bottom={-48}
        shadow-bias={-0.0002}
        shadow-normalBias={0.06}
      />
      <directionalLight position={[45, 18, 70]} color="#4fadd9" intensity={0.72} />
      <directionalLight position={[-34, -12, 24]} color="#d28a4b" intensity={0.34} />
    </>
  );
}
