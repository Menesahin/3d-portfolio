import { useStore } from "@/stores";
import type { ContentPanel as ContentPanelState } from "@/stores/slices/world";

/**
 * Side overlay that appears when a `content.*` tool fires. Lives in 2D so
 * we can render long-form details / links without fighting 3D occlusion.
 * Sits top-right, below the theme/lang pills.
 */

type CardProps = { title: string; subtitle?: string; children: React.ReactNode };

function Card({ title, subtitle, children }: CardProps) {
  const hide = useStore((s) => s.hideContent);
  return (
    <div className="pointer-events-auto w-[min(360px,86vw)] rounded-2xl border border-[var(--color-fg)]/10 bg-[var(--color-bg)]/92 p-4 shadow-xl backdrop-blur-xl">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[var(--color-fg)]">{title}</h3>
          {subtitle && <p className="text-[11px] text-[var(--color-fg)]/60">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={hide}
          aria-label="Close panel"
          className="rounded-full px-2 text-[var(--color-fg)]/50 hover:bg-[var(--color-fg)]/10 hover:text-[var(--color-fg)]"
        >
          ✕
        </button>
      </div>
      <div className="text-[13px] leading-relaxed text-[var(--color-fg)]/85 [&_a]:text-[var(--color-accent)] [&_a]:underline">
        {children}
      </div>
    </div>
  );
}

const EXPERIENCE: Record<string, { title: string; subtitle: string; bullets: string[] }> = {
  "nar-sistem": {
    title: "Nar Sistem Teknoloji",
    subtitle: "Software Engineer · 2025 → now · Ankara (hybrid)",
    bullets: [
      "Large-scale IoT platform — 4M+ req/hour, real-time device comms.",
      "Microservices + event-driven: command orchestration, telemetry ingestion, stream processing, time-series storage.",
      "Built an LLM-powered chatbot platform from scratch.",
      "Led MASS Protocol Testing Infrastructure — national-scale electricity licensing.",
      "Drove org-wide AI transformation in the engineering workflow.",
    ],
  },
  formica: {
    title: "Formica AI",
    subtitle: "Software Engineer · 2022 – 2025 · Istanbul (remote)",
    bullets: [
      "Built Risk Management Platform from scratch — Fraud, AML, KYC for banks + fintech.",
      "LLM-powered PDF chatbot, data generators, AI report analyzers.",
      "Custom UI component library + drag-and-drop framework.",
      "Elasticsearch dashboards + high-volume import/export pipelines.",
    ],
  },
  "ing-bank": {
    title: "ING Bank",
    subtitle: "Software Engineer · 2022 · Remote",
    bullets: [
      "Loan division tech transformation.",
      "Monolith → microservices migration with resilience.",
      "Data-intensive screens + complex DB queries for loan processing.",
      "Enterprise compliance + large-team collaboration.",
    ],
  },
};

const PROJECTS: Record<
  string,
  { title: string; subtitle: string; bullets: string[]; link?: { label: string; href: string } }
> = {
  vocabuddy: {
    title: "Vocabuddy",
    subtitle: "iOS · AI vocabulary app",
    bullets: [
      "OpenAI-integrated language-learning app.",
      "Adaptive practice games, AI-generated contextual stories, personalised TTS.",
      "Live on the App Store.",
    ],
    link: {
      label: "apps.apple.com/.../vocabuddy",
      href: "https://apps.apple.com/us/app/vocabuddy-learn-words/id6753191822",
    },
  },
  shotmock: {
    title: "ShotMock",
    subtitle: "SaaS · AI-assisted ASO",
    bullets: [
      "Design + export App/Play Store screenshot mockups.",
      "64+ templates, browser-based canvas editor.",
      "Direct App Store Connect integration.",
    ],
    link: { label: "shotmock.com", href: "https://shotmock.com" },
  },
  "claude-voice": {
    title: "Claude Voice",
    subtitle: "Open source · npm",
    bullets: [
      "Voice extension for Claude Code.",
      "Wake-word detection, local STT/TTS, offline support.",
      "Zero-config install via npm.",
    ],
    link: {
      label: "npmjs.com/package/claude-voice",
      href: "https://www.npmjs.com/package/claude-voice",
    },
  },
};

const SKILL_GROUPS: Record<string, { title: string; items: string[] }> = {
  ai: {
    title: "AI / LLM",
    items: [
      "LangChain · LangGraph",
      "RAG pipelines, function calling, embeddings",
      "Vector databases",
      "Prompt engineering",
      "Claude Code, custom AI agents",
    ],
  },
  backend: {
    title: "Backend",
    items: [
      "Java · Spring Boot",
      "Node.js · NestJS",
      "Kafka · RabbitMQ · Redis",
      "PostgreSQL · TimescaleDB · Elasticsearch",
      "Spring Batch · MinIO",
    ],
  },
  frontend: {
    title: "Frontend",
    items: [
      "Next.js · React · TypeScript",
      "TanStack Query · Zustand",
      "Tailwind CSS · ShadCN UI",
      "Microfrontend architecture",
      "D3.js · Pixi.js · Chart.js",
    ],
  },
  devops: {
    title: "DevOps",
    items: ["Docker · Kubernetes", "Jenkins · GitHub Actions", "CI/CD pipeline management"],
  },
};

function panelFor(c: ContentPanelState) {
  switch (c.kind) {
    case "experience": {
      const data = EXPERIENCE[c.company];
      if (!data) return null;
      return (
        <Card title={data.title} subtitle={data.subtitle}>
          <ul className="ml-4 list-disc space-y-1">
            {data.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </Card>
      );
    }
    case "project": {
      const data = PROJECTS[c.project];
      if (!data) return null;
      return (
        <Card title={data.title} subtitle={data.subtitle}>
          <ul className="ml-4 list-disc space-y-1">
            {data.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          {data.link && (
            <p className="mt-3">
              <a href={data.link.href} target="_blank" rel="noreferrer noopener">
                {data.link.label} ↗
              </a>
            </p>
          )}
        </Card>
      );
    }
    case "skill_group": {
      const data = SKILL_GROUPS[c.group];
      if (!data) return null;
      return (
        <Card title={data.title}>
          <ul className="ml-4 list-disc space-y-1">
            {data.items.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Card>
      );
    }
    case "contact_card":
      return (
        <Card title="Get in touch" subtitle="Enes Şahin · Ankara, Turkey">
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <a href="mailto:menesahin99@gmail.com">menesahin99@gmail.com</a>
            </li>
            <li>
              <a href="https://linkedin.com/in/menesahin" target="_blank" rel="noreferrer noopener">
                linkedin.com/in/menesahin
              </a>
            </li>
            <li>+90 553 326 3669</li>
          </ul>
        </Card>
      );
  }
}

export function ContentPanel() {
  const active = useStore((s) => s.world.activeContent);
  if (!active) return null;
  return (
    <div className="pointer-events-none fixed right-4 top-20 z-20 flex flex-col gap-3">
      {panelFor(active)}
    </div>
  );
}
