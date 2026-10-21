// مساعد صغير لبناء عناصر الصفحة دون إطار عمل

type Child = Node | string | number | false | null | undefined | Child[];
type Attrs = Record<string, unknown> & {
  class?: string;
  on?: Partial<Record<keyof HTMLElementEventMap, (e: Event) => void>>;
};

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs | null = null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value === undefined || value === null || value === false) continue;
      if (key === "on") {
        for (const [evt, fn] of Object.entries(value as Record<string, EventListener>)) {
          el.addEventListener(evt, fn);
        }
      } else if (key === "html") {
        el.innerHTML = String(value);
      } else if (value === true) {
        el.setAttribute(key, "");
      } else {
        el.setAttribute(key, String(value));
      }
    }
  }
  append(el, children);
  return el;
}

function append(el: Node, children: Child[]) {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

/** نص فرنسي داخل صفحة عربية: اتجاه ولغة صحيحان */
export function fr(text: string, cls = "fr"): HTMLSpanElement {
  return h("span", { class: cls, lang: "fr", dir: "ltr" }, text);
}

// مقطع لاتيني متصل داخل نص عربي (كلمة فرنسية أو أكثر)
// (يشمل رموز النطق الدولية IPA وعلامتي التنصيص الفرنسيتين « »)
const L = "A-Za-zÀ-ÿœŒ\\u0250-\\u02AF\\u0300-\\u036F\\u02D0\\u203F\\[\\]";
const LATIN_RUN = new RegExp(`((?:«\\s?)?[${L}](?:[${L}'’ ,.?!…/-]*[${L}?!'’])?(?:\\s?»)?)`);

/** نص عربي فيه **خط عريض** وكلمات فرنسية: يُبنى كعناصر DOM (لا حقن HTML) */
export function richAr(text: string): HTMLSpanElement {
  const root = h("span");
  text.split(/\*\*(.+?)\*\*/).forEach((part, i) => {
    const target = i % 2 === 1 ? root.appendChild(h("strong")) : root;
    part.split(LATIN_RUN).forEach((piece, j) => {
      if (!piece) return;
      target.appendChild(j % 2 === 1 ? fr(piece, "fr-inline") : document.createTextNode(piece));
    });
  });
  return root;
}

export function clear(el: HTMLElement) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/** أيقونات بسيطة مرسومة بـ SVG */
export const icon = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>',
  mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor"/></svg>',
  replay: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12a7 7 0 1 0 2.1-5M5 4v4h4" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
};

export function iconButton(svg: string, label: string, onClick: () => void, cls = "icon-btn") {
  const b = h("button", { class: cls, type: "button", "aria-label": label, title: label, html: svg });
  b.addEventListener("click", onClick);
  return b;
}
