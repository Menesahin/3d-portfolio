import { useMemo } from "react";
import { useActiveTheme } from "@/hooks/useActiveTheme";
import { COCKPIT_V7_WALL_SLOTS } from "@/world/cockpit/v7/layout";
import { useHoloFade } from "./useHoloFade";

const COCKPIT_SCREEN_BASE_SCALE = 1.32;
type WallSlotId = keyof typeof COCKPIT_V7_WALL_SLOTS;

/**
 * Single hook that wires up everything a wall hologram needs from the
 * shared infrastructure: position + rotation from the V7 layout, the
 * fade-driven materials from `useHoloFade`, and the active theme accent
 * (so callers don't repeat `useActiveTheme().palette.accent`).
 *
 * Each wall hologram (Experience / Projects / Skills) used to repeat
 * the same 6-line top block by hand. Now:
 *   const { rootRef, plateMat, haloMat, frameMat, scanlineMat,
 *           position, rotation, accent } = useWallSlot(id, intensity);
 */
export function useWallSlot(slotId: WallSlotId, intensity: number) {
  const theme = useActiveTheme();
  const accent = theme.palette.accent;
  const fade = useHoloFade(intensity, accent, COCKPIT_SCREEN_BASE_SCALE);

  const slot = COCKPIT_V7_WALL_SLOTS[slotId];
  const position = useMemo<[number, number, number]>(
    () => [slot.position[0], slot.position[1], slot.position[2]],
    [slot.position],
  );
  const rotation = useMemo<[number, number, number]>(
    () => [slot.rotation[0], slot.rotation[1], slot.rotation[2]],
    [slot.rotation],
  );

  return { ...fade, position, rotation, accent };
}
