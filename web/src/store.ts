// حفظ التقدم في المتصفح. كل قراءة وكتابة محمية: الموقع يعمل حتى لو كان التخزين معطلاً.

const PREFIX = "french_tut:";

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* التخزين غير متاح: نتابع بدون حفظ */
  }
}

// ---------------------------------------------------------- تقدّم الوحدات

type Progress = Record<string, { done: string[] }>;

export function getProgress(unitId: string): string[] {
  return load<Progress>("progress", {})[unitId]?.done ?? [];
}

export function markSectionDone(unitId: string, sectionKey: string) {
  const all = load<Progress>("progress", {});
  const done = new Set(all[unitId]?.done ?? []);
  done.add(sectionKey);
  all[unitId] = { done: [...done] };
  save("progress", all);
}

/** نسبة الأقسام المنجزة في وحدة (0 إلى 1) */
export function unitCompletion(unitId: string, sectionCount: number): number {
  if (!sectionCount) return 0;
  return Math.min(1, getProgress(unitId).length / sectionCount);
}
