import { useEffect, useRef } from "react";
import { type AppState, useStore } from "./index";

/**
 * Subscribe to a store slice by selector, write the latest value into a ref,
 * and return that ref. Use inside R3F imperative code where re-renders at
 * 60 fps would tank performance (see plan §9.5 — Zustand transient pattern).
 */
export function useStoreRef<T>(selector: (s: AppState) => T) {
  const ref = useRef<T>(selector(useStore.getState()));
  useEffect(() => {
    // subscribeWithSelector is already in the base store; equality defaults to Object.is.
    const unsub = useStore.subscribe(selector, (v) => {
      ref.current = v;
    });
    return unsub;
  }, [selector]);
  return ref;
}
