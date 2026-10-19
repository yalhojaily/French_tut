import { play, stop } from "../audio";
import { h, icon, richAr } from "../dom";
import type { DialogueSection } from "../types";
import { karaokeText, speakButton } from "./speak";

export function renderDialogue(unitId: string, s: DialogueSection): HTMLElement {
  let showTranslation = false;
  let playingAll = false;

  const rows = s.lines.map((line) => {
    const speaker = s.speakers[line.speaker];
    const text = karaokeText(line.say);
    const row = h(
      "li",
      { class: `line speaker-${line.speaker}` },
      h("div", { class: "line-who" }, speaker?.name_ar ?? line.speaker),
      h(
        "div",
        { class: "line-body" },
        h("p", { class: "line-fr" }, text.el),
        h("p", { class: "line-ar" }, line.ar),
      ),
      h(
        "div",
        { class: "line-actions" },
        speakButton(unitId, line, { onChar: text.onChar }),
        line.slow ? speakButton(unitId, line, { slow: true, onChar: text.onChar }) : null,
      ),
    );
    return { line, row, onChar: text.onChar };
  });

  const list = h("ol", { class: "dialogue hide-ar" }, rows.map((r) => r.row));

  const playAllBtn = h("button", { type: "button", class: "btn primary", html: `${icon.play}<span>استمع للحوار كاملاً</span>` });
  const slowToggle = h("input", { type: "checkbox", id: "dlg-slow" }) as HTMLInputElement;
  const trToggle = h("button", { type: "button", class: "btn ghost" }, "أظهر الترجمة");

  playAllBtn.addEventListener("click", async () => {
    if (playingAll) {
      playingAll = false;
      stop();
      return;
    }
    playingAll = true;
    playAllBtn.innerHTML = `${icon.stop}<span>إيقاف</span>`;
    for (const r of rows) {
      if (!playingAll) break;
      r.row.classList.add("active");
      r.row.scrollIntoView({ block: "nearest", behavior: "smooth" });
      await play(unitId, r.line, { slow: slowToggle.checked, onChar: r.onChar });
      r.row.classList.remove("active");
      if (playingAll) await new Promise((res) => setTimeout(res, 450));
    }
    playingAll = false;
    playAllBtn.innerHTML = `${icon.play}<span>استمع للحوار كاملاً</span>`;
  });

  trToggle.addEventListener("click", () => {
    showTranslation = !showTranslation;
    list.classList.toggle("hide-ar", !showTranslation);
    trToggle.textContent = showTranslation ? "أخفِ الترجمة" : "أظهر الترجمة";
  });

  return h(
    "div",
    { class: "section-dialogue" },
    h("p", { class: "lede" }, s.context_ar),
    h(
      "div",
      { class: "toolbar" },
      playAllBtn,
      h("label", { class: "toggle", for: "dlg-slow" }, slowToggle, h("span", null, "ببطء")),
      trToggle,
    ),
    h("p", { class: "hint" }, "استمع مرتين دون ترجمة. حاول أن تلتقط الأسماء والحروف، ثم أظهر الترجمة."),
    list,
    s.tip_ar ? h("aside", { class: "tip" }, richAr(s.tip_ar)) : null,
  );
}
