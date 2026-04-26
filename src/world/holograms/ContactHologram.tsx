import { Billboard, Html, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type * as THREE from "three";
import { useActiveTheme } from "@/hooks/useActiveTheme";
import { useClipboard } from "@/hooks/useClipboard";
import { mascotPosRef } from "@/mascot/mascotPosRef";
import { HoloChrome } from "./HoloChrome";
import {
  HOLO_ALPHA_HEADER,
  HOLO_ALPHA_SUBTITLE,
  HOLO_COLOR_SOFT,
  HOLO_FONT_HEADER,
  HOLO_FONT_SUBTITLE,
  HOLO_LETTER_HEADER,
  HOLO_OFFSET_HEADER,
  HOLO_OFFSET_TITLE,
} from "./tokens";
import { useHoloFade } from "./useHoloFade";

const PANEL_W = 3.0;
const PANEL_H = 2.0;

type Channel = { key: string; glyph: string; label: string; value: string; href: string };

const CHANNELS: Channel[] = [
  {
    key: "email",
    glyph: "✉",
    label: "menesahin99@gmail.com",
    value: "menesahin99@gmail.com",
    href: "mailto:menesahin99@gmail.com",
  },
  {
    key: "linkedin",
    glyph: "in",
    label: "linkedin.com/in/menesahin",
    value: "https://linkedin.com/in/menesahin",
    href: "https://linkedin.com/in/menesahin",
  },
];

/**
 * Contact close-up — DOM link rows via drei `<Html transform>` so the
 * email / linkedin / phone entries are real tappable targets with
 * native cursor affordance, mailto / tel handlers, and per-row copy
 * buttons. The chrome (header + subtitle + divider) stays 3D SDF text
 * to match the rest of the holograms.
 */
export function ContactHologram({
  visible,
  onDismiss,
}: {
  visible: boolean;
  onDismiss: () => void;
}) {
  const theme = useActiveTheme();
  const { rootRef, plateMat, haloMat, frameMat, scanlineMat } = useHoloFade(
    visible ? 1 : 0,
    theme.palette.accent,
    1.4,
  );
  const [mounted, setMounted] = useState(visible);
  // Outer group whose position we drive imperatively from `mascotPosRef`,
  // so the panel tracks the mascot's lerped position during a walk
  // instead of snapping to ZONES[anchor] at render time.
  const followRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      return;
    }
    // Same fade-then-unmount pattern as HologramStage / MascotSpeechBubble:
    // a single 600 ms timeout comfortably outlasts the useHoloFade tween,
    // no per-frame polling needed.
    const id = window.setTimeout(() => setMounted(false), 600);
    return () => window.clearTimeout(id);
  }, [visible]);

  // Sit beside the mascot at shoulder height — offset is camera-right,
  // up by 2.0u, and pulled 0.4u toward the back wall so the panel
  // doesn't clip the mascot silhouette in the contact close-up shot.
  useFrame(() => {
    const g = followRef.current;
    if (!g) return;
    const p = mascotPosRef.current;
    g.position.set(p.x + 2.4, p.y + 2.0, p.z - 0.4);
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
            scanlineMat={scanlineMat}
          />

          {/* Header */}
          <Text
            position={[0, PANEL_H / 2 - HOLO_OFFSET_HEADER, 0.01]}
            fontSize={HOLO_FONT_HEADER}
            color={theme.palette.accent}
            anchorX="center"
            anchorY="middle"
            fontWeight={700}
            fillOpacity={HOLO_ALPHA_HEADER}
            letterSpacing={HOLO_LETTER_HEADER}
          >
            CONTACT · ONLINE
          </Text>
          <Text
            position={[0, PANEL_H / 2 - HOLO_OFFSET_TITLE, 0.01]}
            fontSize={HOLO_FONT_SUBTITLE}
            color={HOLO_COLOR_SOFT}
            fillOpacity={HOLO_ALPHA_SUBTITLE}
            anchorX="center"
            anchorY="middle"
          >
            Enes Şahin · Ankara, Turkey
          </Text>

          {/* Divider */}
          <mesh position={[0, PANEL_H / 2 - HOLO_OFFSET_TITLE - 0.16, 0.008]} material={frameMat}>
            <planeGeometry args={[PANEL_W * 0.82, 0.006]} />
          </mesh>

          {/* Interactive link rows — DOM so hover/click/copy work. */}
          <Html
            position={[0, -0.05, 0.02]}
            transform
            center
            occlude={false}
            distanceFactor={3}
            style={{ width: 420, pointerEvents: "auto" }}
          >
            <div className="holo-link-stack">
              {CHANNELS.map((c) => (
                <ContactLinkRow key={c.key} channel={c} />
              ))}
            </div>
          </Html>

          {/* Dismiss hit-plane — clicks outside the HTML row still close. */}
          <mesh
            position={[0, 0, -0.03]}
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
          >
            <planeGeometry args={[PANEL_W, PANEL_H]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      </Billboard>
    </group>
  );
}

function ContactLinkRow({ channel }: { channel: Channel }) {
  const { copy, copied } = useClipboard();
  return (
    <a
      href={channel.href}
      target={channel.href.startsWith("http") ? "_blank" : undefined}
      rel={channel.href.startsWith("http") ? "noreferrer noopener" : undefined}
      className="holo-link-row"
    >
      <span className="holo-link-glyph">{channel.glyph}</span>
      <span className="holo-link-label">{channel.label}</span>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void copy(channel.value);
        }}
        className="holo-link-copy"
        aria-label={`Copy ${channel.key}`}
      >
        {copied ? "✓" : "⧉"}
      </button>
    </a>
  );
}
