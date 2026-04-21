import { useCallback, useEffect, useRef, useState } from "react";
import { streamChat, type ServerEvent } from "@/chat/stream";
import type { ChatMessagePayload } from "@/chat/stream";

type LogEntry =
  | { t: number; kind: "out"; text: string }
  | { t: number; kind: "in"; event: ServerEvent };

const SUGGESTIONS = [
  "Show me your projects",
  "Tell me about Formica",
  "What's your email?",
  "What's the weather?",
  "Türkçe konuş, Vocabuddy'yi anlat",
  "Selam, kimsin?",
];

/**
 * Phase-2 test surface. Renders a plain textbox + a live SSE event log so
 * we can validate the contract before wiring the 3D scene to the stream.
 * Not linked from the main app; visit `/chat-lab` directly.
 */
export default function ChatLab() {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessagePayload[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [assistant, setAssistant] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [log.length]);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || streaming) return;
      const userMsg: ChatMessagePayload = { role: "user", content: text };
      const next = [...messages, userMsg];
      setMessages(next);
      setAssistant("");
      setLog((l) => [...l, { t: Date.now(), kind: "out", text }]);

      const ac = new AbortController();
      abortRef.current = ac;
      setStreaming(true);
      setDraft("");

      try {
        let acc = "";
        for await (const ev of streamChat({ messages: next }, ac.signal)) {
          setLog((l) => [...l, { t: Date.now(), kind: "in", event: ev }]);
          if (ev.type === "token") {
            acc += ev.delta;
            setAssistant(acc);
          } else if (ev.type === "done") {
            if (acc) {
              setMessages((m) => [...m, { role: "assistant", content: acc }]);
            }
          } else if (ev.type === "error") {
            console.error("stream error:", ev.message);
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setLog((l) => [
            ...l,
            {
              t: Date.now(),
              kind: "in",
              event: { type: "error", message: (err as Error).message },
            },
          ]);
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, streaming],
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setLog([]);
    setAssistant("");
  }, []);

  return (
    <div className="min-h-screen w-screen bg-[var(--color-bg)] text-[var(--color-fg)] overflow-y-auto">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-4 py-6">
        <header className="flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">chat-lab</h1>
            <p className="text-xs text-[var(--color-fg)]/60">
              Phase-2 contract test. Raw SSE on the right, chat transcript on the left.
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="rounded-full border border-[var(--color-fg)]/15 px-3 py-1 text-xs hover:bg-[var(--color-fg)]/10"
          >
            clear
          </button>
        </header>

        <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Transcript */}
          <section className="flex flex-col rounded-xl border border-[var(--color-fg)]/10 bg-[var(--color-bg)]/80 p-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-fg)]/50">
              transcript
            </h2>
            <div className="flex-1 space-y-3 overflow-y-auto text-sm">
              {messages.map((m, i) => (
                <Bubble key={i} role={m.role} content={m.content} />
              ))}
              {streaming && assistant && (
                <Bubble role="assistant" content={`${assistant}▍`} />
              )}
              {messages.length === 0 && !streaming && (
                <p className="text-[var(--color-fg)]/40">
                  Try a prompt below — or use a suggestion.
                </p>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  disabled={streaming}
                  className="rounded-full border border-[var(--color-fg)]/15 px-3 py-1 text-[11px] text-[var(--color-fg)]/70 hover:bg-[var(--color-fg)]/10 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send(draft);
              }}
              className="mt-3 flex items-center gap-2"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask the mascot…"
                disabled={streaming}
                className="flex-1 rounded-full border border-[var(--color-fg)]/15 bg-[var(--color-bg)]/80 px-4 py-2 text-sm outline-none"
              />
              {streaming ? (
                <button
                  type="button"
                  onClick={abort}
                  className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white"
                >
                  stop
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!draft.trim()}
                  className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  send
                </button>
              )}
            </form>
          </section>

          {/* Event log */}
          <section className="flex flex-col rounded-xl border border-[var(--color-fg)]/10 bg-[var(--color-bg)]/80 p-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-fg)]/50">
              sse event log
            </h2>
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed"
            >
              {log.map((entry, i) => (
                <LogRow key={i} entry={entry} />
              ))}
              {log.length === 0 && (
                <p className="text-[var(--color-fg)]/40">
                  (no events yet — send a message)
                </p>
              )}
            </div>
          </section>
        </div>

        <footer className="text-[10px] text-[var(--color-fg)]/40">
          Backend: {import.meta.env.VITE_API_URL ?? "http://localhost:8000"}
        </footer>
      </div>
    </div>
  );
}

function Bubble({ role, content }: { role: "user" | "assistant" | "system"; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 ${
          isUser
            ? "bg-[var(--color-accent)] text-white"
            : "bg-[var(--color-fg)]/5 text-[var(--color-fg)]"
        }`}
      >
        {content}
      </div>
    </div>
  );
}

function LogRow({ entry }: { entry: LogEntry }) {
  const time = new Date(entry.t).toLocaleTimeString(undefined, { hour12: false });
  if (entry.kind === "out") {
    return (
      <div className="border-b border-[var(--color-fg)]/5 py-1">
        <span className="text-[var(--color-fg)]/40">{time} </span>
        <span className="text-[var(--color-accent)]">▶ user</span>
        <span className="text-[var(--color-fg)]/70"> {entry.text}</span>
      </div>
    );
  }
  const ev = entry.event;
  const color =
    ev.type === "ui"
      ? "text-emerald-600"
      : ev.type === "token"
        ? "text-sky-600"
        : ev.type === "error"
          ? "text-red-600"
          : "text-[var(--color-fg)]/50";
  return (
    <div className="border-b border-[var(--color-fg)]/5 py-1">
      <span className="text-[var(--color-fg)]/40">{time} </span>
      <span className={color}>◀ {ev.type}</span>
      <span className="text-[var(--color-fg)]/70"> {formatEvent(ev)}</span>
    </div>
  );
}

function formatEvent(ev: ServerEvent): string {
  switch (ev.type) {
    case "ready":
      return `request_id=${ev.request_id}`;
    case "token":
      return JSON.stringify(ev.delta);
    case "ui":
      return JSON.stringify(ev.event);
    case "done":
      return ev.request_id ? `request_id=${ev.request_id}` : "";
    case "error":
      return ev.message;
  }
}
