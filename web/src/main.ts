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
// الوضع الليلي: يتبع إعداد الجهاز ما لم يختر المستخدم بنفسه، ويُحفظ اختياره
const MOON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1z"/></svg>';
const SUN = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="currentColor"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></g></svg>';
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
const savedTheme = (): string | null => {
  try { return localStorage.getItem("theme"); } catch { return null; }
};
const isDark = () => {
  const t = document.documentElement.dataset.theme;
  return t ? t === "dark" : darkQuery.matches;
};
const themeBtn = h("button", { type: "button", class: "theme-btn" }) as HTMLButtonElement;
const renderTheme = () => {
  const dark = isDark();
  themeBtn.innerHTML = dark ? SUN : MOON;
  const label = dark ? "الوضع النهاري" : "الوضع الليلي";
  themeBtn.title = label;
  themeBtn.setAttribute("aria-label", label);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#1b1517" : "#fffaf4");
};
themeBtn.addEventListener("click", () => {
  const next = isDark() ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem("theme", next); } catch { /* المتصفح يمنع التخزين: يبقى الاختيار لهذه الجلسة */ }
  renderTheme();
});
darkQuery.addEventListener("change", () => { if (!savedTheme()) renderTheme(); });
renderTheme();

const header = h(
  "div",
  { class: "topbar" },
  h("a", { href: "#/", class: "brand" },
    h("span", { class: "brand-mark", lang: "fr", dir: "ltr", "aria-hidden": "true" }, "Fr"),
    h("span", null, "الفرنسية من الصفر"),
  ),
  h("div", { class: "topbar-actions" }, themeBtn, sourceBtn, reviewLink),
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
