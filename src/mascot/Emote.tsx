import { Billboard, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type * as THREE from "three";
import { useActiveTheme } from "@/hooks/useActiveTheme";
import { useStore } from "@/stores";
import type { EmoteIcon } from "@/types/tools";

/** Simple glyph map — we use geometric/typographic characters so any
 *  system font renders them. Swap to SVG-textured sprites for richer art. */
const GLYPH: Record<EmoteIcon, string> = {
  heart: "♥",
  question: "?",
  lightbulb: "✦",
  sparkle: "✧",
  zzz: "Z",
  exclamation: "!",
  star: "★",
  note: "♪",
};

/** Auto-clears the emote after this many seconds. */
const EMOTE_LIFESPAN = 2.4;

type Props = { anchor: [number, number, number] };

export function Emote({ anchor }: Props) {
  const theme = useActiveTheme();
  const emote = useStore((s) => s.mascot.emote);
  const setEmote = useStore((s) => s.setEmote);
  const billboardRef = useRef<THREE.Group>(null);

  // Auto-clear after lifespan
  useEffect(() => {
    if (!emote) return;
    const id = setTimeout(() => setEmote(null), EMOTE_LIFESPAN * 1000);
    return () => clearTimeout(id);
  }, [emote, setEmote]);

  // Float + scale pop
  const born = useRef(0);
  useEffect(() => {
    if (emote) born.current = performance.now() / 1000;
  }, [emote]);

  useFrame((state) => {
    if (!billboardRef.current || !emote) return;
    const age = state.clock.elapsedTime - born.current;
    const pop = Math.min(1, age * 5);
    const rise = Math.min(0.35, age * 0.25);
    billboardRef.current.position.set(anchor[0], anchor[1] + rise, anchor[2]);
    billboardRef.current.scale.setScalar(pop);
  });

  if (!emote) return null;

  return (
    <Billboard ref={billboardRef} position={anchor}>
      <Text
        fontSize={0.45}
        color={theme.palette.accent}
        outlineWidth={0.015}
        outlineColor={theme.palette.ink}
        anchorX="center"
        anchorY="middle"
      >
        {GLYPH[emote]}
      </Text>
    </Billboard>
  );
}
