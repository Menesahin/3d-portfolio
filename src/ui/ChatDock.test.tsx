// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "@/stores";
import { ChatDock } from "./ChatDock";

const testFlags = vi.hoisted(() => ({ isMobile: false }));

vi.mock("@/chat/useChatStream", () => ({
  useChatStream: () => ({ send: vi.fn(), stop: vi.fn(), isStreaming: false }),
}));
vi.mock("@/hooks/useFirstVisit", () => ({ useFirstVisit: () => ({ isFirstVisit: false }) }));
vi.mock("@/hooks/useIsMobile", () => ({ useIsMobile: () => testFlags.isMobile }));
vi.mock("@/hooks/useT", () => ({
  useT: () => ({ chat: { placeholder: "Ask me about Enes…", stop: "Stop", send: "Send" } }),
}));
vi.mock("@/world/worldVariant", () => ({
  readWorldVariant: () => "cockpit-v7",
  isCockpitVariant: () => true,
}));

describe("ChatDock presentation mode", () => {
  beforeEach(() => {
    testFlags.isMobile = false;
    useStore.setState((state) => ({
      world: {
        ...state.world,
        cameraTarget: "experience",
        activeContent: { kind: "experience", company: "formica" },
      },
      chat: {
        ...state.chat,
        messages: [
          { id: "user-1", role: "user", content: "What did Enes build at Formica?" },
          { id: "assistant-1", role: "assistant", content: "He built the risk platform." },
        ],
        suggestions: [],
        isStreaming: false,
        abortController: null,
      },
    }));
  });

  afterEach(() => {
    cleanup();
    useStore.getState().resetWorld();
    useStore.getState().clearChat();
  });

  it("keeps the latest exchange and input visible while a section is open", () => {
    render(<ChatDock />);

    expect(screen.getByText("What did Enes build at Formica?")).toBeTruthy();
    expect(screen.getByText("He built the risk platform.")).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Ask me about Enes…" })).toBeTruthy();
    expect(document.querySelector('[data-presenting="true"]')).toBeTruthy();
  });

  it("uses the low-height COMMS strip on mobile presentations", () => {
    testFlags.isMobile = true;
    render(<ChatDock />);

    const feed = document.querySelector('[data-presenting="true"]');
    expect(feed?.classList.contains("!max-h-20")).toBe(true);
    expect(screen.getByRole("textbox", { name: "Ask me about Enes…" })).toBeTruthy();
  });
});
