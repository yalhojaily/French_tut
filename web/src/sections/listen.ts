import { play } from "../audio";
import { clear, h, icon, richAr } from "../dom";
import type { ListenSection } from "../types";

export function renderListen(unitId: string, s: ListenSection, onDone: () => void): HTMLElement {
  const stage = h("div", { class: "quiz" });
  const order = shuffle([...s.items]);
  let index = 0;
  let correct = 0;
  const mistakes: string[] = [];

  const showQuestion = () => {
    clear(stage);
    const item = order[index];
    let answered = false;

    const listenBtn = h("button", { type: "button", class: "big-play", "aria-label": "استمع", html: icon.play });
    listenBtn.addEventListener("click", () => play(unitId, item));

    const feedback = h("div", { class: "feedback", "aria-live": "polite" });
    const nextBtn = h("button", { type: "button", class: "btn primary", hidden: true }, index < order.length - 1 ? "السؤال التالي" : "النتيجة");
    nextBtn.addEventListener("click", () => {
      index++;
      if (index < order.length) showQuestion();
      else showResult();
    });

    const options = h(
      "div",
      { class: "options" },
      item.options.map((opt) => {
        const b = h("button", { type: "button", class: "plaque option", lang: "fr" }, h("span", { class: "plaque-letter" }, opt));
        b.addEventListener("click", () => {
          if (answered) return;
          answered = true;
          const ok = opt === item.answer;
          if (ok) correct++;
          else mistakes.push(item.answer);
          options.querySelectorAll("button").forEach((btn) => {
            const val = btn.textContent;
            if (val === item.answer) btn.classList.add("right");
            else if (btn === b) btn.classList.add("wrong");
            btn.setAttribute("disabled", "");
          });
          feedback.className = `feedback ${ok ? "ok" : "no"}`;
          feedback.replaceChildren(h("strong", null, ok ? "صحيح." : `الجواب: ${item.answer}.`), " ", richAr(item.explain_ar));
          nextBtn.hidden = false;
          nextBtn.focus();
        });
        return b;
      }),
    );

    stage.append(
      h("div", { class: "quiz-progress" }, `${index + 1} من ${order.length}`, h("progress", { max: order.length, value: index })),
      h("div", { class: "quiz-ask" }, listenBtn, h("span", null, "اضغط للاستماع، ثم اختر الحرف")),
      options,
      feedback,
      nextBtn,
    );
    void play(unitId, item);
  };

  const showResult = () => {
    clear(stage);
    const again = h("button", { type: "button", class: "btn ghost" }, "أعد التمرين");
    again.addEventListener("click", () => {
      shuffle(order);
      index = 0;
      correct = 0;
      mistakes.length = 0;
      showQuestion();
    });
    stage.append(
      h("div", { class: "result" },
        h("p", { class: "result-score" }, `${correct} / ${order.length}`),
        h("p", null, correct === order.length ? "ممتاز، أذنك تميّز هذه الحروف." : "راجع الحروف التي أخطأت فيها في قسم الحروف، ثم أعد التمرين."),
        mistakes.length ? h("p", { class: "mistakes" }, "راجع: ", h("span", { lang: "fr", dir: "ltr" }, [...new Set(mistakes)].join("  "))) : null,
        again,
      ),
    );
    onDone();
  };

  const start = h("button", { type: "button", class: "btn primary", html: `${icon.play}<span>ابدأ التمرين</span>` });
  start.addEventListener("click", showQuestion);
  stage.append(h("div", { class: "quiz-start" }, h("p", null, `${order.length} أسئلة. كل سؤال: تسمع حرفاً وتختار ما سمعته.`), start));

  return h("div", { class: "section-listen" }, h("p", { class: "lede" }, s.hint_ar), stage);
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
