import { fr, h, richAr } from "../dom";
import type { GrammarSection } from "../types";
import { speakButton } from "./speak";

export function renderGrammar(unitId: string, s: GrammarSection): HTMLElement {
  return h(
    "div",
    { class: "section-grammar" },
    h("p", { class: "lede" }, richAr(s.intro_ar)),
    s.tables.map((t) =>
      h(
        "figure",
        { class: "gtable" },
        h("figcaption", null, fr(t.title_fr, "fr gtable-fr"), h("span", { class: "gtable-ar" }, t.title_ar)),
        h(
          "table",
          null,
          h("thead", null, h("tr", null, t.head_ar.map((c) => h("th", { scope: "col" }, c)), h("th", { scope: "col" }, "المعنى"), h("th", null))),
          h(
            "tbody",
            null,
            t.rows.map((r) =>
              h(
                "tr",
                null,
                r.cells.map((c, i) => {
                  // خلية بالعربية (شرح) لا تُعرض كنص فرنسي
                  const arabic = /[\u0600-\u06FF]/.test(c);
                  return h(i === 0 ? "th" : "td", { scope: i === 0 ? "row" : undefined, lang: arabic ? "ar" : "fr", dir: arabic ? "rtl" : "ltr", class: arabic ? "gt-ar-cell" : undefined }, arabic ? richAr(c) : c);
                }),
                h("td", { class: "gt-ar" }, richAr(r.ar)),
                h("td", { class: "gt-play" }, speakButton(unitId, r, { label: `استمع: ${r.say}`, cls: "icon-btn small" })),
              ),
            ),
          ),
        ),
        t.note_ar ? h("p", { class: "gtable-note" }, richAr(t.note_ar)) : null,
      ),
    ),
    s.points_ar?.length
      ? h("ul", { class: "gpoints" }, s.points_ar.map((p) => h("li", null, richAr(p))))
      : null,
  );
}
