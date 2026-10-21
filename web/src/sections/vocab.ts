import { fr, h, richAr } from "../dom";
import type { VocabSection } from "../types";
import { speakButton } from "./speak";

export function renderVocab(unitId: string, s: VocabSection): HTMLElement {
  return h(
    "div",
    { class: "section-vocab" },
    h("p", { class: "lede" }, richAr(s.hint_ar)),
    s.groups.map((g) =>
      h(
        "section",
        { class: "vocab-group" },
        h("h3", null, g.title_ar),
        h(
          "ul",
          { class: "vocab-list" },
          g.items.map((w) =>
            h(
              "li",
              null,
              speakButton(unitId, w, { label: `استمع: ${w.fr ?? w.say}`, cls: "icon-btn small" }),
              fr(w.fr ?? w.say, "fr vocab-fr"),
              h("span", { class: "vocab-ar" }, richAr(w.ar)),
              w.note_ar ? h("span", { class: "vocab-note" }, richAr(w.note_ar)) : null,
            ),
          ),
        ),
      ),
    ),
  );
}
