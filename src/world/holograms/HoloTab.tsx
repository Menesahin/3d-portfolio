import { Text } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useHover } from "@/hooks/useHover";
import {
  HOLO_ALPHA_TAB_ACTIVE,
  HOLO_ALPHA_TAB_INACTIVE,
  HOLO_FONT_TAB,
  HOLO_LETTER_TAB,
} from "./tokens";

/**
 * Single hologram-tab primitive shared by Experience + Skills wall
 * panels. Both holograms previously had a private `MilestoneTab` /
 * `SkillTab` that were 100 % structurally identical — only the prop
 * name and one underline-width constant differed.
 *
 * Behaviour:
 *  - Hovered or active → background plane fades in (accent-tinted)
 *  - Active → small frame underline at the bottom of the tab
 *  - Click on a non-active tab fires `onSelect` (active tabs are inert)
 *  - Background material is hoisted via `useMemo` + disposed on unmount
 *    so hover state changes don't allocate per render.
 */
export function HoloTab({
  label,
  x,
  y,
  width,
  height,
  isActive,
  accent,
  frameMat,
  underlineWidth,
  onSelect,
}: {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isActive: boolean;
  accent: string;
  frameMat: THREE.MeshBasicMaterial;
  /** Underline plane width when active. Tabs vary slightly in spacing. */
  underlineWidth: number;
  onSelect: () => void;
}) {
  const hover = useHover();
  const bgOpacity = isActive ? 0.22 : hover.hovered ? 0.1 : 0;
  const textAlpha = isActive
    ? HOLO_ALPHA_TAB_ACTIVE
    : hover.hovered
      ? 0.82
      : HOLO_ALPHA_TAB_INACTIVE;

  // Hoist the tab-background material out of JSX so a hover state change
  // mutates an existing instance instead of allocating a new one each
  // render. Color is bound to `accent` (changes only on theme switch);
  // opacity is the per-frame state and is set imperatively below.
  const tabBgMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(accent),
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [accent],
  );
  useEffect(
    () => () => {
      tabBgMat.dispose();
    },
    [tabBgMat],
  );
  tabBgMat.opacity = bgOpacity;

  return (
    <group position={[x, y, 0]}>
      <group
        onClick={(e) => {
          e.stopPropagation();
          if (!isActive) onSelect();
        }}
        onPointerOver={hover.onPointerOver}
        onPointerOut={hover.onPointerOut}
      >
        <mesh position={[0, 0, 0.005]} material={tabBgMat}>
          <planeGeometry args={[width, height]} />
        </mesh>

        {isActive ? (
          <mesh position={[0, -height / 2 + 0.01, 0.006]} material={frameMat}>
            <planeGeometry args={[underlineWidth, 0.008]} />
          </mesh>
        ) : null}

        <Text
          position={[0, 0, 0.01]}
          fontSize={HOLO_FONT_TAB}
          color={accent}
          anchorX="center"
          anchorY="middle"
          fontWeight={700}
          fillOpacity={textAlpha}
          letterSpacing={HOLO_LETTER_TAB}
          maxWidth={width - 0.1}
        >
          {label}
        </Text>
      </group>
    </group>
  );
}
