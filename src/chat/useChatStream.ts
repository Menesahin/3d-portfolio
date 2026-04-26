import { useCallback } from "react";
import { useFirstVisit } from "@/hooks/useFirstVisit";
import { useTypingSound } from "@/hooks/useTypingSound";
import { useStore } from "@/stores";
import { streamChat } from "./stream";

/**
 * SSE chat orchestrator. Owns:
 *  - constructing the user + assistant message pair,
 *  - opening an AbortController for the stream,
 *  - parsing token / ui / error events from the SSE generator,
 *  - finalising the streaming flag in `finally` so a network error
 *    can never leave the dock stuck in "streaming" state.
 *
 * The component layer stays a thin caller: `const { send, stop,
 * isStreaming } = useChatStream();`. Greeting-seed, key handlers, and
 * UI live in `ChatDock` itself.
 */
export function useChatStream() {
  const isStreaming = useStore((s) => s.chat.isStreaming);
  const appendMessage = useStore((s) => s.appendMessage);
  const appendDelta = useStore((s) => s.appendDelta);
  const finishStreaming = useStore((s) => s.finishStreaming);
  const setStreaming = useStore((s) => s.setStreaming);
  const applyUiEvent = useStore((s) => s.applyUiEvent);
  const { dismiss: dismissFirstVisit } = useFirstVisit();
  const typing = useTypingSound();

  const send = useCallback(
    async (text: string): Promise<void> => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      dismissFirstVisit();
      // Unlock the AudioContext inside this user-gesture tick so the
      // typewriter clicks can fire as tokens arrive.
      typing.ensureCtx();
      const userId = `u-${crypto.randomUUID()}`;
      const assistantId = `a-${crypto.randomUUID()}`;
      appendMessage({ id: userId, role: "user", content: trimmed });
      appendMessage({ id: assistantId, role: "assistant", content: "", streaming: true });

      const ac = new AbortController();
      setStreaming(true, ac);

      try {
        const threadId = useStore.getState().chat.threadId;
        const body = {
          thread_id: threadId,
          messages: [{ role: "user" as const, content: trimmed }],
        };
        for await (const ev of streamChat(body, ac.signal)) {
          if (ev.type === "token") {
            appendDelta(ev.delta);
            typing.click();
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
    [
      appendDelta,
      appendMessage,
      applyUiEvent,
      dismissFirstVisit,
      finishStreaming,
      isStreaming,
      setStreaming,
      typing,
    ],
  );

  const stop = useCallback(() => {
    useStore.getState().chat.abortController?.abort();
    finishStreaming();
  }, [finishStreaming]);

  return { send, stop, isStreaming };
}
