export type CockpitSound = "console" | "warp" | "dance";

const STORAGE_KEY = "portfolio:cockpit-sfx";
let context: AudioContext | null = null;
let enabled = false;
const preferenceListeners = new Set<(enabled: boolean) => void>();

export function readCockpitSoundPreference(): boolean {
  try {
    enabled = localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    enabled = false;
  }
  return enabled;
}

export async function setCockpitSoundPreference(next: boolean): Promise<void> {
  enabled = next;
  try {
    localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
  } catch {
    // Private browsing can reject persistence; sound still works in-session.
  }
  for (const listener of preferenceListeners) listener(next);
  if (!next) return;
  context ??= new AudioContext();
  if (context.state === "suspended") await context.resume();
}

export function isCockpitSoundEnabled(): boolean {
  return enabled;
}

export async function toggleCockpitSoundPreference(): Promise<boolean> {
  const next = !enabled;
  await setCockpitSoundPreference(next);
  return next;
}

export function onCockpitSoundPreference(listener: (enabled: boolean) => void): () => void {
  preferenceListeners.add(listener);
  return () => preferenceListeners.delete(listener);
}

function tone(
  startHz: number,
  endHz: number,
  duration: number,
  gainValue: number,
  delay = 0,
): void {
  if (!enabled || !context) return;
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(startHz, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, endHz), start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

export function playCockpitSound(sound: CockpitSound): void {
  if (sound === "warp") {
    tone(120, 720, 0.72, 0.045);
    tone(280, 980, 0.5, 0.025, 0.18);
    return;
  }
  if (sound === "dance") {
    tone(520, 680, 0.12, 0.035);
    tone(660, 880, 0.14, 0.03, 0.15);
    tone(880, 1040, 0.16, 0.025, 0.32);
    return;
  }
  tone(420, 620, 0.12, 0.025);
  tone(640, 820, 0.1, 0.018, 0.09);
}
