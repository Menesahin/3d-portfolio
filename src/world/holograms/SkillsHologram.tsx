import { Text } from "@react-three/drei";
import { useStore } from "@/stores";
import type { SkillGroup } from "@/types/tools";
import { HoloChrome } from "./HoloChrome";
import { HoloTab } from "./HoloTab";
import {
  HOLO_ALPHA_BODY,
  HOLO_ALPHA_HEADER,
  HOLO_ALPHA_SUBTITLE,
  HOLO_BULLET_GAP,
  HOLO_BULLETS_START_GAP,
  HOLO_COLOR_BODY,
  HOLO_COLOR_SOFT,
  HOLO_FONT_BODY,
  HOLO_FONT_HEADER,
  HOLO_FONT_SUBTITLE,
  HOLO_LETTER_HEADER,
  HOLO_OFFSET_HEADER,
  HOLO_OFFSET_TAB_ROW,
  HOLO_OFFSET_TITLE,
} from "./tokens";
import { useWallSlot } from "./useWallSlot";

const PANEL_W = 3.6;
const PANEL_H = 2.4;
const TAB_W = 0.76;
const TAB_H = 0.28;
const TAB_GAP = 0.1;
const TAB_ROW_Y = PANEL_H / 2 - HOLO_OFFSET_TAB_ROW;

type Skill = {
  id: SkillGroup;
  title: string;
  items: string[];
};

const SKILLS: Skill[] = [
  {
    id: "ai",
    title: "AI / LLM",
    items: [
      "LangChain · LangGraph",
      "RAG pipelines · embeddings",
      "Vector databases",
      "Prompt engineering",
      "Custom AI agents (Claude Code)",
    ],
  },
  {
    id: "backend",
    title: "Backend",
    items: [
      "Java · Spring Boot",
      "Node.js · NestJS",
      "Kafka · RabbitMQ · Redis",
      "PostgreSQL · TimescaleDB",
      "Elasticsearch · Spring Batch",
    ],
  },
  {
    id: "frontend",
    title: "Frontend",
    items: [
      "React 19 · Next.js · TypeScript",
      "TanStack Query · Zustand",
      "Tailwind CSS · ShadCN UI",
      "Microfrontend architecture",
      "D3 · Pixi · Chart.js",
    ],
  },
  {
    id: "devops",
    title: "DevOps",
    items: [
      "Docker · Kubernetes",
      "Jenkins · GitHub Actions",
      "CI/CD pipeline management",
      "Container orchestration",
    ],
  },
];

/**
 * Skill matrix — horizontal tab strip at the top, active group's
 * bullet list fills the panel below. Cleaner than the old 2×2 grid
 * because each group gets the whole stage instead of a cramped
 * quadrant.
 */
export function SkillsHologram({
  active,
  intensity,
  onDismiss,
}: {
  active: SkillGroup;
  intensity: number;
  onDismiss: () => void;
}) {
  const showContent = useStore((s) => s.showContent);
  const { rootRef, plateMat, haloMat, frameMat, scanlineMat, position, rotation, accent } =
    useWallSlot("skills", intensity);

  const activeSkill = SKILLS.find((s) => s.id === active) ?? SKILLS[0]!;
  const tabRowTotal = TAB_W * SKILLS.length + TAB_GAP * (SKILLS.length - 1);

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
          SKILL MATRIX
        </Text>

        {/* Subtitle — name the active group. */}
        <Text
          position={[0, PANEL_H / 2 - HOLO_OFFSET_TITLE, 0.01]}
          fontSize={HOLO_FONT_SUBTITLE}
          color={HOLO_COLOR_SOFT}
          fillOpacity={HOLO_ALPHA_SUBTITLE}
          anchorX="center"
          anchorY="middle"
        >
          {activeSkill.title}
        </Text>

        {/* Horizontal tab strip. */}
        {SKILLS.map((s, i) => {
          const x = -tabRowTotal / 2 + TAB_W / 2 + i * (TAB_W + TAB_GAP);
          return (
            <HoloTab
              key={s.id}
              label={s.title.toUpperCase()}
              x={x}
              y={TAB_ROW_Y}
              width={TAB_W}
              height={TAB_H}
              isActive={s.id === active}
              accent={accent}
              frameMat={frameMat}
              underlineWidth={TAB_W - 0.06}
              onSelect={() => showContent({ kind: "skill_group", group: s.id })}
            />
          );
        })}

        {/* Divider below the tab strip. */}
        <mesh position={[0, TAB_ROW_Y - TAB_H / 2 - 0.1, 0.005]} material={frameMat}>
          <planeGeometry args={[PANEL_W - 0.3, 0.004]} />
        </mesh>

        {/* Active group's bullet list — fills the body of the panel.
            Key suffix uses a slice of the bullet text so React's diff is
            stable when the active group changes the row count. */}
        {activeSkill.items.map((it, i) => (
          <Text
            key={`${activeSkill.id}-${i}-${it.slice(0, 12)}`}
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
          >
            {`› ${it}`}
          </Text>
        ))}

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
