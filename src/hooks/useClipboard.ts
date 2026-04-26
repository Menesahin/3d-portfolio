import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Tiny clipboard helper — `copy(value)` writes to the system clipboard
 * and flips `copied` to `true` for 1.2s so the UI can swap its icon.
 * Auto-resets; callers don't need to manage the timer.
 */
export function useClipboard(resetMs = 1200): {
  copy: (value: string) => Promise<void>;
  copied: boolean;
} {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const copy = useCallback(
    async (value: string) => {
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        if (timerRef.current != null) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => setCopied(false), resetMs);
      } catch {
        // Clipboard may be blocked (insecure origin, permission). Fail
        // quietly — the link row is still readable + selectable.
      }
    },
    [resetMs],
  );

  return { copy, copied };
}
