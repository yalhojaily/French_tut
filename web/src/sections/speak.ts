import { play } from "../audio";
import { h, icon } from "../dom";
import type { Speakable } from "../types";

/** زر تشغيل لعنصر صوتي. يضيف حالة "playing" أثناء التشغيل. */
export function speakButton(
  unitId: string,
  item: Speakable,
  opts: { slow?: boolean; label?: string; cls?: string; onChar?: (i: number) => void } = {},
) {
  const label = opts.label ?? (opts.slow ? "استمع ببطء" : "استمع");
  const btn = h("button", {
    type: "button",
    class: opts.slow ? "pill-btn" : (opts.cls ?? "icon-btn"),
    "aria-label": label,
    title: label,
    html: opts.slow ? `${icon.play}<span>ببطء</span>` : icon.play,
  });
  btn.addEventListener("click", async (e) => {
    e.stopPropagation();
    document.querySelectorAll(".playing").forEach((el) => el.classList.remove("playing"));
    btn.classList.add("playing");
    await play(unitId, item, { slow: opts.slow, onChar: opts.onChar });
    btn.classList.remove("playing");
  });
  return btn;
}

/** يقسّم الجملة إلى كلمات مع مواضعها، لتظليل الكلمة التي تُنطق */
export function karaokeText(text: string) {
  const el = h("span", { class: "fr karaoke", lang: "fr", dir: "ltr" });
  const words: { start: number; end: number; span: HTMLSpanElement }[] = [];
  let last = 0;
  for (const m of text.matchAll(/\S+/g)) {
    const start = m.index!;
    if (start > last) el.append(text.slice(last, start));
    const span = h("span", { class: "w" }, m[0]);
    el.append(span);
    words.push({ start, end: start + m[0].length, span });
    last = start + m[0].length;
  }
  let current: HTMLSpanElement | null = null;
  const onChar = (i: number) => {
    let next: HTMLSpanElement | null = null;
    if (i >= 0) {
      for (const w of words) {
        if (w.start <= i) next = w.span;
        else break;
      }
    }
    if (next === current) return;
    current?.classList.remove("on");
    next?.classList.add("on");
    current = next;
  };
  return { el, onChar };
}

/** جزء من الجملة (كلمة أو تعبير) مع معناه بالعربية */
export type Gloss = [fr: string, ar: string];

/**
 * جملة بترجمة فوق كل كلمة: يظهر المعنى فوق الكلمة لحظة نطقها ويبقى بعدها،
 * ويمكن إظهاره بالضغط على الكلمة. إن لم تطابق الأجزاء الجملة نعود للتظليل العادي.
 */
export function glossedText(text: string, gloss: Gloss[]) {
  if (gloss.map((g) => g[0]).join(" ") !== text) {
    console.warn("gloss does not match text:", text);
    return { ...karaokeText(text), reset: () => {} };
  }
  const el = h("span", { class: "fr karaoke glossed", lang: "fr", dir: "ltr" });
  const words: { start: number; span: HTMLSpanElement; chunk: HTMLSpanElement }[] = [];
  const chunks: HTMLSpanElement[] = [];
  let offset = 0;

  gloss.forEach(([frPart, ar], ci) => {
    const chunk = h("span", { class: `chunk${ar ? "" : " no-gloss"}`, tabindex: ar ? "0" : undefined });
    const g = h("span", { class: "g", lang: "ar", dir: "rtl", "aria-hidden": ar ? undefined : "true" }, ar || " ");
    const ws = h("span", { class: "ws" });
    for (const m of frPart.matchAll(/\S+/g)) {
      if (m.index! > 0 && ws.childNodes.length) ws.append(" ");
      const span = h("span", { class: "w" }, m[0]);
      ws.append(span);
      words.push({ start: offset + m.index!, span, chunk });
    }
    chunk.append(g, ws);
    if (ar) {
      const toggle = () => chunk.classList.toggle("open");
      chunk.addEventListener("click", toggle);
      chunk.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
      });
    }
    if (ci > 0) el.append(" ");
    el.append(chunk);
    chunks.push(chunk);
    offset += frPart.length + 1;
  });

  let current: (typeof words)[number] | null = null;
  const onChar = (i: number) => {
    let next: (typeof words)[number] | null = null;
    if (i >= 0) for (const w of words) { if (w.start <= i) next = w; else break; }
    if (next === current) return;
    current?.span.classList.remove("on");
    current?.chunk.classList.remove("speaking");
    if (next) {
      next.span.classList.add("on");
      next.chunk.classList.add("speaking", "seen");
    }
    current = next;
  };
  /** يخفي المعاني التي ظهرت أثناء تشغيل سابق */
  const reset = () => chunks.forEach((c) => c.classList.remove("seen"));
  return { el, onChar, reset };
}
