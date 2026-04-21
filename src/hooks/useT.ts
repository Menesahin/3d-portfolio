import { content, type Dict } from "@/content";
import { useStore } from "@/stores";

/**
 * Typed translation hook. Returns the current language's content tree.
 *   const t = useT();
 *   <p>{t.chat.placeholder}</p>
 */
export function useT(): Dict {
  const lang = useStore((s) => s.lang);
  return content[lang];
}
