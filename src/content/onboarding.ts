import type { Lang } from "@/stores/slices/lang";
import type { Suggestion } from "@/types/tools";

/**
 * First-visit canned onboarding — the greeting bubble the assistant
 * appears to have already sent plus the starter chip row beneath it.
 * Same shape both languages so `ChatDock` can pick by `useT`'s lang.
 */
export type OnboardingCopy = {
  hint: string; // 3D floating text above mascot
  greeting: string; // canned assistant message
  starter: Suggestion[]; // 4–5 starter chips
};

export const onboarding: Record<Lang, OnboardingCopy> = {
  en: {
    hint: "✨ ask me anything  ›  press /",
    greeting:
      "Hi — I'm Köfte, Captain Enes's tiny cockpit copilot. I can navigate his projects, flight log and engineering systems with you. Pick a console below, or ask me anything about him.",
    starter: [
      { id: "who", label: "Who is Enes?", prompt: "Who is Enes?" },
      { id: "projects", label: "Show projects", prompt: "Show me his projects" },
      { id: "experience", label: "Experience", prompt: "Walk me through his experience" },
      { id: "skills", label: "Skills", prompt: "What is Enes good at?" },
      { id: "contact", label: "Contact", prompt: "How can I reach Enes?" },
    ],
  },
  tr: {
    hint: "✨ her şeyi sor  ›  / tuşuna bas",
    greeting:
      "Selam — ben Köfte, Kaptan Enes'in minik kokpit yardımcısıyım. Projelerini, uçuş günlüğünü ve mühendislik sistemlerini birlikte gezebiliriz. Bir konsol seç ya da Enes hakkında istediğini sor.",
    starter: [
      { id: "who", label: "Enes kim?", prompt: "Enes kim?" },
      { id: "projects", label: "Projeleri göster", prompt: "Projelerini gösterir misin?" },
      { id: "experience", label: "Deneyim", prompt: "Deneyimlerinden bahseder misin?" },
      { id: "skills", label: "Yetenekler", prompt: "Enes hangi konularda iyi?" },
      { id: "contact", label: "İletişim", prompt: "Enes'e nasıl ulaşabilirim?" },
    ],
  },
};
