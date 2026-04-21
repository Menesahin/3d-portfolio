import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { streamChat } from "@/chat/stream";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";
import { useStore } from "@/stores";

/**
 * Live chat dock. The chat slice stores the transcript; the world slice
 * receives UI tool events via `applyUiEvent`. Streaming uses the SSE
 * client in `src/chat/stream.ts`.
 *
 * Keyboard:
 *   "/"  — focus the input from anywhere (except when already typing)
 *   Esc  — collapse dock / abort in-flight stream
 *   Enter — submit
 */
export function ChatDock() {
  const t = useT();
  const isOpen = useStore((s) => s.chat.isOpen);
  const isStreaming = useStore((s) => s.chat.isStreaming);
  const messages = useStore((s) => s.chat.messages);
  const toggle = useStore((s) => s.toggleChat);
  const openChat = useStore((s) => s.openChat);
  const closeChat = useStore((s) => s.closeChat);
  const appendMessage = useStore((s) => s.appendMessage);
  const appendDelta = useStore((s) => s.appendDelta);
  const finishStreaming = useStore((s) => s.finishStreaming);
  const setStreaming = useStore((s) => s.setStreaming);
  const applyUiEvent = useStore((s) => s.applyUiEvent);

  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as new content arrives.
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll intent is tied to count, not identity
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  // Global "/" shortcut to focus the chat input.
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        openChat();
        requestAnimationFrame(() => inputRef.current?.focus());
      }
      if (e.key === "Escape") {
        if (isStreaming) {
          closeChat();
        } else if (isOpen) {
          toggle();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openChat, closeChat, toggle, isOpen, isStreaming]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      const userId = `u-${crypto.randomUUID()}`;
      const assistantId = `a-${crypto.randomUUID()}`;
      appendMessage({ id: userId, role: "user", content: trimmed });
      appendMessage({ id: assistantId, role: "assistant", content: "", streaming: true });
      setDraft("");

      const ac = new AbortController();
      setStreaming(true, ac);

      try {
        // Send ONLY the latest user turn + a stable thread_id. The backend's
        // LangGraph checkpointer replays full state (including the tool
        // calls it fired on prior turns), so the LLM keeps invoking fresh
        // tools instead of skipping to a text-only reply.
        const threadId = useStore.getState().chat.threadId;
        const body = {
          thread_id: threadId,
          messages: [{ role: "user" as const, content: trimmed }],
        };
        for await (const ev of streamChat(body, ac.signal)) {
          if (ev.type === "token") {
            appendDelta(ev.delta);
          } else if (ev.type === "ui") {
            applyUiEvent(ev.event);
          } else if (ev.type === "error") {
            appendDelta(`\n\n⚠️ ${ev.message}`);
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          appendDelta(`\n\n⚠️ ${(err as Error).message}`);
        }
      } finally {
        finishStreaming();
      }
    },
    [appendDelta, appendMessage, applyUiEvent, finishStreaming, isStreaming, setStreaming],
  );

  const stop = useCallback(() => {
    useStore.getState().chat.abortController?.abort();
    finishStreaming();
  }, [finishStreaming]);

  const onInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void send(draft);
      }
    },
    [draft, send],
  );

  const lastAssistant = useMemo(
    () => [...messages].reverse().find((m) => m.role === "assistant"),
    [messages],
  );

  return (
    <div className="pointer-events-none fixed bottom-5 left-5 right-5 z-20 sm:right-auto">
      <div
        className={cn(
          "pointer-events-auto flex w-full flex-col overflow-hidden rounded-2xl border border-[var(--color-fg)]/10 bg-[var(--color-bg)]/90 shadow-xl backdrop-blur-xl transition-all duration-300 sm:w-[min(420px,92vw)]",
          isOpen ? "h-[min(460px,60vh)]" : "h-[54px]",
        )}
      >
        <button
          type="button"
          onClick={toggle}
          aria-expanded={isOpen}
          aria-label={isOpen ? "Collapse chat" : "Open chat"}
          className="flex shrink-0 items-center justify-between px-4 py-3 text-left text-sm font-medium text-[var(--color-fg)]"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden
              className={cn(
                "inline-block h-2 w-2 shrink-0 rounded-full",
                isStreaming ? "animate-pulse bg-[var(--color-accent)]" : "bg-[var(--color-accent)]",
              )}
            />
            <span className="truncate">{t.hero.greeting}</span>
          </span>
          <span className="ml-3 shrink-0 text-xs text-[var(--color-fg)]/50">
            {isOpen ? "▼" : "▲"}
          </span>
        </button>

        {isOpen && (
          <>
            <div
              ref={scrollRef}
              aria-live="polite"
              aria-atomic="false"
              className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-2 text-sm"
            >
              {messages.length === 0 && (
                <p className="text-[var(--color-fg)]/50">
                  {t.chat.placeholder} (press{" "}
                  <kbd className="rounded bg-[var(--color-fg)]/10 px-1">/</kbd>)
                </p>
              )}
              {messages.map((m) => (
                <Bubble
                  key={m.id}
                  role={m.role}
                  content={m.content + (m.streaming && m === lastAssistant ? "▍" : "")}
                />
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send(draft);
              }}
              className="flex shrink-0 items-center gap-2 border-t border-[var(--color-fg)]/5 px-3 py-3"
            >
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder={t.chat.placeholder}
                aria-label={t.chat.placeholder}
                className="flex-1 rounded-full border border-[var(--color-fg)]/15 bg-[var(--color-bg)]/70 px-4 py-2 text-sm outline-none focus:border-[var(--color-accent)]/60"
              />
              {isStreaming ? (
                <button
                  type="button"
                  onClick={stop}
                  className="rounded-full bg-[var(--color-fg)]/10 px-4 py-2 text-sm font-medium text-[var(--color-fg)] hover:bg-[var(--color-fg)]/20"
                >
                  {t.chat.stop}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!draft.trim()}
                  className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t.chat.send}
                </button>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function Bubble({ role, content }: { role: "user" | "assistant" | "system"; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={cn(
          "max-w-[82%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm leading-relaxed",
          isUser
            ? "bg-[var(--color-accent)] text-white"
            : "bg-[var(--color-fg)]/8 text-[var(--color-fg)]",
        )}
      >
        {content || (role === "assistant" ? "…" : "")}
      </div>
    </div>
  );
}
