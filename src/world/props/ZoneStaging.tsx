import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import { useActiveTheme } from "@/hooks/useActiveTheme";

/**
 * Per-zone staging pieces: arches, backdrops, canopies, gallery walls,
 * signage. One component per zone so the visual language stays distinct
 * ("each island is a curated exhibition booth") while the Island primitive
 * stays unchanged.
 *
 * All procedural — swap any one for a downloaded GLB later by replacing the
 * corresponding internal function; island files don't need to change.
 */

// ---------------------------------------------------------------------------
//  HubArch — welcome gateway behind the name plate
// ---------------------------------------------------------------------------
export function HubArch() {
  const theme = useActiveTheme();
  const beamRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((s) => {
    if (!beamRef.current) return;
    beamRef.current.emissiveIntensity = 0.5 + Math.sin(s.clock.elapsedTime * 0.6) * 0.15;
  });
  const stone = theme.palette.plinth;
  const accent = theme.palette.accent;

  return (
    <group position={[0, 0, -1.6]}>
      {/* Two columns */}
      {[-1.9, 1.9].map((x) => (
        <mesh key={x} position={[x, 1.4, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.16, 2.6, 16]} />
          <meshStandardMaterial color={stone} roughness={0.85} metalness={0} flatShading />
        </mesh>
      ))}
      {/* Top beam with subtle emissive */}
      <mesh position={[0, 2.75, 0]} castShadow>
        <boxGeometry args={[4.4, 0.18, 0.3]} />
        <meshStandardMaterial
          ref={beamRef}
          color={stone}
          emissive={accent}
          emissiveIntensity={0.5}
          roughness={0.85}
          metalness={0}
          flatShading
        />
      </mesh>
      {/* Inlaid accent strip */}
      <mesh position={[0, 2.66, 0.155]}>
        <planeGeometry args={[4.2, 0.03]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.6} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
//  ExperienceArches — three spotlit archways, one per company
// ---------------------------------------------------------------------------
export function ExperienceArches() {
  const theme = useActiveTheme();
  const stone = theme.palette.plinth;
  const accent = theme.palette.accent;

  return (
    <group position={[0, 0, -1.4]}>
      {[-1.75, 0, 1.75].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          {/* Left column */}
          <mesh position={[-0.55, 1.0, 0]} castShadow>
            <boxGeometry args={[0.12, 2.0, 0.12]} />
            <meshStandardMaterial color={stone} roughness={0.85} metalness={0} flatShading />
          </mesh>
          {/* Right column */}
          <mesh position={[0.55, 1.0, 0]} castShadow>
            <boxGeometry args={[0.12, 2.0, 0.12]} />
            <meshStandardMaterial color={stone} roughness={0.85} metalness={0} flatShading />
          </mesh>
          {/* Top */}
          <mesh position={[0, 2.05, 0]} castShadow>
            <boxGeometry args={[1.3, 0.12, 0.12]} />
            <meshStandardMaterial color={stone} roughness={0.85} metalness={0} flatShading />
          </mesh>
          {/* Glow strip under top */}
          <mesh position={[0, 1.97, 0.07]}>
            <planeGeometry args={[1.1, 0.02]} />
            <meshStandardMaterial
              color={accent}
              emissive={accent}
              emissiveIntensity={theme.id === "cyber" ? 1.8 : 0.9}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
//  ProjectsBackdrop — curved LED wall behind the three project monitors
// ---------------------------------------------------------------------------
export function ProjectsBackdrop() {
  const theme = useActiveTheme();
  const matRef = useRef<THREE.ShaderMaterial>(null);
  // Uniforms MUST be stable across renders; colour/intensity values are
  // mutated in useFrame below so the material tracks the theme without
  // React rebuilding the material.
  const [uniforms] = useState(() => ({
    uTime: { value: 0 },
    uColorA: { value: new THREE.Color(theme.palette.accent) },
    uColorB: { value: new THREE.Color(theme.palette.accent2 ?? theme.palette.accent) },
    uIntensity: { value: theme.id === "cyber" ? 1.8 : 0.9 },
  }));

  useFrame((s) => {
    const u = matRef.current?.uniforms;
    if (u?.uTime) {
      u.uTime.value = s.clock.elapsedTime;
    }
    // Keep uniform colors in sync with the active theme on theme change.
    (uniforms.uColorA.value as THREE.Color).set(theme.palette.accent);
    (uniforms.uColorB.value as THREE.Color).set(theme.palette.accent2 ?? theme.palette.accent);
    uniforms.uIntensity.value = theme.id === "cyber" ? 1.8 : 0.9;
  });

  return (
    <group position={[0, 0, -1.6]}>
      {/* Curved backdrop */}
      <mesh>
        <torusGeometry args={[3.2, 1.3, 2, 24, Math.PI * 0.85]} />
        <meshStandardMaterial
          color={theme.palette.plinth}
          roughness={0.85}
          metalness={0}
          side={THREE.DoubleSide}
          flatShading
        />
      </mesh>
      {/* Emissive inner ribbon on the backdrop */}
      <mesh position={[0, 1.8, -0.02]}>
        <planeGeometry args={[5.5, 0.18, 1, 1]} />
        <shaderMaterial
          ref={matRef}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          vertexShader={`
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            varying vec2 vUv;
            uniform float uTime;
            uniform vec3 uColorA;
            uniform vec3 uColorB;
            uniform float uIntensity;
            void main() {
              float wave = sin(vUv.x * 18.0 - uTime * 1.8) * 0.5 + 0.5;
              vec3 c = mix(uColorA, uColorB, wave);
              gl_FragColor = vec4(c * uIntensity, 0.95);
            }
          `}
        />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
//  SkillsCanopy — orbital ring above the skills constellation
// ---------------------------------------------------------------------------
export function SkillsCanopy() {
  const theme = useActiveTheme();
  const ringRef = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ringRef.current) ringRef.current.rotation.y += dt * 0.08;
  });
  return (
    <group position={[0, 2.2, 0]}>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.4, 0.04, 8, 48]} />
        <meshStandardMaterial
          color={theme.palette.accent}
          emissive={theme.palette.accent}
          emissiveIntensity={theme.id === "cyber" ? 1.8 : 0.45}
          roughness={0.6}
          metalness={0}
        />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
//  GalleryWall — subtle vertical panel behind the picture frames
// ---------------------------------------------------------------------------
export function GalleryWall() {
  const theme = useActiveTheme();
  return (
    <group position={[0, 0, -1.05]}>
      <mesh position={[0, 1.4, 0]}>
        <planeGeometry args={[5.4, 2.6]} />
        <meshStandardMaterial
          color={theme.palette.island}
          roughness={0.95}
          metalness={0}
          flatShading
        />
      </mesh>
      {/* Floor strip / cornice */}
      <mesh position={[0, 0.25, 0.02]}>
        <boxGeometry args={[5.4, 0.08, 0.06]} />
        <meshStandardMaterial
          color={theme.palette.accent}
          emissive={theme.palette.accent}
          emissiveIntensity={theme.id === "cyber" ? 1.2 : 0.3}
        />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
//  ContactSignage — floating "CONTACT" sign above the terminal
// ---------------------------------------------------------------------------
export function ContactSignage() {
  const theme = useActiveTheme();
  const glowRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((state) => {
    if (!glowRef.current) return;
    glowRef.current.emissiveIntensity = 1 + Math.sin(state.clock.elapsedTime * 2.4) * 0.35;
  });
  return (
    <group position={[0, 2.4, 0]}>
      <mesh>
        <boxGeometry args={[2.0, 0.55, 0.08]} />
        <meshStandardMaterial
          ref={glowRef}
          color={theme.palette.plinth}
          emissive={theme.palette.accent}
          emissiveIntensity={1}
          roughness={0.85}
          metalness={0}
          flatShading
        />
      </mesh>
      <Text
        position={[0, 0, 0.06]}
        fontSize={0.22}
        color={theme.palette.ink}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.15}
      >
        GET IN TOUCH
      </Text>
    </group>
  );
}
