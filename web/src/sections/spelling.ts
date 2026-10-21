import { play } from "../audio";
import { clear, fr, h, icon, richAr } from "../dom";
import type { SpellingSection } from "../types";

const ACCENT_KEYS = ["é", "è", "ê", "ë", "à", "â", "ç", "î", "ï", "ô", "ù", "û"];

const stripAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

export function renderSpelling(unitId: string, s: SpellingSection, onDone: () => void): HTMLElement {
  const stage = h("div", { class: "quiz" });
  let index = 0;
  let correct = 0;

  const showItem = () => {
    clear(stage);
    const item = s.items[index];
    let checked = false;

    const input = h("input", {
      type: "text",
      class: "spell-input",
      lang: "fr",
      dir: "ltr",
      autocomplete: "off",
      autocapitalize: "off",
      spellcheck: "false",
      "aria-label": "اكتب الكلمة",
    }) as HTMLInputElement;

    const keys = h(
      "div",
      { class: "accent-keys", "aria-label": "حروف بعلامات" },
      ACCENT_KEYS.map((ch) => {
        const k = h("button", { type: "button", class: "key", lang: "fr" }, ch);
        // mousedown حتى لا يفقد الحقل التركيز
        k.addEventListener("mousedown", (e) => e.preventDefault());
        k.addEventListener("click", () => {
          const start = input.selectionStart ?? input.value.length;
          const end = input.selectionEnd ?? start;
          input.setRangeText(ch, start, end, "end");
          input.focus();
        });
        return k;
      }),
    );

    const feedback = h("div", { class: "feedback", "aria-live": "polite" });
    const checkBtn = h("button", { type: "button", class: "btn primary" }, "تحقّق");
    const nextBtn = h("button", { type: "button", class: "btn primary", hidden: true }, index < s.items.length - 1 ? "الكلمة التالية" : "النتيجة");

    const check = () => {
      if (checked) {
        nextBtn.click();
        return;
      }
      const given = input.value.trim();
      if (!given) {
        feedback.className = "feedback";
        feedback.textContent = "اكتب الكلمة أولاً.";
        return;
      }
      checked = true;
      // نوحّد الفواصل العليا والمسافات: l’hôtel = l'hôtel
      // ونوحّد كتابة الأرقام: 1 200 = 1200، و 10.50 € = 10,50
      const norm = (t: string) =>
        t.toLowerCase().replace(/[’‘`´]/g, "'").replace(/€/g, "").trim()
          .replace(/(\d)[\s\u00a0\u202f]+(?=\d)/g, "$1").replace(/(\d)\.(\d)/g, "$1,$2")
          .replace(/\s+/g, " ");
      const exact = norm(given) === norm(item.answer);
      const accentsOnly = !exact && stripAccents(norm(given)) === stripAccents(norm(item.answer));
      if (exact) correct++;
      feedback.className = `feedback ${exact ? "ok" : "no"}`;
      feedback.replaceChildren(
        h("strong", null, exact ? "صحيح." : accentsOnly ? "قريب جداً، انتبه للعلامات:" : "الجواب:"),
        " ",
        fr(item.answer, "fr answer"),
        h("span", { class: "answer-ar" }, ` (${item.ar})`),
      );
      input.setAttribute("readonly", "");
      checkBtn.hidden = true;
      nextBtn.hidden = false;
      nextBtn.focus();
    };

    checkBtn.addEventListener("click", check);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") check();
    });
    nextBtn.addEventListener("click", () => {
      index++;
      if (index < s.items.length) showItem();
      else showResult();
    });

    const listen = h("button", { type: "button", class: "big-play", "aria-label": "استمع للتهجئة", html: icon.play });
    listen.addEventListener("click", () => play(unitId, item));
    const slow = h("button", { type: "button", class: "pill-btn", "aria-label": "استمع ببطء", html: `${icon.play}<span>ببطء</span>` });
    slow.addEventListener("click", () => play(unitId, item, { slow: true }));

    stage.append(
      h("div", { class: "quiz-progress" }, `${index + 1} من ${s.items.length}`, h("progress", { max: s.items.length, value: index })),
      h("div", { class: "quiz-ask" }, listen, slow, h("span", null, s.prompt_ar ?? "استمع للتهجئة واكتب الكلمة")),
      ...(s.show_meaning ? [h("p", { class: "clue" }, "المعنى: ", h("strong", null, item.ar))] : []),
      input,
      keys,
      h("div", { class: "row" }, checkBtn, nextBtn),
      feedback,
    );
    input.focus();
    void play(unitId, item);
  };

  const showResult = () => {
    clear(stage);
    const again = h("button", { type: "button", class: "btn ghost" }, "أعد التمرين");
    again.addEventListener("click", () => {
      index = 0;
      correct = 0;
      showItem();
    });
    stage.append(
      h("div", { class: "result" },
        h("p", { class: "result-score" }, `${correct} / ${s.items.length}`),
        h("p", null, richAr(s.result_ar ?? "أهم ما في هذا التمرين: أن تسمع **accent aigu** و **accent grave** فتعرف أي علامة تكتب.")),
        again,
      ),
    );
    onDone();
  };

  const start = h("button", { type: "button", class: "btn primary", html: `${icon.play}<span>${s.start_ar ?? "ابدأ الإملاء"}</span>` });
  start.addEventListener("click", showItem);
  stage.append(h("div", { class: "quiz-start" }, h("p", null, `${s.items.length} كلمات.`), start));

  return h("div", { class: "section-spelling" }, h("p", { class: "lede" }, s.hint_ar), stage);
}
