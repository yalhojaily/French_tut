import { hasGeneratedAudio, stop } from "../audio";
import { findUnit, isReady, unitOrder, units } from "../data";
import { clear, h, richAr } from "../dom";
import { renderAccents } from "../sections/accents";
import { renderDialogue } from "../sections/dialogue";
import { renderFlashcards } from "../sections/flashcards";
import { renderLetters } from "../sections/letters";
import { renderListen } from "../sections/listen";
import { renderShadowing } from "../sections/shadowing";
import { renderSpelling } from "../sections/spelling";
import { getProgress, markSectionDone } from "../store";
import type { Section, Unit } from "../types";

const SHORT_TITLES: Record<Section["type"], string> = {
  dialogue: "الحوار",
  letters: "الحروف",
  accents: "العلامات",
  listen_choice: "الاستماع",
  spelling: "الإملاء",
  shadowing: "الترديد",
  flashcards: "البطاقات",
};

function renderSection(unit: Unit, s: Section, onDone: () => void): HTMLElement {
  switch (s.type) {
    case "dialogue": return renderDialogue(unit.id, s);
    case "letters": return renderLetters(unit.id, s);
    case "accents": return renderAccents(unit.id, s);
    case "listen_choice": return renderListen(unit.id, s, onDone);
    case "spelling": return renderSpelling(unit.id, s, onDone);
    case "shadowing": return renderShadowing(unit.id, s);
    case "flashcards": return renderFlashcards(unit.id, s, onDone);
  }
}

/** رمز الوحدة القصير: u0-01 ← 0.1 ، a1-05 ← A1.5 */
export function unitCode(id: string): string {
  const [stage, num] = id.split("-");
  const n = String(Number(num));
  return stage === "u0" ? `0.${n}` : `${stage.toUpperCase()}.${n}`;
}

export function renderUnit(unitId: string, step: number): HTMLElement {
  const unit = units[unitId];
  const meta = findUnit(unitId);
  if (!unit || !meta) {
    return h("main", { class: "unit missing" },
      h("p", null, "هذه الوحدة لم تُكتب بعد. "),
      h("a", { href: "#/" }, "ارجع إلى خريطة المنهج"),
    );
  }

  const sections = unit.sections;
  const current = Math.min(Math.max(step, 0), sections.length - 1);
  const done = new Set(getProgress(unit.id));
  const body = h("div", { class: "section-body" });

  const stepper = h(
    "ol",
    { class: "stepper", "aria-label": "أقسام الوحدة" },
    sections.map((s, i) =>
      h("li", null,
        h("a", {
          href: `#/unit/${unit.id}/${i}`,
          class: `${i === current ? "current" : ""} ${done.has(s.key) ? "done" : ""}`,
          "aria-current": i === current ? "step" : undefined,
        },
        h("span", { class: "step-num" }, String(i + 1)),
        h("span", { class: "step-label" }, SHORT_TITLES[s.type])),
      ),
    ),
  );

  const s = sections[current];
  const markDone = () => markSectionDone(unit.id, s.key);

  clear(body);
  body.append(h("h2", { class: "section-title" }, s.title_ar), renderSection(unit, s, markDone));

  // الوحدة التالية الجاهزة (لزر النهاية)
  const idx = unitOrder.findIndex((u) => u.unit.id === unit.id);
  const nextUnit = unitOrder.slice(idx + 1).find((u) => isReady(u.unit.id));

  const prevLink = current > 0 ? h("a", { class: "btn ghost", href: `#/unit/${unit.id}/${current - 1}` }, "السابق") : h("span");
  const nextLink =
    current < sections.length - 1
      ? h("a", { class: "btn primary", href: `#/unit/${unit.id}/${current + 1}` }, `التالي: ${SHORT_TITLES[sections[current + 1].type]}`)
      : h("a", { class: "btn primary", href: nextUnit ? `#/unit/${nextUnit.unit.id}` : "#/" }, nextUnit ? "أنهيت الوحدة، إلى التالية" : "أنهيت الوحدة");
  nextLink.addEventListener("click", () => {
    stop();
    markDone();
  });

  const audioNote = hasGeneratedAudio(unit.id)
    ? null
    : h("p", { class: "audio-note" },
        richAr("الصوت الآن من **صوت المتصفح** كبديل مؤقت. ولّد صوت ElevenLabs بالأمر: "),
        h("code", { dir: "ltr" }, `python tools/generate_audio.py build --unit ${unit.id}`),
      );

  const intro = current === 0
    ? h("div", { class: "unit-intro" },
        unit.intro_ar.map((p) => h("p", null, richAr(p))),
        h("div", { class: "goals" },
          h("h3", null, "في نهاية الوحدة:"),
          h("ul", null, unit.goals_ar.map((g) => h("li", null, richAr(g)))),
        ),
      )
    : null;

  return h(
    "main",
    { class: "unit" },
    h("nav", { class: "crumbs" }, h("a", { href: `#/` }, "خريطة المنهج"), " / ", meta.stage.name_ar),
    h(
      "header",
      { class: "unit-head" },
      h("span", { class: "plaque plaque-code", lang: "fr", dir: "ltr" }, unitCode(unit.id)),
      h("div", null,
        h("h1", { class: "unit-fr", lang: "fr", dir: "ltr" }, unit.title_fr),
        h("p", { class: "unit-ar" }, unit.title_ar),
      ),
    ),
    audioNote,
    intro,
    stepper,
    body,
    h("div", { class: "pager" }, prevLink, nextLink),
  );
}
