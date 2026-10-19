import "./styles.css";
import { loadManifest, stop } from "./audio";
import { clear, h } from "./dom";
import { deckStats } from "./srs";
import { renderHome } from "./views/home";
import { renderReview } from "./views/review";
import { renderUnit } from "./views/unit";

const app = document.getElementById("app")!;

const reviewLink = h("a", { href: "#/review", class: "nav-review" }, "المراجعة");
const header = h(
  "div",
  { class: "topbar" },
  h("a", { href: "#/", class: "brand" },
    h("span", { class: "brand-plaque", lang: "fr", dir: "ltr" }, "Fr"),
    h("span", null, "الفرنسية من الصفر"),
  ),
  reviewLink,
);
const view = h("div", { class: "view" });
app.append(header, view);

function updateBadge() {
  const { due } = deckStats();
  reviewLink.dataset.due = due ? String(due) : "";
  reviewLink.setAttribute("aria-label", due ? `المراجعة: ${due} بطاقة مستحقة` : "المراجعة");
}

// المسارات: #/  ،  #/unit/u0-01/2  ،  #/review
function route() {
  stop();
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  clear(view);
  if (parts[0] === "unit" && parts[1]) {
    view.append(renderUnit(parts[1], Number(parts[2] ?? 0)));
  } else if (parts[0] === "review") {
    view.append(renderReview());
  } else {
    view.append(renderHome());
  }
  updateBadge();
  window.scrollTo({ top: 0 });
}

window.addEventListener("hashchange", route);
window.addEventListener("deck-changed", updateBadge);

loadManifest().then(route);
