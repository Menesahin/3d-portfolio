import { Billboard, Text } from "@react-three/drei";
import { useActiveTheme } from "@/hooks/useActiveTheme";
import { useStore } from "@/stores";
import { ZONES } from "./zones";

const HOLOGRAM_CONTENT: Record<string, { title: string; body: string }> = {
  formica: {
    title: "Formica AI · 2022 – 2025",
    body: "Risk Management Platform from scratch.\nFraud detection, AML, KYC — banks & fintech.\nPDF-reading chatbot, drag-n-drop framework.",
  },
  "nar-sistem": {
    title: "Nar Sistem · 2025 – now",
    body: "IoT platform — 4M+ req/hr, event-driven.\nLLM-powered chatbot platform.\nMASS protocol testing at national scale.",
  },
  "ing-bank": {
    title: "ING Bank · 2022",
    body: "Loan division modernization.\nMonolith → microservices migration.\nEnterprise compliance + code review.",
  },
  vocabuddy: {
    title: "Vocabuddy — iOS",
    body: "AI vocabulary app with OpenAI.\nAdaptive practice games, AI stories, TTS.\nLive on App Store.",
  },
  shotmock: {
    title: "ShotMock — SaaS",
    body: "App Store / Play Store screenshot designer.\n64+ templates, browser canvas.\nASC integration.",
  },
  "claude-voice": {
    title: "Claude Voice — OSS",
    body: "Voice extension for Claude Code.\nWake word, local STT/TTS, offline.\nPublished on npm, zero-config.",
  },
};

/**
 * Renders a floating hologram panel above the active zone when
 * `world.activeHologram` is set. Billboards so it always faces the camera.
 */
export function Hologram() {
  const theme = useActiveTheme();
  const active = useStore((s) => s.world.activeHologram);
  if (!active) return null;

  const content = HOLOGRAM_CONTENT[active.contentId];
  if (!content) return null;

  const zone = ZONES[active.zone];
  const [x, y, z] = zone.position;
  return (
    <Billboard position={[x, y + 3.2, z]}>
      <mesh>
        <planeGeometry args={[3.2, 1.6]} />
        <meshBasicMaterial color={theme.palette.accent} transparent opacity={0.15} />
      </mesh>
      <Text
        position={[0, 0.5, 0.01]}
        fontSize={0.22}
        color={theme.palette.ink}
        anchorX="center"
        anchorY="middle"
        maxWidth={3}
      >
        {content.title}
      </Text>
      <Text
        position={[0, -0.15, 0.01]}
        fontSize={0.13}
        color={theme.palette.ink}
        fillOpacity={0.8}
        anchorX="center"
        anchorY="middle"
        maxWidth={3}
      >
        {content.body}
      </Text>
    </Billboard>
  );
}
