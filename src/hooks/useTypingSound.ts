import { useCallback, useEffect, useRef } from "react";

/**
 * Generated-in-JS typewriter click — one short triangle-wave blip per
 * token (throttled). No audio asset, no bundle cost. The AudioContext
 * is lazily created on the first user gesture (mandated by every
 * modern browser's autoplay policy).
 *
 * Usage:
 *   const typing = useTypingSound();
 *   onSubmit(() => { typing.ensureCtx(); ... });
 *   for await (const ev of streamChat(...)) {
 *     if (ev.type === "token") { appendDelta(ev.delta); typing.click(); }
 *   }
 */
export function useTypingSound(options?: {
  /** Peak gain per click — keep small, clicks compound. 0.04 is pleasant. */
  volume?: number;
  /**
   * Minimum ms between two clicks. At ~90ms we get ~11 clicks/sec which
   * reads as "someone typing fast" without becoming a drone.
   */
  throttleMs?: number;
}): {
  ensureCtx: () => void;
  click: () => void;
  setEnabled: (v: boolean) => void;
  enabled: boolean;
} {
  const { volume = 0.04, throttleMs = 90 } = options ?? {};
  const ctxRef = useRef<AudioContext | null>(null);
  const lastPlayRef = useRef(0);
  const enabledRef = useRef(true);

  const ensureCtx = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!ctxRef.current) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      try {
        ctxRef.current = new Ctor();
      } catch {
        ctxRef.current = null;
      }
    }
    if (ctxRef.current && ctxRef.current.state === "suspended") {
      void ctxRef.current.resume();
    }
  }, []);

  const click = useCallback(() => {
    if (!enabledRef.current) return;
    const ctx = ctxRef.current;
    if (!ctx || ctx.state !== "running") return;

    const now = performance.now();
    if (now - lastPlayRef.current < throttleMs) return;
    lastPlayRef.current = now;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    // Slight pitch jitter so the stream doesn't read as a single note.
    osc.frequency.value = 1600 + Math.random() * 420;
    const start = ctx.currentTime;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.004);
    gain.gain.linearRampToValueAtTime(0, start + 0.032);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.04);
  }, [throttleMs, volume]);

  const setEnabled = useCallback((v: boolean) => {
    enabledRef.current = v;
  }, []);

  useEffect(
    () => () => {
      const ctx = ctxRef.current;
      ctxRef.current = null;
      if (ctx) void ctx.close().catch(() => {});
    },
    [],
  );

  return { ensureCtx, click, setEnabled, enabled: enabledRef.current };
}
