export type CockpitEffect = "warp" | "kofte-dance";

const events = new EventTarget();

export function emitCockpitEffect(effect: CockpitEffect): void {
  events.dispatchEvent(new CustomEvent<CockpitEffect>("effect", { detail: effect }));
}

export function onCockpitEffect(listener: (effect: CockpitEffect) => void): () => void {
  const handler = (event: Event) => listener((event as CustomEvent<CockpitEffect>).detail);
  events.addEventListener("effect", handler);
  return () => events.removeEventListener("effect", handler);
}
