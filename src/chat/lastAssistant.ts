import type { ChatMessage } from "@/stores/slices/chat";

/**
 * O(1)-typical reverse scan — the most-recent assistant message is
 * almost always the last entry in the array, so a forward scan from the
 * tail beats `[...messages].reverse().find(...)` (O(n) spread on every
 * token append during streaming).
 */
export function findLastAssistant(messages: ChatMessage[]): ChatMessage | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message?.role === "assistant") return message;
  }
  return undefined;
}
