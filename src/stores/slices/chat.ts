import type { StateCreator } from "zustand";
import type { Suggestion } from "@/types/tools";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
};

export type ChatSlice = {
  chat: {
    messages: ChatMessage[];
    isOpen: boolean;
    isStreaming: boolean;
    abortController: AbortController | null;
    /**
     * LangGraph thread id for this session. Stable across turns so the
     * backend checkpointer can keep tool-call history visible to the LLM;
     * regenerated on `clearChat` so a new conversation gets fresh state.
     */
    threadId: string;
    /**
     * Follow-up chips the agent produced at the end of the last turn.
     * Replaced wholesale on each `setSuggestions`; cleared the moment
     * the user sends any message.
     */
    suggestions: Suggestion[];
  };
  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
  appendMessage: (m: ChatMessage) => void;
  appendDelta: (delta: string) => void;
  finishStreaming: () => void;
  setStreaming: (streaming: boolean, controller?: AbortController | null) => void;
  setSuggestions: (items: Suggestion[]) => void;
  clearSuggestions: () => void;
  clearChat: () => void;
};

function newThreadId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `thread-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const createChatSlice: StateCreator<ChatSlice, [], [], ChatSlice> = (set, get) => ({
  chat: {
    messages: [],
    isOpen: false, // default collapsed — dock is a pill until clicked
    isStreaming: false,
    abortController: null,
    threadId: newThreadId(),
    suggestions: [],
  },
  toggleChat: () => set((prev) => ({ chat: { ...prev.chat, isOpen: !prev.chat.isOpen } })),
  openChat: () => set((prev) => ({ chat: { ...prev.chat, isOpen: true } })),
  closeChat: () => {
    get().chat.abortController?.abort();
    set((prev) => ({
      chat: { ...prev.chat, isOpen: false, isStreaming: false, abortController: null },
    }));
  },
  appendMessage: (m) =>
    set((prev) => ({
      chat: {
        ...prev.chat,
        messages: [...prev.chat.messages, m],
        // Any user send clears the chip row — new chips arrive on the
        // agent's next turn.
        suggestions: m.role === "user" ? [] : prev.chat.suggestions,
      },
    })),
  appendDelta: (delta) =>
    set((prev) => {
      const msgs = prev.chat.messages;
      const last = msgs[msgs.length - 1];
      if (!last || last.role !== "assistant") return prev;
      const updated: ChatMessage = { ...last, content: last.content + delta };
      return {
        chat: {
          ...prev.chat,
          messages: [...msgs.slice(0, -1), updated],
        },
      };
    }),
  finishStreaming: () =>
    set((prev) => {
      const msgs = prev.chat.messages;
      const last = msgs[msgs.length - 1];
      if (!last) {
        return { chat: { ...prev.chat, isStreaming: false, abortController: null } };
      }
      const updated: ChatMessage = { ...last, streaming: false };
      return {
        chat: {
          ...prev.chat,
          isStreaming: false,
          abortController: null,
          messages: [...msgs.slice(0, -1), updated],
        },
      };
    }),
  setStreaming: (streaming, controller) =>
    set((prev) => ({
      chat: {
        ...prev.chat,
        isStreaming: streaming,
        abortController: controller ?? (streaming ? prev.chat.abortController : null),
      },
    })),
  setSuggestions: (items) => set((prev) => ({ chat: { ...prev.chat, suggestions: items } })),
  clearSuggestions: () => set((prev) => ({ chat: { ...prev.chat, suggestions: [] } })),
  clearChat: () => {
    get().chat.abortController?.abort();
    set((prev) => ({
      chat: {
        ...prev.chat,
        messages: [],
        isStreaming: false,
        abortController: null,
        threadId: newThreadId(),
        suggestions: [],
      },
    }));
  },
});
