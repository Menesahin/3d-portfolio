import { useEffect, useState } from "react";

const MOBILE_QUERY = "(max-width: 768px) and (pointer: coarse)";

function read(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_QUERY).matches;
}

/**
 * `true` when the viewport is small AND the primary input is touch.
 * The pointer:coarse half rules out narrow-window desktop browsers, so a
 * desktop user resizing their window doesn't accidentally fall into a
 * mobile-only path.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(read);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(mq.matches);
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  return isMobile;
}
