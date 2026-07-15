import { lazy, Suspense, useEffect } from "react";
import { useDebugMode } from "@/hooks/useDebugMode";
import { useT } from "@/hooks/useT";
import { useStore } from "@/stores";
import { ChatDock } from "@/ui/ChatDock";
import { CockpitViewToggle } from "@/ui/CockpitViewToggle";
import { DebugPanel } from "@/ui/DebugPanel";
import { ErrorBoundary } from "@/ui/ErrorBoundary";
import { EventTicker } from "@/ui/EventTicker";
import { Footer } from "@/ui/Footer";
import { LangSelector } from "@/ui/LangSelector";
import { SoundToggle } from "@/ui/SoundToggle";
import { SplashScreen } from "@/ui/SplashScreen";
import { isCockpitVariant, readWorldVariant } from "@/world/worldVariant";

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
  const variant = readWorldVariant();
  const cockpit = isCockpitVariant(variant);
  const cockpitView = useStore((state) => state.cockpit.viewMode);

  // Keep `<html lang>` in sync with the selected language.
  useEffect(() => {
    document.documentElement.setAttribute("lang", lang);
  }, [lang]);

  useEffect(() => {
    document.documentElement.dataset.world = cockpit ? "cockpit" : "legacy";
    document.documentElement.dataset.cockpitVersion = variant === "cockpit-v7" ? "7" : "legacy";
    document.documentElement.dataset.cockpitView = cockpitView;
    return () => {
      delete document.documentElement.dataset.world;
      delete document.documentElement.dataset.cockpitVersion;
      delete document.documentElement.dataset.cockpitView;
    };
  }, [cockpit, cockpitView, variant]);

  return (
    <div className="relative h-full w-full">
      {/* The 3D world fills the viewport. ErrorBoundary downgrades to
          a static splash if the GLB / shader / Canvas crashes — chat
          dock + header keep working. */}
      <ErrorBoundary fallback={<SplashScreen />}>
        <Suspense fallback={<SplashScreen />}>
          <Scene />
        </Suspense>
      </ErrorBoundary>

      {/* Top-right controls */}
      <div className="pointer-events-none fixed right-4 top-4 z-20 flex items-center gap-2 max-[480px]:right-3 max-[480px]:top-3 max-[480px]:gap-1.5">
        {variant === "cockpit-v7" && (
          <div className="pointer-events-auto">
            <CockpitViewToggle />
          </div>
        )}
        {cockpit && (
          <div className="pointer-events-auto">
            <SoundToggle />
          </div>
        )}
        <div className="pointer-events-auto">
          <LangSelector />
        </div>
      </div>

      {/* Top-left: identity tag */}
      <div className="pointer-events-none fixed left-4 top-4 z-20 max-[480px]:left-3 max-[480px]:top-3">
        <div className="holo-chip pointer-events-auto rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider">
          <span className="text-[var(--color-accent)]">{t.meta.name}</span>
          <span className="max-[480px]:hidden">
            <span className="mx-1.5 text-[var(--color-fg)]/40">·</span>
            <span className="text-[var(--color-fg)]/70">{t.meta.role}</span>
          </span>
        </div>
      </div>

      {/* Chat dock */}
      <ChatDock />

      {/* Debug panel + live UI-event ticker (only when ?debug=1) */}
      {debug && <DebugPanel />}
      {debug && <EventTicker />}

      <Footer />
    </div>
  );
}
