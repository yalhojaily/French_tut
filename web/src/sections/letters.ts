import { play, stop } from "../audio";
import { clear, fr, h, icon, richAr } from "../dom";
import type { LetterItem, LettersSection } from "../types";
import { speakButton } from "./speak";

export function renderLetters(unitId: string, s: LettersSection): HTMLElement {
  const detail = h("div", { class: "letter-detail", "aria-live": "polite" });
  const tiles = new Map<string, HTMLButtonElement>();
  let runningAll = false;
  const playAllLabel = s.play_all_ar ?? "استمع للأبجدية كاملة";

  const select = (item: LetterItem, speak = true) => {
    tiles.forEach((t) => t.setAttribute("aria-pressed", "false"));
    tiles.get(item.id)?.setAttribute("aria-pressed", "true");
    clear(detail);
    detail.append(
      h(
        "div",
        { class: "detail-head" },
        h("span", { class: "plaque plaque-sm", lang: "fr", dir: "ltr" }, item.letter, item.letter !== item.letter.toLowerCase() ? h("small", null, item.letter.toLowerCase()) : null),
        h(
          "div",
          { class: "detail-name" },
          h("div", { class: "detail-say" }, fr(item.say, "fr detail-fr"), speakButton(unitId, item)),
          h("div", { class: "detail-meta" }, h("span", { class: "ar-hint" }, item.ar_hint), " ", h("span", { class: "ipa", dir: "ltr" }, `/${item.ipa}/`)),
        ),
      ),
      h(
        "div",
        { class: "detail-example" },
        speakButton(unitId, item.example, { label: `استمع: ${item.example.say}` }),
        fr(item.example.say, "fr example-fr"),
        h("span", { class: "example-ar" }, item.example.ar),
      ),
    );
    if (item.note_ar) detail.append(h("p", { class: "detail-note" }, richAr(item.note_ar)));
    if (speak) void play(unitId, item);
  };

  const grid = h(
    "div",
    { class: "letter-grid", role: "group", "aria-label": "الحروف" },
    s.items.map((item) => {
      const tile = h(
        "button",
        { type: "button", class: `plaque${item.tricky ? " tricky" : ""}`, lang: "fr", "aria-pressed": "false", "aria-label": `${item.letter}: ${item.ar_hint}` },
        h("span", { class: `plaque-letter${item.letter.length > 1 ? " multi" : ""}${item.letter.length > 3 ? " long" : ""}`, dir: "ltr" }, item.letter),
        h("span", { class: "plaque-hint", lang: "ar", dir: "rtl" }, item.ar_hint),
      );
      tile.addEventListener("click", () => select(item));
      tiles.set(item.id, tile);
      return tile;
    }),
  );

  const allBtn = h("button", { type: "button", class: "btn primary", html: `${icon.play}<span>${playAllLabel}</span>` });
  allBtn.addEventListener("click", async () => {
    if (runningAll) {
      runningAll = false;
      stop();
      return;
    }
    runningAll = true;
    allBtn.innerHTML = `${icon.stop}<span>إيقاف</span>`;
    for (const item of s.items) {
      if (!runningAll) break;
      select(item, false);
      await play(unitId, item);
      await new Promise((r) => setTimeout(r, 250));
    }
    runningAll = false;
    allBtn.innerHTML = `${icon.play}<span>${playAllLabel}</span>`;
  });

  select(s.items[0], false);

  return h(
    "div",
    { class: "section-letters" },
    h("p", { class: "lede" }, richAr(s.hint_ar)),
    h("div", { class: "toolbar" }, allBtn, h("span", { class: "legend" }, h("i", { class: "dot" }), "صعب على المتعلم العربي")),
    h("div", { class: "letters-layout" }, detail, grid),
  );
}
