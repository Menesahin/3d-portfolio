import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useActiveTheme } from "@/hooks/useActiveTheme";
import type { ZoneId } from "./zones";
import { ZONES } from "./zones";

type Props = {
  zone: ZoneId;
  /** Override the default downward direction — useful for angled gallery lights. */
  offset?: [number, number, number];
  intensity?: number;
  penumbra?: number;
  angle?: number;
  /** When true, spotlight is themed accent; otherwise neutral warm fill. */
  accent?: boolean;
};

/**
 * A theatrical spotlight that aims at a zone from above, with a soft
 * penumbra. Casts shadows. Colour follows the active theme when
 * `accent` is true; otherwise a warm neutral that plays well in both
 * themes.
 */
export function ZoneSpotlight({
  zone,
  offset = [0, 12, 0],
  intensity = 4,
  penumbra = 0.7,
  angle = Math.PI / 6,
  accent = false,
}: Props) {
  const theme = useActiveTheme();
  const lightRef = useRef<THREE.SpotLight>(null);

  const [zx, zy, zz] = ZONES[zone].position;
  const [ox, oy, oz] = offset;
  const position: [number, number, number] = [zx + ox, zy + oy, zz + oz];

  // We aim the spotlight by parenting a fixed target Object3D to the scene;
  // using `useMemo` ensures it's stable across renders.
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(zx, zy + 0.3, zz);
    return o;
  }, [zx, zy, zz]);

  const color = accent ? theme.palette.accent : theme.id === "cyber" ? "#AED3FF" : "#FFE8C9";

  return (
    <>
      <primitive object={target} />
      <spotLight
        ref={lightRef}
        castShadow
        position={position}
        intensity={intensity * (theme.id === "cyber" ? 0.9 : 1.1)}
        angle={angle}
        penumbra={penumbra}
        distance={30}
        decay={1.4}
        color={color}
        target={target}
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
        shadow-bias={-0.0005}
      />
    </>
  );
}
