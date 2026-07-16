import { Environment, Lightformer } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import type * as THREE from "three";
import { useStore } from "@/stores";
import type { CockpitLightingPreset } from "@/stores/slices/cockpit";
import { cockpitSunDirectionRef } from "./cockpit/lightingState";
import { PlanetVista } from "./cockpit/PlanetVista";
import { CockpitPlatformV7 } from "./cockpit/v7/CockpitPlatformV7";
import { MascotHalo } from "./MascotHalo";

/** KEX-07 cabin, orbital vista, mascot halo, and physical lighting. */
export function Showcase() {
  return (
    <>
      <CockpitLighting />
      <MascotHalo />
      <Suspense fallback={null}>
        <PlanetVista />
        <CockpitPlatformV7 />
      </Suspense>
    </>
  );
}

function CockpitLighting() {
  const sunLight = useRef<THREE.DirectionalLight>(null);
  const preset = useStore((state) => state.cockpit.lighting);
  const masterPower = useStore((state) => state.cockpit.masterPower);
  const lighting = COCKPIT_LIGHTING[preset];
  const power = masterPower ? lighting.power : 0.14;

  useFrame(() => {
    const light = sunLight.current;
    if (!light) return;
    light.position.copy(cockpitSunDirectionRef.current).multiplyScalar(18);
    light.position.y += 2.5;
  });

  return (
    <>
      {/* Reflection-only cabin environment. These cards are deliberately
          dim: actual illumination comes from the physical lights below. */}
      <Environment
        key={`${preset}-${masterPower ? "on" : "off"}`}
        background={false}
        resolution={256}
        frames={1}
        environmentIntensity={lighting.environment * (masterPower ? 1 : 0.3)}
      >
        <Lightformer
          form="rect"
          intensity={1.8 * power}
          color={lighting.window}
          scale={[13, 5, 1]}
          position={[0, 5.8, -10]}
          target={[0, 2.2, 0]}
        />
        <Lightformer
          form="rect"
          intensity={1.35 * power}
          color={lighting.key}
          scale={[9, 2, 1]}
          position={[0, 7.2, 0.5]}
          target={[0, 1.2, 0]}
        />
        <Lightformer
          form="ring"
          intensity={0.8 * power}
          color={lighting.fill}
          scale={[4, 4, 1]}
          position={[0, 2.5, 7]}
          target={[0, 1.5, 0]}
        />
      </Environment>

      {/* Low, cool Earth albedo prevents black crush without flattening the
          cabin. The warm fixtures establish a readable interior hierarchy. */}
      <hemisphereLight args={[lighting.sky, "#07090b", 0.74 * power]} />
      <directionalLight
        ref={sunLight}
        intensity={0.74 * Math.max(power, 0.34)}
        color={lighting.window}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={32}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={10}
        shadow-camera-bottom={-4}
        shadow-bias={-0.00035}
        shadow-normalBias={0.025}
      />
      <spotLight
        position={[0, 7.1, 1.6]}
        color={lighting.key}
        intensity={165 * power}
        distance={17}
        decay={2}
        angle={0.92}
        penumbra={0.9}
      />
      <spotLight
        position={[0, 5.4, 7.8]}
        color={lighting.key}
        intensity={125 * power}
        distance={20}
        decay={2}
        angle={0.78}
        penumbra={0.95}
      />
      <pointLight
        position={[-5.2, 5.5, -0.8]}
        color={lighting.key}
        intensity={105 * power}
        distance={10}
        decay={2}
      />
      <pointLight
        position={[5.2, 5.5, -0.8]}
        color={lighting.key}
        intensity={105 * power}
        distance={10}
        decay={2}
      />
      <pointLight
        position={[0, 4.0, -5.5]}
        color={lighting.fill}
        intensity={38 * power}
        distance={13}
        decay={2}
      />
      <pointLight
        position={[-2.8, 2.4, 4.2]}
        color={lighting.fill}
        intensity={42 * power}
        distance={8}
        decay={2}
      />
      <pointLight
        position={[2.8, 2.4, 4.2]}
        color={lighting.key}
        intensity={38 * power}
        distance={8}
        decay={2}
      />
      <pointLight
        position={[-3.8, 2.35, -4.35]}
        color={lighting.fill}
        intensity={24 * power}
        distance={5.5}
        decay={2}
      />
      <pointLight
        position={[3.8, 2.35, -4.35]}
        color={lighting.key}
        intensity={22 * power}
        distance={5.5}
        decay={2}
      />
      <pointLight
        position={[-7.2, 3.7, 0]}
        color={lighting.fill}
        intensity={68 * power}
        distance={7}
        decay={2}
      />
      <pointLight
        position={[7.2, 3.7, 0]}
        color={lighting.key}
        intensity={64 * power}
        distance={7}
        decay={2}
      />
      <pointLight
        position={[3.8, 3.0, 5.2]}
        color={lighting.fill}
        intensity={46 * power}
        distance={7}
        decay={2}
      />
    </>
  );
}

const COCKPIT_LIGHTING: Record<
  CockpitLightingPreset,
  {
    environment: number;
    power: number;
    window: string;
    sky: string;
    key: string;
    fill: string;
  }
> = {
  standard: {
    environment: 0.88,
    power: 1,
    window: "#c8e9f1",
    sky: "#a8d8e5",
    key: "#f3c995",
    fill: "#6dcddd",
  },
  observation: {
    environment: 0.64,
    power: 0.72,
    window: "#d8f3ff",
    sky: "#86cbe2",
    key: "#d6b98d",
    fill: "#4ec9e2",
  },
  cool: {
    environment: 0.82,
    power: 0.9,
    window: "#d7f1ff",
    sky: "#91cce5",
    key: "#b9dbea",
    fill: "#55d8ef",
  },
  warm: {
    environment: 0.82,
    power: 0.92,
    window: "#dce9e5",
    sky: "#a7c9cc",
    key: "#ffc17d",
    fill: "#7fc6cb",
  },
  alert: {
    environment: 0.62,
    power: 0.8,
    window: "#ffd7c8",
    sky: "#c4a39d",
    key: "#ff5c4d",
    fill: "#ff9d5a",
  },
  dim: {
    environment: 0.28,
    power: 0.28,
    window: "#8ab9c8",
    sky: "#466b78",
    key: "#ad845f",
    fill: "#277d91",
  },
};
