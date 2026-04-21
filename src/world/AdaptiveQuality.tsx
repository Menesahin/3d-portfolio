import { PerformanceMonitor } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useCallback } from "react";

/**
 * Adaptive DPR — watches the renderer's frame-time budget and drops pixel
 * ratio when the scene starts struggling. Keeps a friendly floor of 1.0
 * so text stays crisp on mobile even in low-perf mode.
 *
 * Mount once inside the Canvas.
 */
export function AdaptiveQuality() {
  const setDpr = useThree((s) => s.setDpr);
  const dpr = useThree((s) => s.viewport.dpr);

  const onDecline = useCallback(() => {
    setDpr(Math.max(1, dpr - 0.25));
  }, [setDpr, dpr]);

  const onIncline = useCallback(() => {
    setDpr(Math.min(1.8, dpr + 0.25));
  }, [setDpr, dpr]);

  return <PerformanceMonitor onDecline={onDecline} onIncline={onIncline} />;
}
