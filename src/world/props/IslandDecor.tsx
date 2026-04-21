import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useActiveTheme } from "@/hooks/useActiveTheme";

/**
 * Procedural decorative props scattered on islands — crystals, plants,
 * lanterns, monitors. Deliberately low-poly and theme-aware so they
 * "belong" to both Dreamy and Cyber without separate assets.
 *
 * If you later want to replace a procedural prop with a downloaded GLB,
 * swap the matching case in the switch below; the island files don't
 * need to change.
 */

type Variant = "crystals" | "plant" | "lantern" | "monitor";

type Props = {
  variant: Variant;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
};

export function IslandDecor({
  variant,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: Props) {
  switch (variant) {
    case "crystals":
      return <Crystals position={position} rotation={rotation} scale={scale} />;
    case "plant":
      return <Plant position={position} rotation={rotation} scale={scale} />;
    case "lantern":
      return <Lantern position={position} rotation={rotation} scale={scale} />;
    case "monitor":
      return <Monitor position={position} rotation={rotation} scale={scale} />;
  }
}

// ---------------------------------------------------------------------------
//  Crystal cluster — three faceted gems, gentle rotation + emissive pulse.
// ---------------------------------------------------------------------------
function Crystals({
  position,
  rotation,
  scale,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}) {
  const theme = useActiveTheme();
  const group = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (group.current) group.current.rotation.y = s.clock.elapsedTime * 0.15;
  });
  const accent = theme.palette.accent;
  const tri: Array<[number, number, number, number]> = [
    [0, 0.35, 0, 0.26],
    [0.3, 0.22, 0.12, 0.18],
    [-0.22, 0.26, 0.08, 0.2],
  ];
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <group ref={group}>
        {tri.map(([x, y, z, r], i) => (
          <mesh key={i} position={[x, y, z]} castShadow>
            <coneGeometry args={[r, r * 2.4, 5]} />
            <meshStandardMaterial
              color={accent}
              emissive={accent}
              emissiveIntensity={theme.id === "cyber" ? 0.9 : 0.25}
              roughness={0.25}
              metalness={0.45}
              flatShading
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
//  Plant — stylised stem + leaves, very subtle sway.
// ---------------------------------------------------------------------------
function Plant({
  position,
  rotation,
  scale,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}) {
  const theme = useActiveTheme();
  const group = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (group.current) {
      group.current.rotation.z = Math.sin(s.clock.elapsedTime * 1.4) * 0.04;
    }
  });
  const leaf = theme.id === "cyber" ? "#3b8f5a" : "#6fb79a";
  const pot = theme.palette.plinth;
  return (
    <group position={position} rotation={rotation} scale={scale} ref={group}>
      {/* Pot */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.14, 0.2, 10]} />
        <meshStandardMaterial color={pot} roughness={0.8} />
      </mesh>
      {/* Stem */}
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.3, 6]} />
        <meshStandardMaterial color="#6b8f58" roughness={0.7} />
      </mesh>
      {/* Leaves */}
      {[
        [0, 0.5, 0, 1] as const,
        [0.12, 0.45, 0, 0.85] as const,
        [-0.1, 0.48, 0.05, 0.8] as const,
      ].map(([x, y, z, s]) => (
        <mesh key={`${x}-${y}-${z}`} position={[x, y, z]} castShadow scale={s}>
          <icosahedronGeometry args={[0.16, 0]} />
          <meshStandardMaterial color={leaf} roughness={0.85} flatShading />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
//  Lantern — post + shade with a soft emissive core.
// ---------------------------------------------------------------------------
function Lantern({
  position,
  rotation,
  scale,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}) {
  const theme = useActiveTheme();
  const coreRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((s) => {
    if (coreRef.current) {
      const glow = 0.9 + Math.sin(s.clock.elapsedTime * 1.8) * 0.25;
      coreRef.current.emissiveIntensity = glow;
    }
  });
  const metal = theme.palette.plinth;
  const glow = theme.id === "cyber" ? (theme.palette.accent2 ?? theme.palette.accent) : "#FFC878";
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.04, 0.5, 8]} />
        <meshStandardMaterial color={metal} metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.16, 0.18, 8, 1, true]} />
        <meshStandardMaterial
          color={metal}
          metalness={0.6}
          roughness={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.53, 0]}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial
          ref={coreRef}
          color={glow}
          emissive={glow}
          emissiveIntensity={1}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
//  Monitor — small upright screen with a scrolling bar (fits "projects").
// ---------------------------------------------------------------------------
function Monitor({
  position,
  rotation,
  scale,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}) {
  const theme = useActiveTheme();
  const barRef = useRef<THREE.Mesh>(null);
  const screenSize = useMemo(() => new THREE.Vector2(0.42, 0.26), []);
  useFrame((s) => {
    if (barRef.current) {
      const v = (Math.sin(s.clock.elapsedTime * 1.1) + 1) / 2;
      barRef.current.position.x = -screenSize.x / 2 + v * screenSize.x * 0.8;
    }
  });
  const accent = theme.palette.accent;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Stand */}
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.14, 0.12, 16]} />
        <meshStandardMaterial color={theme.palette.plinth} roughness={0.6} />
      </mesh>
      {/* Neck */}
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.2, 8]} />
        <meshStandardMaterial color="#8A8D96" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Screen frame */}
      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[0.56, 0.34, 0.06]} />
        <meshStandardMaterial color={theme.palette.plinth} roughness={0.5} />
      </mesh>
      {/* Screen */}
      <mesh position={[0, 0.42, 0.032]}>
        <planeGeometry args={[screenSize.x, screenSize.y]} />
        <meshStandardMaterial
          color={theme.id === "cyber" ? "#062c33" : "#1a2a3a"}
          emissive={theme.id === "cyber" ? "#0a4a55" : "#22384b"}
          emissiveIntensity={0.4}
        />
      </mesh>
      {/* Animated accent bar on screen */}
      <mesh ref={barRef} position={[0, 0.42, 0.034]}>
        <planeGeometry args={[0.08, 0.02]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.5} />
      </mesh>
    </group>
  );
}
