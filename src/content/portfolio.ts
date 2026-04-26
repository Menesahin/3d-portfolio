import type { ContentPanel } from "@/stores/slices/world";

/**
 * Portfolio copy — the data the mascot's hologram renders when the
 * LangGraph agent fires a `content.*` tool. Kept language-agnostic for
 * v1; i18n can layer on top later.
 */

export type HologramCard = {
  title: string;
  subtitle?: string;
  bullets: string[];
  link?: { label: string; href: string };
};

const EXPERIENCE: Record<string, HologramCard> = {
  "nar-sistem": {
    title: "Nar Sistem Teknoloji",
    subtitle: "Software Engineer · 2025 → now",
    bullets: [
      "Large-scale IoT platform — 4M+ req/hour.",
      "Microservices: command orchestration, telemetry, stream processing.",
      "Built an LLM-powered chatbot platform from scratch.",
      "Led MASS Protocol Testing — national electricity licensing.",
      "Drove org-wide AI transformation in eng workflow.",
    ],
  },
  formica: {
    title: "Formica AI",
    subtitle: "Software Engineer · 2022 – 2025",
    bullets: [
      "Risk Management Platform from scratch — Fraud, AML, KYC.",
      "LLM-powered PDF chatbot + AI report analyzers.",
      "Custom UI component library + drag-drop framework.",
      "Elasticsearch dashboards + high-volume I/O pipelines.",
    ],
  },
  "ing-bank": {
    title: "ING Bank",
    subtitle: "Software Engineer · 2022",
    bullets: [
      "Loan division tech transformation.",
      "Monolith → microservices with resilience.",
      "Data-intensive screens + complex loan-DB queries.",
      "Enterprise compliance + large-team collaboration.",
    ],
  },
};

const PROJECTS: Record<string, HologramCard> = {
  vocabuddy: {
    title: "Vocabuddy",
    subtitle: "iOS · AI vocabulary app",
    bullets: [
      "OpenAI-integrated language learning.",
      "Adaptive games, AI-generated stories, personalised TTS.",
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
  thecupxi: {
    title: "The Cup XI",
    subtitle: "iOS · World Cup 2026 starting-XI builder",
    bullets: [
      "SwiftUI 17+ pitch canvas with formation engine.",
      "API-Football live data + Redis-cached lookups.",
      "NestJS + PostgreSQL backend, export-image pipeline.",
    ],
  },
};

const SKILL_GROUPS: Record<string, HologramCard> = {
  ai: {
    title: "AI / LLM",
    bullets: [
      "LangChain · LangGraph",
      "RAG pipelines, function calling, embeddings",
      "Vector databases",
      "Prompt engineering",
      "Claude Code, custom AI agents",
    ],
  },
  backend: {
    title: "Backend",
    bullets: [
      "Java · Spring Boot",
      "Node.js · NestJS",
      "Kafka · RabbitMQ · Redis",
      "PostgreSQL · TimescaleDB · Elasticsearch",
      "Spring Batch · MinIO",
    ],
  },
  frontend: {
    title: "Frontend",
    bullets: [
      "Next.js · React · TypeScript",
      "TanStack Query · Zustand",
      "Tailwind CSS · ShadCN UI",
      "Microfrontend architecture",
      "D3.js · Pixi.js · Chart.js",
    ],
  },
  devops: {
    title: "DevOps",
    bullets: ["Docker · Kubernetes", "Jenkins · GitHub Actions", "CI/CD pipeline management"],
  },
};

const CONTACT: HologramCard = {
  title: "Get in touch",
  subtitle: "Enes Şahin · Ankara, Turkey",
  bullets: ["menesahin99@gmail.com", "linkedin.com/in/menesahin"],
};

export function getContent(c: ContentPanel): HologramCard | null {
  switch (c.kind) {
    case "experience":
      return EXPERIENCE[c.company] ?? null;
    case "project":
      return PROJECTS[c.project] ?? null;
    case "skill_group":
      return SKILL_GROUPS[c.group] ?? null;
    case "contact_card":
      return CONTACT;
  }
}
