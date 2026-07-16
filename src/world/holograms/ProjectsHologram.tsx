import { Html, Text } from "@react-three/drei";
import { getContent } from "@/content/portfolio";
import { useStore } from "@/stores";
import type { ProjectId } from "@/types/tools";
import { ORBIT_ALTITUDE_KM, ORBIT_PERIOD_SECONDS, ORBIT_SPEED_KM_S } from "@/world/cockpit/orbit";
import { HoloChrome } from "./HoloChrome";
import { ProjectThumb } from "./ProjectThumb";
import { HOLO_COLOR_BODY, HOLO_COLOR_SOFT } from "./tokens";
import { useWallSlot } from "./useWallSlot";

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
  const cockpitStatus = useStore((s) => s.cockpit.statusMessage);
  const flightMode = useStore((s) => s.cockpit.flightMode);
  const { rootRef, plateMat, haloMat, frameMat, scanlineMat, position, rotation, accent } =
    useWallSlot("projects", intensity);

  const activeCard = getContent({ kind: "project", project: active });
  const activeLinkHref = activeCard?.link?.href;
  const isActiveSection = intensity > 0.6;

  const cockpitProject = PROJECTS.find((project) => project.id === active) ?? PROJECTS[0]!;
  const tabXs = [-2.52, -0.84, 0.84, 2.52] as const;

  return (
    <group position={position} rotation={rotation}>
      <group ref={rootRef}>
        <HoloChrome
          width={6.72}
          height={2.38}
          plateMat={plateMat}
          haloMat={haloMat}
          frameMat={frameMat}
          scanlineMat={scanlineMat}
        />

        <Text
          position={[-3.08, 1.03, 0.018]}
          fontSize={0.105}
          color={accent}
          anchorX="left"
          anchorY="middle"
          fontWeight={700}
          letterSpacing={0.14}
        >
          PROJECT OPS / ACTIVE BUILD
        </Text>
        <Text
          position={[3.08, 1.03, 0.018]}
          fontSize={0.062}
          color="#9DB8BD"
          anchorX="right"
          anchorY="middle"
          letterSpacing={0.055}
        >
          {`MEO ${ORBIT_ALTITUDE_KM.toLocaleString("en-US")} KM · ${ORBIT_SPEED_KM_S.toFixed(2)} KM/S · ${(ORBIT_PERIOD_SECONDS / 60).toFixed(0)} MIN`}
        </Text>

        <group position={[-1.93, 0.1, 0.018]}>
          <ProjectThumb
            projectId={cockpitProject.id}
            title={cockpitProject.title}
            width={2.45}
            height={1.42}
            opacity={1}
          />
          <mesh position={[0, -0.82, 0]} material={frameMat}>
            <planeGeometry args={[2.45, 0.018]} />
          </mesh>
          <Text
            position={[-1.2, -0.95, 0.012]}
            fontSize={0.08}
            color="#9DB8BD"
            anchorX="left"
            anchorY="middle"
            letterSpacing={0.08}
          >
            VISUAL FEED · VERIFIED
          </Text>
        </group>

        <Text
          position={[-0.48, 0.7, 0.02]}
          fontSize={0.17}
          color={accent}
          anchorX="left"
          anchorY="middle"
          fontWeight={700}
          maxWidth={3.35}
        >
          {cockpitProject.title}
        </Text>
        <Text
          position={[-0.48, 0.49, 0.02]}
          fontSize={0.085}
          color={HOLO_COLOR_SOFT}
          fillOpacity={0.78}
          anchorX="left"
          anchorY="middle"
          letterSpacing={0.08}
        >
          {cockpitProject.subtitle.toUpperCase()}
        </Text>
        <mesh position={[1.26, 0.35, 0.012]} material={frameMat}>
          <planeGeometry args={[3.48, 0.01]} />
        </mesh>

        {cockpitProject.bullets.map((bullet, index) => (
          <Text
            key={`${cockpitProject.id}-cockpit-${bullet}`}
            position={[-0.48, 0.17 - index * 0.25, 0.02]}
            fontSize={0.1}
            color={HOLO_COLOR_BODY}
            fillOpacity={0.9}
            anchorX="left"
            anchorY="middle"
            maxWidth={3.5}
            lineHeight={1.25}
          >
            {`▸ ${bullet}`}
          </Text>
        ))}

        {isActiveSection && activeLinkHref ? (
          <Html
            position={[2.42, -0.62, 0.035]}
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
              Launch project ↗
            </a>
          </Html>
        ) : (
          <Text
            position={[2.94, -0.62, 0.02]}
            fontSize={0.075}
            color="#D6A36C"
            anchorX="right"
            anchorY="middle"
            letterSpacing={0.1}
          >
            LOCAL BUILD
          </Text>
        )}

        {PROJECTS.map((project, index) => {
          const selected = project.id === active;
          return (
            <group key={`${project.id}-cockpit-tab`} position={[tabXs[index] ?? 0, -1.0, 0.03]}>
              <mesh
                onClick={(event) => {
                  event.stopPropagation();
                  showContent({ kind: "project", project: project.id });
                }}
                onPointerOver={(event) => {
                  event.stopPropagation();
                  document.body.style.cursor = "pointer";
                }}
                onPointerOut={() => {
                  document.body.style.cursor = "";
                }}
              >
                <planeGeometry args={[1.5, 0.25]} />
                <meshBasicMaterial
                  color={selected ? accent : "#122229"}
                  transparent
                  opacity={selected ? 0.34 : 0.7}
                  depthWrite={false}
                />
              </mesh>
              <Text
                position={[0, 0, 0.012]}
                fontSize={0.078}
                color={selected ? "#EAF8F8" : "#8FA6AA"}
                anchorX="center"
                anchorY="middle"
                fontWeight={selected ? 700 : 500}
                letterSpacing={0.06}
              >
                {project.title.toUpperCase()}
              </Text>
            </group>
          );
        })}

        <Text
          position={[3.08, -0.79, 0.02]}
          fontSize={0.06}
          color={flightMode === "warp" ? "#FF826F" : "#7ED9E5"}
          anchorX="right"
          anchorY="middle"
          letterSpacing={0.055}
          maxWidth={3.7}
        >
          {`${flightMode.toUpperCase()} · ${cockpitStatus}`}
        </Text>

        <mesh
          position={[0, 0, -0.05]}
          onClick={(event) => {
            event.stopPropagation();
            onDismiss();
          }}
        >
          <planeGeometry args={[6.72, 2.38]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}
