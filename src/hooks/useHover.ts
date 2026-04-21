import type { ThreeEvent } from "@react-three/fiber";
import { useEffect, useState } from "react";

/**
 * R3F hover helper — tracks hover state for a mesh/group and flips the
 * document cursor to "pointer" while active. Uses stopPropagation so
 * parents don't also flicker to hovered.
 */
export function useHover() {
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!hovered) return;
    const prev = document.body.style.cursor;
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = prev;
    };
  }, [hovered]);

  return {
    hovered,
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setHovered(true);
    },
    onPointerOut: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setHovered(false);
    },
  };
}
