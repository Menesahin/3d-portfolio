import type { Lang } from "@/stores/slices/lang";
import { en } from "./en";
import { tr } from "./tr";

export type { Dict } from "./en";

export const content = { en, tr } as const satisfies Record<Lang, unknown>;
