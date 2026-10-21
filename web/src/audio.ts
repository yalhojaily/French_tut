// تشغيل الصوت: ملفات ElevenLabs المولّدة مسبقاً أولاً، وصوت المتصفح احتياطياً.

import type { Speakable } from "./types";

interface Alignment {
  chars: string[];
  start: number[];
  end: number[];
}

interface ManifestEntry {
  file: string;
  text: string;
  alignment: Alignment;
}

export interface PlayOptions {
  slow?: boolean;
  /** يُستدعى مع موضع الحرف الذي يُنطق الآن (لتظليل الكلمة) */
  onChar?: (charIndex: number) => void;
}

import { load, save } from "./store";

const BASE = import.meta.env.BASE_URL;

/** مصدر الصوت: الملفات المولّدة (ElevenLabs) أو صوت المتصفح الفرنسي */
export type AudioSource = "generated" | "browser";
let source: AudioSource = load<AudioSource>("audioSource", "generated");
export const getSource = () => source;
export function setSource(next: AudioSource) {
  source = next;
  save("audioSource", next);
}
let manifest: Record<string, ManifestEntry> = {};
let stopCurrent: (() => void) | null = null;

export async function loadManifest(): Promise<void> {
  try {
    const res = await fetch(`${BASE}audio/manifest.json`, { cache: "no-cache" });
    if (res.ok) manifest = await res.json();
  } catch {
    manifest = {};
  }
}

/** هل لهذه الوحدة صوت مولّد من ElevenLabs؟ */
export function hasGeneratedAudio(unitId: string): boolean {
  return Object.keys(manifest).some((k) => k.startsWith(unitId + ":"));
}

export function stop() {
  stopCurrent?.();
  stopCurrent = null;
}

export function play(unitId: string, item: Speakable, opts: PlayOptions = {}): Promise<void> {
  stop();
  const key = `${unitId}:${item.id}`;
  const slowEntry = opts.slow ? manifest[key + "@slow"] : undefined;
  const entry = slowEntry ?? manifest[key];
  if (source === "generated" && entry && entry.text === item.say) {
    // لا توجد نسخة بطيئة مولّدة؟ نبطّئ النسخة العادية في المتصفح
    const rate = opts.slow && !slowEntry ? 0.75 : 1;
    return playFile(entry, rate, opts.onChar);
  }
  return speakWithBrowser(item.say, opts.slow ? 0.7 : 0.95, opts.onChar);
}

function playFile(entry: ManifestEntry, rate: number, onChar?: (i: number) => void): Promise<void> {
  return new Promise((resolve) => {
    const audio = new Audio(`${BASE}audio/${entry.file}`);
    audio.playbackRate = rate;
    audio.preservesPitch = true;
    let raf = 0;
    const starts = entry.alignment.start;

    const tick = () => {
      if (onChar && starts.length) {
        const t = audio.currentTime;
        // آخر حرف بدأ نطقه حتى الآن (بحث ثنائي)
        let lo = 0, hi = starts.length - 1, idx = -1;
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          if (starts[mid] <= t) { idx = mid; lo = mid + 1; } else hi = mid - 1;
        }
        if (idx >= 0) onChar(idx);
      }
      raf = requestAnimationFrame(tick);
    };

    const finish = () => {
      cancelAnimationFrame(raf);
      onChar?.(-1);
      resolve();
    };
    audio.addEventListener("ended", finish, { once: true });
    audio.addEventListener("error", finish, { once: true });
    stopCurrent = () => { audio.pause(); finish(); };
    audio.play().then(() => { raf = requestAnimationFrame(tick); }).catch(finish);
  });
}

function frenchVoice(): SpeechSynthesisVoice | undefined {
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("fr"));
  // نفضّل fr-FR والأصوات عالية الجودة إن وُجدت
  return (
    voices.find((v) => v.lang === "fr-FR" && /natural|premium|enhanced|google/i.test(v.name)) ??
    voices.find((v) => v.lang === "fr-FR") ??
    voices[0]
  );
}

function speakWithBrowser(text: string, rate: number, onChar?: (i: number) => void): Promise<void> {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "fr-FR";
    const v = frenchVoice();
    if (v) u.voice = v;
    u.rate = rate;
    const finish = () => { onChar?.(-1); resolve(); };
    u.onboundary = (e) => onChar?.(e.charIndex);
    u.onend = finish;
    u.onerror = finish;
    stopCurrent = () => { speechSynthesis.cancel(); finish(); };
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  });
}

// بعض المتصفحات تحمّل قائمة الأصوات متأخرة
if ("speechSynthesis" in window) speechSynthesis.getVoices();
