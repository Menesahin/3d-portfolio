import { Environment, Lightformer, MeshReflectorMaterial, Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import type * as THREE from "three";
import { useActiveTheme } from "@/hooks/useActiveTheme";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useStore } from "@/stores";
import type { CockpitLightingPreset } from "@/stores/slices/cockpit";
import { CockpitPlatform } from "./cockpit/CockpitPlatform";
import { cockpitSunDirectionRef } from "./cockpit/lightingState";
import { PlanetVista } from "./cockpit/PlanetVista";
import { CockpitPlatformV7 } from "./cockpit/v7/CockpitPlatformV7";
import { MascotHalo } from "./MascotHalo";
import { ScifiPlatform } from "./ScifiPlatform";
import { isCockpitVariant, type WorldVariant } from "./worldVariant";

/**
 * Showcase shell. Composes the lit + decorated room around the mascot
 * and the wall holograms.
 *
 *  - **Studio area lights via `<Lightformer>`** baked once into a custom
 *    `<Environment>` env-map (`frames={1}`). Three-point setup —
 *    warm key, cool fill, accent rim. Reflective floor + wall materials
 *    pick up these area-light highlights for free.
 *  - **One real `<directionalLight>`** for actual cast-shadows; reduced
 *    intensity since the env carries most of the lighting load.
 *  - **`<Sparkles>`** confined to the room volume — ambient dust motes.
 *  - **`<MeshReflectorMaterial>` floor** beneath the platform — subtle
 *    mascot/wall reflection sells the polished sci-fi vibe.
 *  - **Stage edge ring** — thin accent ring on the platform's outer rim.
 *  - **`<MascotHalo>`** — soft radial-gradient decal that follows mascot.
 *
 * The sci-fi platform GLB is loaded inside `<Suspense>` so the stage
 * appears as soon as it's available without blocking the rest.
 */
export function Showcase({ variant }: { variant: WorldVariant }) {
  const theme = useActiveTheme();
  const reduceMotion = usePrefersReducedMotion();
  const cockpit = isCockpitVariant(variant);

  return (
    <>
      {cockpit ? <CockpitLighting /> : <LegacyLighting accent={theme.palette.accent} />}

      {/* Reflective far-floor — captures mascot + walls in a soft blurred
          reflection. Sits 0.02u below origin so the platform's own GLB
          floor reads on top. */}
      {variant === "legacy" && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
          <planeGeometry args={[120, 120]} />
          <MeshReflectorMaterial
            blur={[300, 100]}
            mixBlur={1}
            mixStrength={0.35}
            resolution={1024}
            mirror={0.4}
            color={theme.palette.skyBottom}
            metalness={0.4}
            roughness={0.8}
            depthScale={1.2}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.4}
          />
        </mesh>
      )}

      {/* Stage-edge accent ring — thin tinted band on the platform rim.
          Reads as an intentional stage boundary in wide shots. */}
      {variant === "legacy" && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[8.6, 8.85, 96]} />
          <meshBasicMaterial
            color={theme.palette.accent}
            transparent
            opacity={0.18}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* Mascot grounding halo. */}
      <MascotHalo />

      {/* Ambient dust motes — accent-tinted, slow drift, reduce-motion
          freezes them to a still field. */}
      {variant === "legacy" && (
        <Sparkles
          count={120}
          speed={reduceMotion ? 0 : 0.4}
          opacity={0.55}
          color={theme.palette.accent}
          size={2}
          scale={[16, 8, 16]}
          position={[0, 4, 0]}
          noise={1}
        />
      )}

      <Suspense fallback={null}>
        {cockpit ? (
          <>
            <PlanetVista />
            {variant === "cockpit-v7" ? <CockpitPlatformV7 /> : <CockpitPlatform />}
          </>
        ) : (
          <ScifiPlatform />
        )}
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

function LegacyLighting({ accent }: { accent: string }) {
  return (
    <>
      <Environment background={false} resolution={256} frames={1} environmentIntensity={0.4}>
        <Lightformer
          form="rect"
          intensity={2.6}
          color="#fff1d8"
          scale={[10, 6, 1]}
          position={[6, 7, 5]}
          target={[0, 1.5, 0]}
        />
        <Lightformer
          form="rect"
          intensity={1.0}
          color="#cfe6ff"
          scale={[8, 8, 1]}
          position={[-7, 5, 4]}
          target={[0, 1.5, 0]}
        />
        <Lightformer
          form="ring"
          intensity={1.4}
          color={accent}
          scale={[5, 5, 1]}
          position={[-2, 4, -7]}
          target={[0, 1.5, 0]}
        />
      </Environment>
      <ambientLight intensity={0.12} />
      <directionalLight
        position={[5, 8, 4]}
        intensity={0.55}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={25}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0005}
      />
    </>
  );
}
