import { curriculum, isReady, unitOrder, units } from "../data";
import { fr, h } from "../dom";
import { deckStats } from "../srs";
import { unitCompletion } from "../store";

// لون «خط المترو» لكل مرحلة
const LINE_COLORS: Record<string, string> = {
  "0": "var(--line-0)",
  A1: "var(--line-a1)",
  A2: "var(--line-a2)",
  B1: "var(--line-b1)",
  B2: "var(--line-b2)",
};

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

export function renderHome(): HTMLElement {
  const next = nextUnitId();
  const stats = deckStats();
  const totalUnits = unitOrder.length;
  const readyCount = unitOrder.filter(({ unit }) => isReady(unit.id)).length;

  const hero = h(
    "header",
    { class: "hero" },
    h(
      "div",
      { class: "hero-plaque", lang: "fr", dir: "ltr", "aria-label": curriculum.title_fr },
      h("span", { class: "hero-plaque-top" }, "de zéro à B2"),
      h("span", { class: "hero-plaque-main" }, "Le français"),
    ),
    h("h1", null, curriculum.title_ar),
    h(
      "p",
      { class: "hero-lede" },
      `${totalUnits} وحدة على خمس مراحل، من أسماء الحروف حتى مستوى B2. كل وحدة: حوار تسمعه، ونطق تتدرّب عليه، وتمارين، وبطاقات تدخل المراجعة المتباعدة.`,
    ),
    h(
      "div",
      { class: "hero-actions" },
      next
        ? h("a", { class: "btn primary big", href: `#/unit/${next}` }, completionOf(next) > 0 ? "تابع الوحدة الحالية" : "ابدأ الوحدة الأولى")
        : null,
      stats.total
        ? h("a", { class: "btn ghost big", href: "#/review" }, stats.due ? `راجع ${stats.due} بطاقة` : "لا مراجعة الآن")
        : null,
    ),
  );

  const stages = curriculum.stages.map((stage) => {
    const hasReady = stage.units.some((u) => isReady(u.id));
    const done = stage.units.filter((u) => completionOf(u.id) >= 1).length;
    return h(
      "details",
      { class: "stage", open: hasReady, style: `--line:${LINE_COLORS[stage.id] ?? "var(--blue)"}` },
      h(
        "summary",
        null,
        h("span", { class: "line-badge", lang: "fr", dir: "ltr" }, stage.id === "0" ? "0" : stage.cefr),
        h(
          "span",
          { class: "stage-title" },
          h("span", { class: "stage-name" }, stage.name_ar),
          h("span", { class: "stage-meta" }, `${stage.units.length} وحدة، ${stage.hours} ساعة تقريباً${done ? `، أنجزت ${done}` : ""}`),
        ),
      ),
      h("p", { class: "stage-desc" }, stage.description_ar),
      h(
        "ol",
        { class: "stations" },
        stage.units.map((u) => {
          const ready = isReady(u.id);
          const pct = completionOf(u.id);
          const state = pct >= 1 ? "done" : ready ? "ready" : "soon";
          const body = [
            h("span", { class: "station-titles" },
              h("span", { class: "station-ar" }, u.title_ar),
              fr(u.title_fr, "fr station-fr"),
            ),
            h("span", { class: "station-cando" }, u.can_do_ar),
            h("span", { class: "station-grammar", lang: "fr", dir: "ltr" }, u.grammar.join(" / ")),
            state === "soon" ? h("span", { class: "station-tag" }, "قريباً") : null,
            state === "ready" && pct > 0 ? h("span", { class: "station-tag live" }, `${Math.round(pct * 100)}٪`) : null,
          ];
          return h(
            "li",
            { class: `station ${state}`, id: `st-${u.id}` },
            h("span", { class: "stop", "aria-hidden": "true" }),
            ready ? h("a", { class: "station-body", href: `#/unit/${u.id}` }, body) : h("div", { class: "station-body" }, body),
          );
        }),
      ),
    );
  });

  return h(
    "main",
    { class: "home" },
    hero,
    h(
      "section",
      { class: "map", "aria-labelledby": "map-title" },
      h("div", { class: "map-head" },
        h("h2", { id: "map-title" }, "خريطة المنهج"),
        h("p", null, `${readyCount} من ${totalUnits} وحدة جاهزة الآن. ${curriculum.note_ar}`),
      ),
      stages,
    ),
  );
}
