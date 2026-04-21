import { lazy, Suspense, useEffect } from "react";
import { useDebugMode } from "@/hooks/useDebugMode";
import { useT } from "@/hooks/useT";
import { useStore } from "@/stores";
import { ChatDock } from "@/ui/ChatDock";
import { ContentPanel } from "@/ui/ContentPanel";
import { DebugPanel } from "@/ui/DebugPanel";
import { EventTicker } from "@/ui/EventTicker";
import { Footer } from "@/ui/Footer";
import { LangSelector } from "@/ui/LangSelector";
import { SplashScreen } from "@/ui/SplashScreen";
import { ThemeToggle } from "@/ui/ThemeToggle";

const Scene = lazy(() => import("./Scene"));
const ChatLab = lazy(() => import("./chat-lab/ChatLab"));

export default function App() {
  // Dev-only /chat-lab route (phase-2 contract test). No router — single check.
  if (typeof window !== "undefined" && window.location.pathname === "/chat-lab") {
    return (
      <Suspense fallback={<SplashScreen />}>
        <ChatLab />
      </Suspense>
    );
  }
  return <Portfolio />;
}

function Portfolio() {
  const t = useT();
  const lang = useStore((s) => s.lang);
  const debug = useDebugMode();

  // Keep `<html lang>` in sync with the selected language.
  useEffect(() => {
    document.documentElement.setAttribute("lang", lang);
  }, [lang]);

  return (
    <div className="relative h-full w-full">
      {/* The 3D world fills the viewport */}
      <Suspense fallback={<SplashScreen />}>
        <Scene />
      </Suspense>

      {/* Top-right controls */}
      <div className="pointer-events-none fixed right-4 top-4 z-20 flex items-center gap-2">
        <div className="pointer-events-auto">
          <LangSelector />
        </div>
        <div className="pointer-events-auto">
          <ThemeToggle />
        </div>
      </div>

      {/* Top-left: identity tag */}
      <div className="pointer-events-none fixed left-4 top-4 z-20">
        <div className="pointer-events-auto rounded-full border border-[var(--color-fg)]/10 bg-[var(--color-bg)]/80 px-3 py-1.5 text-xs text-[var(--color-fg)] backdrop-blur-md shadow-sm">
          <span className="font-semibold">{t.meta.name}</span>
          <span className="mx-1.5 text-[var(--color-fg)]/40">·</span>
          <span className="text-[var(--color-fg)]/70">{t.meta.role}</span>
        </div>
      </div>

      {/* Chat dock */}
      <ChatDock />

      {/* Side content panel (driven by content.* tool events) */}
      <ContentPanel />

      {/* Debug panel + live UI-event ticker (only when ?debug=1) */}
      {debug && <DebugPanel />}
      {debug && <EventTicker />}

      <Footer />
    </div>
  );
}
