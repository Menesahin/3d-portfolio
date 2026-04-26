import { Billboard, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type * as THREE from "three";
import { findLastAssistant } from "@/chat/lastAssistant";
import { useActiveTheme } from "@/hooks/useActiveTheme";
import { mascotPosRef } from "@/mascot/mascotPosRef";
import { useStore } from "@/stores";
import { HoloChrome } from "./holograms/HoloChrome";
import { useHoloFade } from "./holograms/useHoloFade";

const PANEL_W = 2.8;
const PANEL_H = 1.6;
const MAX_CHARS = 280;
// Cursor character appended to the still-streaming tail so the bubble
// feels "live" without flickering.
const CURSOR = "▍";

/**
 * Speech bubble above the mascot — mirrors whatever the latest assistant
 * message currently is. Updates token-by-token while the stream is in
 * flight, fades out when there's nothing to say.
 *
 * Deliberately separate from `HologramStage`: the hologram panels are
 * content cards (experience / project / skills / contact) that show
 * when the agent fires a `content.*` tool. The speech bubble shows the
 * agent's *prose reply*, which is orthogonal and often runs alongside a
 * hologram. Keeps "what the robot said" and "what it pulled up" as two
 * separate surfaces.
 *
 * Material plumbing reuses `useHoloFade` so the bubble reads as the
 * same visual family as the wall holograms (frame flicker + selective
 * bloom on the active-state HDR boost).
 */
export function MascotSpeechBubble() {
  const theme = useActiveTheme();
  const messages = useStore((s) => s.chat.messages);
  const isStreaming = useStore((s) => s.chat.isStreaming);
  const activeContent = useStore((s) => s.world.activeContent);

  const lastAssistant = useMemo(() => findLastAssistant(messages), [messages]);
  const raw = lastAssistant?.content.trim() ?? "";
  // Keep the *tail* of long messages so the most recent token stays
  // visible while the stream continues — reads better than showing the
  // head + clipping the live portion.
  const display = raw.length > MAX_CHARS ? `…${raw.slice(-MAX_CHARS)}` : raw;
  const isStreamingThis = isStreaming && lastAssistant?.streaming === true;
  const content = display + (isStreamingThis ? CURSOR : "");

  // Hide the bubble whenever a hologram is up — the hologram panel
  // already carries the visual, no need to duplicate the prose on top
  // of it. Re-appears as soon as the user dismisses / switches away.
  const visible = raw.length > 0 && !activeContent;

  const accent = theme.palette.accent;
  const { rootRef, plateMat, haloMat, frameMat } = useHoloFade(visible ? 1 : 0, accent, 1.0);
  const [mounted, setMounted] = useState(visible);
  // Outer follow group — position driven imperatively from `mascotPosRef`
  // so the bubble tracks the mascot mid-walk instead of snapping to
  // `ZONES[anchor]` at render time.
  const followRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      return;
    }
    // Wait for the per-frame opacity tween to finish, then unmount.
    // 600 ms comfortably outlasts the useHoloFade decay.
    const id = window.setTimeout(() => setMounted(false), 600);
    return () => window.clearTimeout(id);
  }, [visible]);

  // Sits above the mascot's head so the panel never clips the silhouette.
  useFrame(() => {
    const g = followRef.current;
    if (!g) return;
    const p = mascotPosRef.current;
    g.position.set(p.x, p.y + 2.8, p.z);
  });

  if (!mounted) return null;

  return (
    <group ref={followRef}>
      <Billboard follow>
        <group ref={rootRef}>
          <HoloChrome
            width={PANEL_W}
            height={PANEL_H}
            plateMat={plateMat}
            haloMat={haloMat}
            frameMat={frameMat}
          />

          {/* Speaker tag */}
          <Text
            position={[-PANEL_W / 2 + 0.18, PANEL_H / 2 - 0.18, 0.01]}
            fontSize={0.082}
            color={accent}
            fillOpacity={0.75}
            anchorX="left"
            anchorY="middle"
            letterSpacing={0.18}
          >
            COMPANION ›
          </Text>

          {/* Message body — wraps inside the panel. */}
          <Text
            position={[0, 0, 0.01]}
            fontSize={0.1}
            color="#EEF4FF"
            fillOpacity={0.96}
            anchorX="center"
            anchorY="middle"
            textAlign="left"
            maxWidth={PANEL_W - 0.36}
            lineHeight={1.35}
          >
            {content}
          </Text>

          {/* Downward tail — small triangle below the plate pointing at the
            robot so the bubble visually attaches. */}
          <mesh
            position={[0, -PANEL_H / 2 - 0.04, 0.001]}
            rotation={[0, 0, Math.PI]}
            material={plateMat}
          >
            <coneGeometry args={[0.12, 0.22, 3]} />
          </mesh>
          <mesh
            position={[0, -PANEL_H / 2 - 0.04, 0.002]}
            rotation={[0, 0, Math.PI]}
            material={frameMat}
          >
            <ringGeometry args={[0.115, 0.13, 3]} />
          </mesh>
        </group>
      </Billboard>
    </group>
  );
}
