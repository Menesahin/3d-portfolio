import { Html, Text } from "@react-three/drei";
import type * as THREE from "three";
import { getContent } from "@/content/portfolio";
import { useHover } from "@/hooks/useHover";
import { useStore } from "@/stores";
import type { ProjectId } from "@/types/tools";
import { HoloChrome } from "./HoloChrome";
import { ProjectThumb } from "./ProjectThumb";
import {
  HOLO_ALPHA_HEADER,
  HOLO_ALPHA_SUBTITLE,
  HOLO_BULLET_GAP,
  HOLO_COLOR_BODY,
  HOLO_COLOR_SOFT,
  HOLO_FONT_BODY,
  HOLO_FONT_HEADER,
  HOLO_FONT_SUBTITLE,
  HOLO_FONT_TITLE,
  HOLO_LETTER_HEADER,
} from "./tokens";
import { useWallSlot } from "./useWallSlot";

const CARD_W = 1.4;
const CARD_H = 2.05;
const THUMB_W = 1.26;
const THUMB_H = 0.7;
// Four-card layout — even spacing, ~0.15u between edges.
const CARD_XS: Record<ProjectId, number> = {
  vocabuddy: -2.4,
  shotmock: -0.8,
  "claude-voice": 0.8,
  thecupxi: 2.4,
};

const PROJECTS: ReadonlyArray<{
  id: ProjectId;
  title: string;
  subtitle: string;
  bullets: string[];
}> = [
  {
    id: "vocabuddy",
    title: "Vocabuddy",
    subtitle: "iOS · AI",
    bullets: ["OpenAI-powered language app.", "Adaptive games + AI stories.", "Live on App Store."],
  },
  {
    id: "shotmock",
    title: "ShotMock",
    subtitle: "SaaS · ASO",
    bullets: [
      "App/Play Store mockups.",
      "64+ templates, canvas editor.",
      "App Store Connect sync.",
    ],
  },
  {
    id: "claude-voice",
    title: "Claude Voice",
    subtitle: "OSS · npm",
    bullets: [
      "Voice extension for Claude Code.",
      "Wake-word + local STT/TTS.",
      "Zero-config npm install.",
    ],
  },
  {
    id: "thecupxi",
    title: "The Cup XI",
    subtitle: "iOS · WC 2026",
    bullets: [
      "SwiftUI starting-XI builder.",
      "API-Football + Redis cache.",
      "NestJS + PostgreSQL backend.",
    ],
  },
];

/**
 * Projects showcase — three interactive mini-cards side by side.
 * Click any card to foreground it; hover bumps the frame + a cursor
 * affordance. The active card gets a thumbnail + an "Open live ↗"
 * DOM anchor pinned below it so visitors can jump to the product.
 *
 * Thumbnails try `/previews/{id}.webp` then fall back to a procedural
 * accent-gradient placeholder (see `ProjectThumb`).
 */
export function ProjectsHologram({
  active,
  intensity,
  onDismiss,
}: {
  active: ProjectId;
  intensity: number;
  onDismiss: () => void;
}) {
  const showContent = useStore((s) => s.showContent);
  const { rootRef, plateMat, haloMat, frameMat, scanlineMat, position, rotation, accent } =
    useWallSlot("projects", intensity);

  const activeCard = getContent({ kind: "project", project: active });
  const activeLinkHref = activeCard?.link?.href;
  const isActiveSection = intensity > 0.6;

  return (
    <group position={position} rotation={rotation}>
      <group ref={rootRef}>
        {/* Header strip. */}
        <Text
          position={[0, CARD_H / 2 + 0.22, 0.01]}
          fontSize={HOLO_FONT_HEADER}
          color={accent}
          anchorX="center"
          anchorY="middle"
          fontWeight={700}
          fillOpacity={HOLO_ALPHA_HEADER}
          letterSpacing={HOLO_LETTER_HEADER}
        >
          PROJECTS · {PROJECTS.length} LIVE
        </Text>

        {PROJECTS.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            x={CARD_XS[p.id]}
            isActive={p.id === active}
            plateMat={plateMat}
            haloMat={haloMat}
            frameMat={frameMat}
            scanlineMat={scanlineMat}
            accent={accent}
            onSelect={() => showContent({ kind: "project", project: p.id })}
          />
        ))}

        {/* Open-live button — DOM anchor pinned below the active card.
            Only rendered when this section is the active one; otherwise
            an idle wall would have a stale clickable button. */}
        {isActiveSection && activeLinkHref && (
          <Html
            position={[CARD_XS[active], -CARD_H / 2 - 0.18, 0.02]}
            transform
            center
            occlude={false}
            distanceFactor={3}
            style={{ pointerEvents: "auto" }}
          >
            <a
              href={activeLinkHref}
              target="_blank"
              rel="noreferrer noopener"
              className="holo-open-link"
            >
              Open live ↗
            </a>
          </Html>
        )}

        {/* Dismiss hit-plane behind everything. */}
        <mesh
          position={[0, 0, -0.04]}
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
        >
          <planeGeometry args={[6.6, CARD_H + 0.6]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

function ProjectCard({
  project: p,
  x,
  isActive,
  plateMat,
  haloMat,
  frameMat,
  scanlineMat,
  accent,
  onSelect,
}: {
  project: (typeof PROJECTS)[number];
  x: number;
  isActive: boolean;
  plateMat: THREE.MeshBasicMaterial;
  haloMat: THREE.MeshBasicMaterial;
  frameMat: THREE.MeshBasicMaterial;
  scanlineMat: THREE.ShaderMaterial;
  accent: string;
  onSelect: () => void;
}) {
  const hover = useHover();
  // Constant per render — no opacityRef multiplication so text renders
  // at semantic brightness without waiting on a follow-up re-render.
  const alpha = isActive ? 1 : 0.55;
  const scale = isActive ? 1.08 : hover.hovered ? 1.03 : 1;
  const z = isActive ? 0.05 : 0;

  return (
    <group position={[x, 0, z]} scale={scale}>
      <group
        onClick={(e) => {
          e.stopPropagation();
          if (!isActive) onSelect();
        }}
        onPointerOver={hover.onPointerOver}
        onPointerOut={hover.onPointerOut}
      >
        <HoloChrome
          width={CARD_W}
          height={CARD_H}
          plateMat={plateMat}
          haloMat={haloMat}
          frameMat={frameMat}
          scanlineMat={scanlineMat}
        />

        {/* Thumbnail */}
        <group position={[0, CARD_H / 2 - THUMB_H / 2 - 0.16, 0.01]}>
          <ProjectThumb
            projectId={p.id}
            title={p.title}
            width={THUMB_W}
            height={THUMB_H}
            opacity={alpha}
          />
        </group>

        {/* Title */}
        <Text
          position={[0, CARD_H / 2 - THUMB_H - 0.32, 0.01]}
          fontSize={HOLO_FONT_TITLE}
          color={accent}
          anchorX="center"
          anchorY="middle"
          fontWeight={700}
          fillOpacity={alpha}
          maxWidth={CARD_W - 0.14}
        >
          {p.title}
        </Text>

        {/* Subtitle */}
        <Text
          position={[0, CARD_H / 2 - THUMB_H - 0.48, 0.01]}
          fontSize={HOLO_FONT_SUBTITLE}
          color={HOLO_COLOR_SOFT}
          fillOpacity={HOLO_ALPHA_SUBTITLE * alpha}
          anchorX="center"
          anchorY="middle"
        >
          {p.subtitle}
        </Text>

        {/* Divider */}
        <mesh position={[0, CARD_H / 2 - THUMB_H - 0.6, 0.008]} material={frameMat}>
          <planeGeometry args={[CARD_W * 0.82, 0.006]} />
        </mesh>

        {/* Bullets */}
        {p.bullets.map((b, i) => (
          <Text
            key={`${p.id}-b-${i}`}
            position={[-CARD_W / 2 + 0.1, CARD_H / 2 - THUMB_H - 0.78 - i * HOLO_BULLET_GAP, 0.01]}
            fontSize={HOLO_FONT_BODY}
            color={HOLO_COLOR_BODY}
            fillOpacity={0.94 * alpha}
            anchorX="left"
            anchorY="middle"
            maxWidth={CARD_W - 0.2}
            lineHeight={1.3}
          >
            {`› ${b}`}
          </Text>
        ))}
      </group>
    </group>
  );
}
