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
      "Hi — I'm the little companion that lives in Enes's 3D world. I can move the scene, summon holograms, and walk you through anything about him. Pick a starter below, or type your own.",
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
      "Selam — Enes'in 3D dünyasında yaşayan küçük yoldaşım. Sahneyi hareket ettirebilir, hologramlar çağırabilir ve Enes hakkında her şeyi anlatabilirim. Aşağıdan bir başlık seç, ya da kendin yaz.",
    starter: [
      { id: "who", label: "Enes kim?", prompt: "Enes kim?" },
      { id: "projects", label: "Projeleri göster", prompt: "Projelerini gösterir misin?" },
      { id: "experience", label: "Deneyim", prompt: "Deneyimlerinden bahseder misin?" },
      { id: "skills", label: "Yetenekler", prompt: "Enes hangi konularda iyi?" },
      { id: "contact", label: "İletişim", prompt: "Enes'e nasıl ulaşabilirim?" },
    ],
  },
};
