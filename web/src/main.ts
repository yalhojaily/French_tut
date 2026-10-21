import "@fontsource/readex-pro/400.css";
import "@fontsource/readex-pro/500.css";
import "@fontsource/readex-pro/600.css";
import "@fontsource/el-messiri/600.css";
import "@fontsource/el-messiri/700.css";
import "@fontsource/literata/400.css";
import "@fontsource/literata/400-italic.css";
import "@fontsource/literata/600.css";
import "@fontsource/caveat/500.css";
import "@fontsource/caveat/700.css";
import "./styles.css";
import { getSource, loadManifest, setSource, stop } from "./audio";
import { clear, h } from "./dom";
import { deckStats } from "./srs";
import { renderHome } from "./views/home";
import { renderReview } from "./views/review";
import { renderUnit } from "./views/unit";

const app = document.getElementById("app")!;

const reviewLink = h("a", { href: "#/review", class: "nav-review" }, "المراجعة");
const sourceBtn = h("button", { type: "button", class: "source-btn" }) as HTMLButtonElement;
const renderSource = () => {
  const browser = getSource() === "browser";
  sourceBtn.textContent = browser ? "الصوت: المتصفح" : "الصوت: ElevenLabs";
  sourceBtn.title = browser ? "اضغط لاستخدام ملفات ElevenLabs" : "اضغط لاستخدام صوت المتصفح الفرنسي";
  sourceBtn.setAttribute("aria-pressed", String(browser));
};
sourceBtn.addEventListener("click", () => {
  stop();
  setSource(getSource() === "browser" ? "generated" : "browser");
  renderSource();
});
renderSource();
const header = h(
  "div",
  { class: "topbar" },
  h("a", { href: "#/", class: "brand" },
    h("span", { class: "brand-mark", lang: "fr", dir: "ltr", "aria-hidden": "true" }, "Fr"),
    h("span", null, "الفرنسية من الصفر"),
  ),
  h("div", { class: "topbar-actions" }, sourceBtn, reviewLink),
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
