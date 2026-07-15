import { useEffect, useState } from "react";

const MOBILE_QUERY = "(max-width: 768px)";

function read(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_QUERY).matches;
}

/**
 * `true` when the viewport needs the compact camera and occlusion layout.
 * This intentionally follows available width instead of pointer type so
 * split-screen tablets and narrow desktop windows receive the same safe shot.
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
