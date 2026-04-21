import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import * as THREE from "three";
import { PostFX } from "@/world/PostFX";
import { WorldScene } from "@/world/WorldScene";

/**
 * Top-level R3F surface. Bundled separately via `React.lazy` so the heavy
 * three + r3f + drei chunk only loads after the initial HTML paint (see
 * plan §9.9 — code splitting).
 */
export default function Scene() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.8]}
      frameloop="always"
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        stencil: false,
        depth: true,
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.0;
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
      camera={{ position: [0, 12, 22], fov: 45, near: 0.1, far: 300 }}
    >
      <Suspense fallback={null}>
        <WorldScene />
        <PostFX />
      </Suspense>
    </Canvas>
  );
}
