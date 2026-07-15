import type { EmoteIcon, MascotExpression, MascotGesture } from "@/types/tools";

export type EmotionChoreography = {
  gesture: MascotGesture | null;
  emote: EmoteIcon | null;
  /** Local hover offset layered over locomotion, in scene units. */
  lift: number;
  /** Subtle silhouette change; large beats still come from animation clips. */
  scale: number;
  /** Extra body pitch, in radians. */
  pitch: number;
};

/**
 * One semantic emotion drives Köfte's face, hands and body together.
 * Keeping this table outside the renderer makes the choreography explicit,
 * testable and shared by both the trigger coordinator and GLB motion layer.
 */
export const EMOTION_CHOREOGRAPHY: Record<MascotExpression, EmotionChoreography> = {
  idle: { gesture: null, emote: null, lift: 0, scale: 1, pitch: 0 },
  happy: { gesture: "thumbs_up", emote: "heart", lift: 0.065, scale: 1.018, pitch: -0.015 },
  excited: { gesture: "celebrate", emote: "star", lift: 0.22, scale: 1.045, pitch: -0.055 },
  surprised: {
    gesture: "head_tilt",
    emote: "exclamation",
    lift: 0.085,
    scale: 1.02,
    pitch: -0.025,
  },
  thinking: { gesture: "head_tilt", emote: "lightbulb", lift: 0, scale: 1, pitch: 0.015 },
  sad: { gesture: "shy", emote: null, lift: -0.04, scale: 0.975, pitch: 0.055 },
  wink: { gesture: "thumbs_up", emote: "sparkle", lift: 0.035, scale: 1.01, pitch: -0.01 },
};

export function getEmotionChoreography(expression: MascotExpression): EmotionChoreography {
  return EMOTION_CHOREOGRAPHY[expression];
}
