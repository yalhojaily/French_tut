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
