import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { findLastAssistant } from "@/chat/lastAssistant";
import { useChatStream } from "@/chat/useChatStream";
import { onboarding } from "@/content/onboarding";
import { useFirstVisit } from "@/hooks/useFirstVisit";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";
import { useStore } from "@/stores";
import type { Suggestion } from "@/types/tools";
import { isCockpitVariant, readWorldVariant } from "@/world/worldVariant";

/**
 * Twitch-style floating chat overlay — no containing plate. Messages
 * stack up from the bottom, the top of the feed fades into the scene
 * via a gradient mask. The only always-on chrome is a slim translucent
 * input bar at the bottom-right; the feed appears when messages arrive.
 *
 * SSE orchestration lives in `useChatStream`; this file is the UI +
 * key handlers + first-visit greeting seed.
 *
 * Keyboard:
 *   "/"  — focus the input from anywhere (except when already typing)
 *   Esc  — blur / abort in-flight stream
 *   Enter — submit
 */
export function ChatDock() {
  const t = useT();
  const lang = useStore((s) => s.lang);
  const messages = useStore((s) => s.chat.messages);
  const suggestions = useStore((s) => s.chat.suggestions);
  const appendMessage = useStore((s) => s.appendMessage);
  const setSuggestions = useStore((s) => s.setSuggestions);
  const clearSuggestions = useStore((s) => s.clearSuggestions);
  const finishStreaming = useStore((s) => s.finishStreaming);
  const activeContent = useStore((s) => s.world.activeContent);
  const isMobile = useIsMobile();
  const compactCockpit = isMobile && isCockpitVariant(readWorldVariant());
  const { isFirstVisit } = useFirstVisit();
  const { send, stop, isStreaming } = useChatStream();

  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  // Guard against React strict-mode double-mount + HMR re-runs. Once we've
  // seeded the greeting in this session we never do it again.
  const seededRef = useRef(false);

  // First-visit: seed a canned greeting + starter chips so the dock
  // doesn't greet the user with an empty box. Only fires once per
  // device (gated by localStorage in useFirstVisit).
  // biome-ignore lint/correctness/useExhaustiveDependencies: lang re-seeds if user swaps before typing
  useEffect(() => {
    if (!isFirstVisit) return;
    if (seededRef.current) return;
    if (messages.length > 0) return;
    if (useStore.getState().chat.messages.some((m) => m.id === "onboard-greeting")) {
      seededRef.current = true;
      return;
    }
    seededRef.current = true;
    const copy = onboarding[lang];
    appendMessage({ id: "onboard-greeting", role: "assistant", content: copy.greeting });
    setSuggestions(copy.starter);
  }, [isFirstVisit, lang]);

  // Re-pins the feed to the bottom whenever messages arrive OR the last
  // message's content grows (token streams). `scrollTop =` over smooth
  // behaviour so we don't fight the animation on every token tick.
  const lastLen = messages[messages.length - 1]?.content.length ?? 0;
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll tied to count + last length
  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, lastLen, isStreaming]);

  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        requestAnimationFrame(() => inputRef.current?.focus());
      }
      if (e.key === "Escape") {
        if (isStreaming) {
          useStore.getState().chat.abortController?.abort();
          finishStreaming();
        } else {
          inputRef.current?.blur();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isStreaming, finishStreaming]);

  const onInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void send(draft);
        setDraft("");
      }
    },
    [draft, send],
  );

  const lastAssistant = useMemo(() => findLastAssistant(messages), [messages]);
  const isPresenting = activeContent !== null;
  // Section presentations used to hide the transcript completely. That made
  // the cockpit feel as if COMMS had gone offline whenever a project,
  // experience or skill screen opened. Keep the latest exchange visible in a
  // compact strip instead; the full transcript returns automatically at hub.
  const compactFeed = compactCockpit || isPresenting;
  const feedMessages = isPresenting
    ? messages.slice(-2)
    : compactCockpit
      ? messages.filter((message) => message.id !== "onboard-greeting").slice(-2)
      : messages;
  const visibleSuggestions = isPresenting ? suggestions.slice(0, 3) : suggestions;
  const hasFeedContent = feedMessages.length > 0 || visibleSuggestions.length > 0;

  const activateSuggestion = useCallback(
    (suggestion: Suggestion) => {
      const state = useStore.getState();
      const navigate = (
        target: "projects" | "experience" | "skills" | "contact",
        event:
          | { kind: "content.project"; project: "vocabuddy" }
          | { kind: "content.experience"; company: "formica" }
          | { kind: "content.skill_group"; group: "ai" }
          | { kind: "content.contact_card" },
      ) => {
        clearSuggestions();
        state.applyUiEvent({ kind: "camera.focus", target });
        state.applyUiEvent({ kind: "mascot.move", zone: target });
        state.applyUiEvent(event);
      };

      switch (suggestion.id) {
        case "projects":
          navigate("projects", { kind: "content.project", project: "vocabuddy" });
          return;
        case "experience":
          navigate("experience", { kind: "content.experience", company: "formica" });
          return;
        case "skills":
          navigate("skills", { kind: "content.skill_group", group: "ai" });
          return;
        case "contact":
          navigate("contact", { kind: "content.contact_card" });
          return;
        default:
          clearSuggestions();
          void send(suggestion.prompt);
      }
    },
    [clearSuggestions, send],
  );

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex flex-col items-end">
      {/* --- Message feed: stacks up from bottom, fades into scene at top --- */}
      {hasFeedContent && (
        <div
          ref={feedRef}
          data-presenting={isPresenting ? "true" : "false"}
          aria-live="polite"
          aria-atomic="false"
          className={cn(
            "chat-feed pointer-events-auto flex max-h-[46vh] w-full max-w-[440px] flex-col gap-1.5 overflow-y-auto px-5 pb-2 pt-10",
            isPresenting &&
              "!max-h-[24vh] max-w-[420px] rounded-tl-2xl border-l border-t border-[var(--holo-edge)] bg-black/28 px-5 pb-2 pt-4 backdrop-blur-sm [mask-image:none]",
            compactCockpit &&
              "!max-h-20 max-w-full overflow-y-hidden px-3 pb-1 pt-0 [mask-image:none]",
          )}
        >
          {feedMessages.map((m) => (
            <Line
              key={m.id}
              role={m.role}
              content={m.content + (m.streaming && m === lastAssistant ? "▍" : "")}
            />
          ))}

          {/* Follow-up chips — shown only when the agent left any and the
              stream has completed for the current turn. */}
          {visibleSuggestions.length > 0 && !isStreaming && (
            <div
              className={cn(
                "chat-line flex flex-wrap justify-end gap-1.5 pt-1",
                compactFeed &&
                  "w-full !flex-wrap justify-center gap-1.5 overflow-visible pb-1 pt-0",
              )}
            >
              {visibleSuggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => activateSuggestion(s)}
                  className={cn(
                    "pointer-events-auto shrink-0 rounded-full border border-[var(--color-accent)]/50 bg-[var(--color-accent)]/12 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-[var(--color-accent)] shadow-[0_0_10px_-4px_var(--color-accent)] transition hover:bg-[var(--color-accent)]/25",
                    compactFeed && "px-2 py-0.5 text-[9px] tracking-[0.08em]",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- Slim input bar at bottom-right ---------------------------- */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
          setDraft("");
        }}
        className="pointer-events-auto mb-5 mr-5 flex w-[min(440px,92vw)] items-center gap-2 rounded-full border border-[var(--holo-edge)] bg-black/45 px-4 py-2 text-[13px] backdrop-blur-md transition focus-within:border-[var(--color-accent)] focus-within:shadow-[0_0_18px_-6px_var(--color-accent)] max-[480px]:mb-3 max-[480px]:mr-3 max-[480px]:w-[calc(100vw-1.5rem)]"
      >
        <span
          aria-hidden
          className={cn(
            "inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)] shadow-[0_0_6px_var(--color-accent)]",
            isStreaming && "animate-pulse",
          )}
        />
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onInputKeyDown}
          placeholder={`${t.chat.placeholder}   /`}
          aria-label={t.chat.placeholder}
          className="flex-1 bg-transparent font-mono text-[13px] text-white outline-none placeholder:text-white/35"
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={stop}
            className="rounded-full border border-[var(--color-accent)]/40 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--color-accent)] transition hover:bg-[var(--color-accent)]/20"
          >
            {t.chat.stop}
          </button>
        ) : (
          <button
            type="submit"
            disabled={!draft.trim()}
            className="rounded-full border border-[var(--color-accent)]/50 bg-[var(--color-accent)]/15 px-3 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--color-accent)] transition hover:bg-[var(--color-accent)]/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t.chat.send}
          </button>
        )}
      </form>
    </div>
  );
}

/**
 * Single chat line — Twitch-style: no bubble, no container, just a
 * coloured role tag + message body with a strong text-shadow so the
 * message stays legible over bright or dark scene backgrounds.
 */
function Line({ role, content }: { role: "user" | "assistant" | "system"; content: string }) {
  const isUser = role === "user";
  const tag = isUser ? "you" : "companion";
  return (
    <div
      className={cn(
        "chat-line w-full max-w-full whitespace-pre-wrap break-words text-right",
        "[text-shadow:0_1px_6px_rgba(0,0,0,0.9),0_0_2px_rgba(0,0,0,0.9)]",
      )}
    >
      <span
        className={cn(
          "mr-1.5 font-mono text-[10px] uppercase tracking-widest",
          isUser ? "text-[var(--color-accent)]" : "text-[var(--color-accent)]/70",
        )}
      >
        {tag} ›
      </span>
      <span
        className={cn(
          "text-[13px] leading-relaxed",
          isUser ? "font-mono text-[var(--color-accent)]" : "text-white/95",
        )}
      >
        {content || (role === "assistant" ? "…" : "")}
      </span>
    </div>
  );
}
