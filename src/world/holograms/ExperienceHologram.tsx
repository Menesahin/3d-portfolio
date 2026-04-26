import { Text } from "@react-three/drei";
import { useStore } from "@/stores";
import type { CompanyId } from "@/types/tools";
import { HoloChrome } from "./HoloChrome";
import { HoloTab } from "./HoloTab";
import {
  HOLO_ALPHA_BODY,
  HOLO_ALPHA_CAPTION,
  HOLO_ALPHA_HEADER,
  HOLO_ALPHA_SUBTITLE,
  HOLO_ALPHA_TITLE,
  HOLO_BULLET_GAP,
  HOLO_BULLETS_START_GAP,
  HOLO_COLOR_BODY,
  HOLO_COLOR_MUTED,
  HOLO_COLOR_SOFT,
  HOLO_FONT_BODY,
  HOLO_FONT_CAPTION,
  HOLO_FONT_HEADER,
  HOLO_FONT_SUBTITLE,
  HOLO_FONT_TITLE,
  HOLO_LETTER_CAPTION,
  HOLO_LETTER_HEADER,
  HOLO_OFFSET_CAPTION,
  HOLO_OFFSET_HEADER,
  HOLO_OFFSET_SUBTITLE,
  HOLO_OFFSET_TAB_ROW,
  HOLO_OFFSET_TITLE,
} from "./tokens";
import { useWallSlot } from "./useWallSlot";

const PANEL_W = 4.2;
const PANEL_H = 2.6;
const TAB_W = 1.26;
const TAB_H = 0.32;
const TAB_GAP = 0.12;
const TAB_ROW_Y = PANEL_H / 2 - HOLO_OFFSET_TAB_ROW;

type Milestone = {
  id: CompanyId;
  title: string;
  tabLabel: string;
  years: string;
  bullets: string[];
  tech: string;
};

/**
 * Experience timeline — chronological tab strip (ING → Formica → Nar)
 * plus a full detail view for the active company underneath. Same UI
 * vocabulary as `SkillsHologram` so visitors learn the pattern once.
 */
const MILESTONES: Milestone[] = [
  {
    id: "ing-bank",
    title: "ING Bank",
    tabLabel: "ING · '22",
    years: "Software Engineer · 2022 (remote)",
    bullets: [
      "Contributed to large-scale tech transformation within the loan division.",
      "Supported monolith → microservices migration; resilience + inter-service comms.",
      "Optimised data-intensive screens with complex DB queries for loan processing.",
      "Operated inside enterprise-grade banking infra and strict compliance workflows.",
    ],
    tech: "Java · Spring · Microservices · Oracle · Enterprise compliance",
  },
  {
    id: "formica",
    title: "Formica AI",
    tabLabel: "FORMICA · '22–'25",
    years: "Software Engineer · 2022 → 2025 (remote, Istanbul)",
    bullets: [
      "Built a Risk Management Platform from scratch — Fraud, AML, KYC — for banks + fintech on a multitenant backend.",
      "Designed LLM-powered tools: PDF chatbot, automated data generators, AI report analyzers for compliance workflows.",
      "Shipped a custom UI component library + drag-drop framework integrating Figma specs with rich data viz.",
      "Built Elasticsearch dashboards + high-volume import/export pipelines (batch + pub/sub).",
      "Architected both monolith and microservices apps.",
    ],
    tech: "Java · Spring Boot · Kafka · Elastic · React · TypeScript",
  },
  {
    id: "nar-sistem",
    title: "Nar Sistem",
    tabLabel: "NAR · '25+",
    years: "Software Engineer · 2025 → now (hybrid, Ankara)",
    bullets: [
      "Delivered a large-scale IoT platform — 4M+ req/hour, real-time device comms + remote command execution.",
      "Designed microservices + event-driven architecture: command orchestration, telemetry ingestion, stream processing.",
      "Built a customisable LLM-powered chatbot platform from scratch for AI-driven customer support.",
      "Led architecture + delivery of the MASS Protocol Testing Infrastructure — national-scale electricity licensing.",
      "Drove org-wide AI transformation: embedded custom agents into CI/CD, code review, architectural decisions.",
    ],
    tech: "Java · Spring · Kafka · TimescaleDB · LangChain · LangGraph",
  },
];

export function ExperienceHologram({
  active,
  intensity,
  onDismiss,
}: {
  active: CompanyId;
  intensity: number;
  onDismiss: () => void;
}) {
  const showContent = useStore((s) => s.showContent);
  const { rootRef, plateMat, haloMat, frameMat, scanlineMat, position, rotation, accent } =
    useWallSlot("experience", intensity);

  const activeMilestone = MILESTONES.find((m) => m.id === active) ?? MILESTONES[0];
  const tabRowTotal = TAB_W * MILESTONES.length + TAB_GAP * (MILESTONES.length - 1);

  return (
    <group position={position} rotation={rotation}>
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
          color={accent}
          anchorX="center"
          anchorY="middle"
          fontWeight={700}
          fillOpacity={HOLO_ALPHA_HEADER}
          letterSpacing={HOLO_LETTER_HEADER}
        >
          EXPERIENCE · TIMELINE
        </Text>

        {/* Active company name + role subtitle. */}
        <Text
          position={[0, PANEL_H / 2 - HOLO_OFFSET_TITLE, 0.01]}
          fontSize={HOLO_FONT_TITLE}
          color={HOLO_COLOR_SOFT}
          fillOpacity={HOLO_ALPHA_TITLE}
          anchorX="center"
          anchorY="middle"
          maxWidth={PANEL_W - 0.4}
        >
          {activeMilestone.title}
        </Text>
        <Text
          position={[0, PANEL_H / 2 - HOLO_OFFSET_SUBTITLE, 0.01]}
          fontSize={HOLO_FONT_SUBTITLE}
          color={HOLO_COLOR_MUTED}
          fillOpacity={HOLO_ALPHA_SUBTITLE}
          anchorX="center"
          anchorY="middle"
          maxWidth={PANEL_W - 0.4}
        >
          {activeMilestone.years}
        </Text>

        {/* Chronological tab strip. */}
        {MILESTONES.map((m, i) => {
          const x = -tabRowTotal / 2 + TAB_W / 2 + i * (TAB_W + TAB_GAP);
          return (
            <HoloTab
              key={m.id}
              label={m.tabLabel.toUpperCase()}
              x={x}
              y={TAB_ROW_Y}
              width={TAB_W}
              height={TAB_H}
              isActive={m.id === active}
              accent={accent}
              frameMat={frameMat}
              underlineWidth={TAB_W - 0.08}
              onSelect={() => showContent({ kind: "experience", company: m.id })}
            />
          );
        })}

        {/* Divider below the tab strip. */}
        <mesh position={[0, TAB_ROW_Y - TAB_H / 2 - 0.1, 0.005]} material={frameMat}>
          <planeGeometry args={[PANEL_W - 0.3, 0.004]} />
        </mesh>

        {/* Active company's detail bullets. Key includes a slice of the
            bullet text so React's diff is stable across tab switches that
            change the bullet count. */}
        {activeMilestone.bullets.map((b, i) => (
          <Text
            key={`${activeMilestone.id}-${i}-${b.slice(0, 12)}`}
            position={[
              -PANEL_W / 2 + 0.3,
              TAB_ROW_Y - TAB_H / 2 - HOLO_BULLETS_START_GAP - i * HOLO_BULLET_GAP,
              0.01,
            ]}
            fontSize={HOLO_FONT_BODY}
            color={HOLO_COLOR_BODY}
            fillOpacity={HOLO_ALPHA_BODY}
            anchorX="left"
            anchorY="middle"
            maxWidth={PANEL_W - 0.4}
            lineHeight={1.35}
          >
            {`› ${b}`}
          </Text>
        ))}

        {/* Tech stack tag line at the bottom. */}
        <Text
          position={[0, -PANEL_H / 2 + HOLO_OFFSET_CAPTION, 0.01]}
          fontSize={HOLO_FONT_CAPTION}
          color={accent}
          fillOpacity={HOLO_ALPHA_CAPTION}
          anchorX="center"
          anchorY="middle"
          letterSpacing={HOLO_LETTER_CAPTION}
          maxWidth={PANEL_W - 0.3}
        >
          {`TECH · ${activeMilestone.tech}`}
        </Text>

        {/* Dismiss hit-plane — clicks outside any tab close. */}
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
    </group>
  );
}
