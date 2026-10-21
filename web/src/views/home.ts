import { curriculum, isReady, unitOrder, units } from "../data";
import { fr, h } from "../dom";
import { artUrl, sceneOf, stageStyle } from "../scenes";
import { deckStats } from "../srs";
import { unitCompletion } from "../store";
import type { CurriculumUnit } from "../types";
import { unitCode } from "./unit";

function completionOf(unitId: string): number {
  const u = units[unitId];
  return u ? unitCompletion(unitId, u.sections.length) : 0;
}

/** أول وحدة جاهزة لم تُكمل بعد */
function nextUnitId(): string | null {
  const ready = unitOrder.filter(({ unit }) => isReady(unit.id));
  const next = ready.find(({ unit }) => completionOf(unit.id) < 1) ?? ready[ready.length - 1];
  return next?.unit.id ?? null;
}

function postcard(u: CurriculumUnit, isNext: boolean): HTMLElement {
  const ready = isReady(u.id);
  const pct = completionOf(u.id);
  const state = pct >= 1 ? "done" : ready ? "ready" : "soon";
  const body = [
    h("span", { class: "stamp", lang: "fr", dir: "ltr", "aria-hidden": "true" }, unitCode(u.id)),
    pct >= 1 ? h("span", { class: "postmark", "aria-label": "أنجزتها" }, "✓") : null,
    h("span", { class: "pc-ar" }, u.title_ar),
    fr(u.title_fr, "fr pc-fr"),
    h("span", { class: "pc-cando" }, u.can_do_ar),
    h("span", { class: "pc-foot" },
      state === "soon" ? h("span", { class: "pc-tag" }, "قريباً") : null,
      state === "ready" && pct > 0 ? h("span", { class: "pc-meter", style: `--p:${pct}` }, h("span", null, `${Math.round(pct * 100)}٪`)) : null,
      isNext ? h("span", { class: "pc-tag now" }, pct > 0 ? "أنت هنا" : "ابدأ هنا") : null,
    ),
  ];
  return h(
    "li",
    { class: `postcard ${state}${isNext ? " is-next" : ""}`, id: `st-${u.id}` },
    ready ? h("a", { class: "pc-body", href: `#/unit/${u.id}`, "aria-label": `${unitCode(u.id)}: ${u.title_ar}` }, body) : h("div", { class: "pc-body" }, body),
  );
}

export function renderHome(): HTMLElement {
  const next = nextUnitId();
  const stats = deckStats();
  const totalUnits = unitOrder.length;
  const readyCount = unitOrder.filter(({ unit }) => isReady(unit.id)).length;
  const nextMeta = next ? unitOrder.find(({ unit }) => unit.id === next) : null;

  const hero = h(
    "header",
    { class: "hero" },
    h("img", { class: "hero-art", src: artUrl("hero"), alt: "لوحة مائية لضفاف السين في الخريف: البرج، وجسر حجري، وباعة الكتب", width: "1915", height: "822" }),
    h(
      "div",
      { class: "hero-title" },
      h("p", { class: "hero-fr", lang: "fr", dir: "ltr" }, "Le français, de zéro à B2"),
      h("h1", null, curriculum.title_ar),
    ),
    h(
      "div",
      { class: "hero-below" },
      h("p", { class: "hero-lede" },
        `${totalUnits} وحدة، كل مرحلة منها مكان في باريس. في كل وحدة حوار تسمعه، ونطق تتدرّب عليه، وتمارين، وبطاقات للمراجعة.`),
      h(
        "div",
        { class: "hero-actions" },
        next && nextMeta
          ? h("a", { class: "btn primary big", href: `#/unit/${next}` },
              completionOf(next) > 0 ? `تابع ${unitCode(next)}: ${nextMeta.unit.title_ar}` : "ابدأ الوحدة الأولى")
          : null,
        stats.total
          ? h("a", { class: "btn ghost big", href: "#/review" }, stats.due ? `راجع ${stats.due} بطاقة` : "لا مراجعة الآن")
          : null,
      ),
    ),
  );

  const chapters = curriculum.stages.map((stage, i) => {
    const scene = sceneOf(stage.id);
    const hasReady = stage.units.some((u) => isReady(u.id));
    const done = stage.units.filter((u) => completionOf(u.id) >= 1).length;
    const readyHere = stage.units.filter((u) => isReady(u.id)).length;
    const meta = [
      `${stage.units.length} وحدة`,
      `${stage.hours} ساعة تقريباً`,
      readyHere && readyHere < stage.units.length ? `الجاهز ${readyHere}` : null,
      done ? `أنجزت ${done}` : null,
    ].filter(Boolean).join("، ");

    const cards = h("ol", { class: "postcards" }, stage.units.map((u) => postcard(u, u.id === next)));
    const head = h(
      "div",
      { class: "chapter-head" },
      h("span", { class: "level", lang: "fr", dir: "ltr" }, stage.id === "0" ? "0" : stage.cefr),
      h("div", null,
        h("h2", null, stage.name_ar),
        h("p", { class: "chapter-fr", lang: "fr", dir: "ltr" }, stage.name_fr),
      ),
    );

    return h(
      "section",
      { class: `chapter${i % 2 ? " flip" : ""}${hasReady ? "" : " later"}`, style: stageStyle(stage.id), "aria-label": stage.name_ar },
      h(
        "figure",
        { class: "chapter-art" },
        h("img", { src: artUrl(scene.img), alt: `لوحة مائية: ${scene.place_ar}`, loading: "lazy", width: "1000", height: "750" }),
        h("figcaption", { lang: "fr", dir: "ltr" }, scene.place_fr),
      ),
      h(
        "div",
        { class: "chapter-body" },
        head,
        h("p", { class: "chapter-desc" }, stage.description_ar),
        h("p", { class: "chapter-meta" }, meta),
        hasReady
          ? cards
          : h("details", { class: "later-list" }, h("summary", null, "اعرض وحدات هذه المرحلة"), cards),
      ),
    );
  });

  return h(
    "main",
    { class: "home" },
    hero,
    h("p", { class: "home-note" }, `${readyCount} من ${totalUnits} وحدة جاهزة الآن. ${curriculum.note_ar}`),
    chapters,
  );
}
