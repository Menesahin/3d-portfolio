import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useActiveTheme } from "@/hooks/useActiveTheme";
import { useStore } from "@/stores";
import { type ZoneId, ZONES } from "@/world/zones";

/**
 * Small shader-driven ripple that plays whenever the mascot arrives at
 * a new zone. Subscribes to the store's `mascot.currentZone` so it fires
 * once per arrival — no manual plumbing. Auto-clears after the ripple
 * finishes its life.
 */

type Ripple = { id: number; zone: ZoneId; born: number };

const LIFE = 1.3;

export function ArrivalRipple() {
  const theme = useActiveTheme();
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const nextId = useRef(0);
  const prevZone = useRef<ZoneId | null>(null);

  useEffect(() => {
    // Subscribe imperatively so we fire on arrival regardless of React batching.
    const unsub = useStore.subscribe(
      (s) => s.mascot.currentZone,
      (zone) => {
        // Skip the initial mount arrival at hub — only fire on real transitions.
        if (prevZone.current !== null && prevZone.current !== zone) {
          setRipples((list) => [
            ...list,
            { id: nextId.current++, zone, born: performance.now() / 1000 },
          ]);
        }
        prevZone.current = zone;
      },
    );
    return unsub;
  }, []);

  return (
    <>
      {ripples.map((r) => (
        <RippleMesh
          key={r.id}
          ripple={r}
          color={theme.palette.accent}
          onDone={() => setRipples((list) => list.filter((x) => x.id !== r.id))}
        />
      ))}
    </>
  );
}

function RippleMesh({
  ripple,
  color,
  onDone,
}: {
  ripple: Ripple;
  color: string;
  onDone: () => void;
}) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const colorObj = useRef(new THREE.Color(color));

  useFrame((s) => {
    if (!mesh.current || !mat.current) return;
    const age = s.clock.elapsedTime - ripple.born;
    const t = age / LIFE;
    if (t >= 1) {
      onDone();
      return;
    }
    const scale = 0.8 + t * 5.2;
    mesh.current.scale.setScalar(scale);
    mat.current.opacity = (1 - t) * 0.8;
    colorObj.current.set(color);
    mat.current.color.copy(colorObj.current);
  });

  const [zx, zy, zz] = ZONES[ripple.zone].position;
  return (
    <mesh
      ref={mesh}
      position={[zx, zy + 0.45, zz]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <ringGeometry args={[0.4, 0.5, 48]} />
      <meshBasicMaterial
        ref={mat}
        color={color}
        transparent
        opacity={0.8}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
