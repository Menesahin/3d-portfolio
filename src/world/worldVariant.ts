export type WorldVariant = "legacy" | "cockpit" | "cockpit-v7";

/**
 * V7 is the production world. `?world=legacy` and `?world=cockpit` remain
 * explicit rollback paths while the versioned assets settle in production.
 */
export const DEFAULT_WORLD: WorldVariant = "cockpit-v7";

export function isCockpitVariant(variant: WorldVariant): boolean {
  return variant === "cockpit" || variant === "cockpit-v7";
}

export function readWorldVariant(search = globalThis.location?.search ?? ""): WorldVariant {
  const requested = new URLSearchParams(search).get("world");
  if (requested === "cockpit" || requested === "cockpit-v7" || requested === "legacy") {
    return requested;
  }
  return DEFAULT_WORLD;
}
