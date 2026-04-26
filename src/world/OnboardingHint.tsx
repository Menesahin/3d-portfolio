import { Billboard, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { onboarding } from "@/content/onboarding";
import { useActiveTheme } from "@/hooks/useActiveTheme";
import { useStore } from "@/stores";

/**
 * First-visit 3D hint text anchored above the mascot. Fades out after
 * 10s OR when the user sends their first message — whichever happens
 * first. Billboarded to stay readable from any camera shot.
 */
const TIMEOUT_MS = 10_000;

export function OnboardingHint() {
  const theme = useActiveTheme();
  const lang = useStore((s) => s.lang);
  const hasMessages = useStore((s) => s.chat.messages.some((m) => m.role === "user"));

  const [armed, setArmed] = useState(true);
  const opacityRef = useRef(0);
  const textRef = useRef<{
    fillOpacity: number;
    outlineOpacity: number;
  } | null>(null);

  // Auto-dismiss after TIMEOUT_MS — a visitor idling without chatting
  // still gets a clean scene.
  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(false), TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [armed]);

  // User sent something → drop the hint.
  useEffect(() => {
    if (hasMessages) setArmed(false);
  }, [hasMessages]);

  useFrame((_, dt) => {
    const target = armed ? 1 : 0;
    const k = 1 - Math.exp(-4 * dt);
    opacityRef.current += (target - opacityRef.current) * k;
    if (textRef.current) {
      textRef.current.fillOpacity = 0.9 * opacityRef.current;
      textRef.current.outlineOpacity = 0.5 * opacityRef.current;
    }
  });

  if (!armed && opacityRef.current < 0.01) return null;

  const copy = onboarding[lang].hint;

  return (
    <Billboard position={[0, 2.6, 0]} follow>
      <Text
        ref={(t) => {
          textRef.current = t as unknown as { fillOpacity: number; outlineOpacity: number };
        }}
        fontSize={0.18}
        color={theme.palette.accent}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.005}
        outlineColor="#000"
        outlineOpacity={0.5}
        fillOpacity={0.9}
      >
        {copy}
      </Text>
    </Billboard>
  );
}
