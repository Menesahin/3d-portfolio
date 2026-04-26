import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import * as THREE from "three";
import { useStore } from "@/stores";
import { WorldScene } from "@/world/WorldScene";

/**
 * Top-level R3F surface. Bundled separately via `React.lazy` so the
 * heavy three + drei chunk only loads after the initial HTML paint.
 *
 *  - **Fixed DPR cap `[1, 2]`** — locks the canvas to native retina
 *    resolution. `<PerformanceMonitor>` was tried but its auto-drop
 *    (1.5 → 1.0 after a few seconds of mediocre fps) resized the
 *    canvas, leaving troika's SDF font atlas at the old pixel density
 *    → blurry hologram text after ~10 s. Holding a fixed cap keeps
 *    text sharp; if a weak GPU shows up later we can ship a
 *    media-query-driven cap rather than a per-second flipper.
 *  - **ACES Filmic tone mapping** + sRGB output for accurate colour.
 *  - `frameloop="always"` keeps the mascot's animation mixer ticking.
 *  - `onPointerMissed` resets the camera to the overview shot when the
 *    user clicks the empty background.
 */
export default function Scene() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
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
      camera={{ position: [0, 2, 6], fov: 45, near: 0.1, far: 60 }}
      onPointerMissed={() => {
        // Click on empty canvas → full reset: camera to overview,
        // mascot back to hub, any active hologram dismissed.
        const apply = useStore.getState().applyUiEvent;
        apply({ kind: "world.reset" });
        apply({ kind: "mascot.return_to_hub" });
        apply({ kind: "camera.focus", target: "overview" });
      }}
    >
      <Suspense fallback={null}>
        <WorldScene />
      </Suspense>
    </Canvas>
  );
}
