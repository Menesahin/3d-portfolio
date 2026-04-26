import { Environment, Lightformer, MeshReflectorMaterial, Sparkles } from "@react-three/drei";
import { Suspense } from "react";
import { useActiveTheme } from "@/hooks/useActiveTheme";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { MascotHalo } from "./MascotHalo";
import { ScifiPlatform } from "./ScifiPlatform";

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
export function Showcase() {
  const theme = useActiveTheme();
  const reduceMotion = usePrefersReducedMotion();

  return (
    <>
      {/* Custom environment — Lightformer children act as area lights at
          the cost of a single env-map bake (frames={1}). */}
      <Environment background={false} resolution={256} frames={1} environmentIntensity={0.4}>
        {/* Key — warm, top-right */}
        <Lightformer
          form="rect"
          intensity={2.6}
          color="#fff1d8"
          scale={[10, 6]}
          position={[6, 7, 5]}
          target={[0, 1.5, 0]}
        />
        {/* Fill — cool, top-left, softer */}
        <Lightformer
          form="rect"
          intensity={1.0}
          color="#cfe6ff"
          scale={[8, 8]}
          position={[-7, 5, 4]}
          target={[0, 1.5, 0]}
        />
        {/* Rim — accent-tinted, behind mascot */}
        <Lightformer
          form="ring"
          intensity={1.4}
          color={theme.palette.accent}
          scale={[5, 5]}
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

      {/* Reflective far-floor — captures mascot + walls in a soft blurred
          reflection. Sits 0.02u below origin so the platform's own GLB
          floor reads on top. */}
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

      {/* Stage-edge accent ring — thin tinted band on the platform rim.
          Reads as an intentional stage boundary in wide shots. */}
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

      {/* Mascot grounding halo. */}
      <MascotHalo />

      {/* Ambient dust motes — accent-tinted, slow drift, reduce-motion
          freezes them to a still field. */}
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

      <Suspense fallback={null}>
        <ScifiPlatform />
      </Suspense>
    </>
  );
}
