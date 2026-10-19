import { h, richAr } from "../dom";
import { addCards, isInDeck } from "../srs";
import type { FlashcardsSection } from "../types";
import { speakButton } from "./speak";

export function renderFlashcards(unitId: string, s: FlashcardsSection, onDone: () => void): HTMLElement {
  const alreadyIn = s.cards.every((c) => isInDeck(unitId, c.id));
  const status = h("p", { class: "deck-status", "aria-live": "polite" });
  const addBtn = h("button", { type: "button", class: "btn primary" }, alreadyIn ? "البطاقات في المراجعة" : `أضف ${s.cards.length} بطاقة إلى المراجعة`);
  if (alreadyIn) addBtn.setAttribute("disabled", "");

  addBtn.addEventListener("click", () => {
    const added = addCards(unitId, s.cards);
    addBtn.textContent = "البطاقات في المراجعة";
    addBtn.setAttribute("disabled", "");
    status.replaceChildren(
      `أُضيفت ${added} بطاقة. `,
      h("a", { href: "#/review" }, "ابدأ المراجعة الآن"),
    );
    onDone();
    window.dispatchEvent(new Event("deck-changed"));
  });

  return h(
    "div",
    { class: "section-flashcards" },
    h("p", { class: "lede" }, richAr(s.hint_ar)),
    h("div", { class: "toolbar" }, addBtn),
    status,
    h(
      "ul",
      { class: "card-preview" },
      s.cards.map((c) =>
        h(
          "li",
          null,
          speakButton(unitId, c, { cls: "icon-btn small" }),
          h("span", { class: "fr card-front", lang: "fr", dir: "ltr" }, c.front),
          h("span", { class: "card-back" }, richAr(c.back_ar)),
        ),
      ),
    ),
  );
}
