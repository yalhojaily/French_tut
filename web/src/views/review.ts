import { play } from "../audio";
import { clear, h, icon, richAr } from "../dom";
import { deckStats, dueCards, grades, previewIntervals, review } from "../srs";

export function renderReview(): HTMLElement {
  const stage = h("div", { class: "review-stage" });
  const counter = h("p", { class: "review-count", "aria-live": "polite" });
  let reviewed = 0;

  const updateCounter = () => {
    const s = deckStats();
    counter.textContent = `مستحقة الآن: ${s.due}، في المراجعة: ${s.total}، ثابتة في الذاكرة: ${s.mature}`;
  };

  const showNext = () => {
    clear(stage);
    updateCounter();
    const due = dueCards();
    if (!due.length) {
      const s = deckStats();
      stage.append(
        h("div", { class: "empty" },
          h("p", { class: "empty-title" }, reviewed ? `أنهيت ${reviewed} بطاقة.` : s.total ? "لا بطاقات مستحقة الآن." : "لا بطاقات في المراجعة بعد."),
          h("p", null, s.total
            ? "ستظهر البطاقات هنا في الوقت المناسب قبل أن تنساها. عد لاحقاً."
            : "أضف بطاقات من قسم «البطاقات» في آخر كل وحدة."),
          h("a", { class: "btn ghost", href: "#/" }, "خريطة المنهج"),
        ),
      );
      return;
    }

    const { key, unitId, card } = due[0];
    const front = h("div", { class: "flash-front", lang: "fr", dir: "ltr" }, card.front);
    const listen = h("button", { type: "button", class: "big-play", "aria-label": "استمع", html: icon.play });
    listen.addEventListener("click", () => play(unitId, card));

    const back = h("div", { class: "flash-back", hidden: true }, richAr(card.back_ar));
    const reveal = h("button", { type: "button", class: "btn primary big" }, "أظهر الجواب");
    const intervals = previewIntervals(key);
    const gradeRow = h(
      "div",
      { class: "grades", hidden: true },
      grades.map((g) => {
        const b = h("button", { type: "button", class: `grade ${g.tone}` },
          h("span", null, g.label),
          h("small", null, intervals[g.rating] ?? ""),
        );
        b.addEventListener("click", () => {
          review(key, g.rating);
          reviewed++;
          window.dispatchEvent(new Event("deck-changed"));
          showNext();
        });
        return b;
      }),
    );

    reveal.addEventListener("click", () => {
      back.hidden = false;
      gradeRow.hidden = false;
      reveal.hidden = true;
      void play(unitId, card);
      (gradeRow.querySelector(".good") as HTMLButtonElement | null)?.focus();
    });

    stage.append(
      h("div", { class: "flash" }, front, listen, back),
      reveal,
      gradeRow,
      h("p", { class: "hint" }, "قل الجواب بصوت عالٍ قبل أن تكشفه، ثم قيّم نفسك بصدق."),
    );
  };

  showNext();

  return h(
    "main",
    { class: "review" },
    h("nav", { class: "crumbs" }, h("a", { href: "#/" }, "خريطة المنهج")),
    h("h1", null, "المراجعة"),
    counter,
    stage,
  );
}
