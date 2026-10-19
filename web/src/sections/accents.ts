import { fr, h, richAr } from "../dom";
import type { AccentsSection } from "../types";
import { speakButton } from "./speak";

export function renderAccents(unitId: string, s: AccentsSection): HTMLElement {
  return h(
    "div",
    { class: "section-accents" },
    h("p", { class: "lede" }, richAr(s.hint_ar)),
    h(
      "ul",
      { class: "accent-list" },
      s.items.map((a) =>
        h(
          "li",
          { class: "accent" },
          h("div", { class: "accent-mark", lang: "fr", dir: "ltr" }, a.mark),
          h(
            "div",
            { class: "accent-body" },
            h(
              "h3",
              { class: "accent-name" },
              fr(a.name_fr),
              speakButton(unitId, a, { label: `استمع: ${a.name_fr}` }),
              h("span", { class: "accent-ar" }, a.name_ar),
            ),
            h("p", null, richAr(a.effect_ar)),
            h(
              "div",
              { class: "chips" },
              a.examples.map((w) =>
                h("span", { class: "chip" }, speakButton(unitId, w, { label: `استمع: ${w.say}`, cls: "icon-btn small" }), fr(w.say), h("span", { class: "chip-ar" }, w.ar)),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
