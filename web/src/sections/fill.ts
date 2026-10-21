import { play } from "../audio";
import { clear, fr, h, icon, richAr } from "../dom";
import type { FillSection } from "../types";

/** اختر الكلمة الناقصة. بعد الإجابة تظهر الجملة كاملة وتُسمع. */
export function renderFill(unitId: string, s: FillSection, onDone: () => void): HTMLElement {
  const stage = h("div", { class: "quiz" });
  let index = 0;
  let correct = 0;

  const sentence = (text: string, fillWith?: string, ok?: boolean) => {
    const [before, after] = text.split("___");
    return h("p", { class: "fill-text", lang: "fr", dir: "ltr" },
      before,
      h("span", { class: `blank${fillWith ? (ok ? " right" : " wrong") : ""}` }, fillWith ?? "     "),
      after ?? "",
    );
  };

  const showItem = () => {
    clear(stage);
    const item = s.items[index];
    let answered = false;
    const textBox = h("div", { class: "fill-box" }, sentence(item.text));
    const feedback = h("div", { class: "feedback", "aria-live": "polite" });
    const nextBtn = h("button", { type: "button", class: "btn primary", hidden: true }, index < s.items.length - 1 ? "التالي" : "النتيجة");
    nextBtn.addEventListener("click", () => {
      index++;
      if (index < s.items.length) showItem();
      else showResult();
    });

    const options = h("div", { class: "options" },
      item.options.map((opt) => {
        const b = h("button", { type: "button", class: "plaque option word", lang: "fr" }, h("span", { class: "plaque-letter" }, opt));
        b.addEventListener("click", () => {
          if (answered) return;
          answered = true;
          const ok = opt === item.answer;
          if (ok) correct++;
          options.querySelectorAll("button").forEach((btn) => {
            if (btn.textContent === item.answer) btn.classList.add("right");
            else if (btn === b) btn.classList.add("wrong");
            btn.setAttribute("disabled", "");
          });
          clear(textBox);
          textBox.append(sentence(item.text, item.answer, true), h("p", { class: "fill-ar" }, item.ar));
          feedback.className = `feedback ${ok ? "ok" : "no"}`;
          feedback.replaceChildren(h("strong", null, ok ? "صحيح." : `الجواب: `), ok ? "" : fr(item.answer), " ", richAr(item.explain_ar));
          nextBtn.hidden = false;
          nextBtn.focus();
          void play(unitId, item);
        });
        return b;
      }),
    );

    const listenAgain = h("button", { type: "button", class: "icon-btn", "aria-label": "استمع للجملة", title: "استمع للجملة", html: icon.play });
    listenAgain.addEventListener("click", () => play(unitId, item));

    stage.append(
      h("div", { class: "quiz-progress" }, `${index + 1} من ${s.items.length}`, h("progress", { max: s.items.length, value: index })),
      ...(item.context_ar ? [h("p", { class: "fill-context" }, richAr(item.context_ar))] : []),
      textBox,
      options,
      feedback,
      h("div", { class: "row" }, nextBtn, listenAgain),
    );
  };

  const showResult = () => {
    clear(stage);
    const again = h("button", { type: "button", class: "btn ghost" }, "أعد التمرين");
    again.addEventListener("click", () => { index = 0; correct = 0; showItem(); });
    stage.append(h("div", { class: "result" },
      h("p", { class: "result-score" }, `${correct} / ${s.items.length}`),
      h("p", null, correct === s.items.length ? "ممتاز!" : "راجع جدول القواعد ثم أعد التمرين."),
      again,
    ));
    onDone();
  };

  const start = h("button", { type: "button", class: "btn primary" }, "ابدأ التمرين");
  start.addEventListener("click", showItem);
  stage.append(h("div", { class: "quiz-start" }, h("p", null, `${s.items.length} جمل. اختر الكلمة الناقصة.`), start));

  return h("div", { class: "section-fill" }, h("p", { class: "lede" }, richAr(s.hint_ar)), stage);
}
