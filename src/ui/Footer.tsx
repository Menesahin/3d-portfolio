import { useT } from "@/hooks/useT";

export function Footer() {
  const t = useT();
  return (
    <footer className="pointer-events-none fixed inset-x-0 bottom-0 z-10 px-4 pb-1 text-center text-[10px] text-[var(--color-fg)]/40">
      <span>{t.footer.attribution}</span>
      <span className="mx-2">·</span>
      <span>{t.footer.madeWith}</span>
    </footer>
  );
}
