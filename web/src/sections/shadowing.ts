import { play } from "../audio";
import { h, icon, richAr } from "../dom";
import type { ShadowingSection } from "../types";
import { glossedText, karaokeText, speakButton } from "./speak";

/** مسجّل صغير: تسجيل، إيقاف، تشغيل، ومقارنة مع النموذج */
function recorder(onCompare?: () => Promise<void>) {
  let media: MediaRecorder | null = null;
  let url: string | null = null;
  const status = h("span", { class: "rec-status", "aria-live": "polite" });

  const recBtn = h("button", { type: "button", class: "btn rec", html: `${icon.mic}<span>سجّل صوتك</span>` });
  const mineBtn = h("button", { type: "button", class: "btn ghost", disabled: true, html: `${icon.replay}<span>صوتي</span>` });
  const cmpBtn = onCompare ? h("button", { type: "button", class: "btn ghost", disabled: true }, "قارن: النموذج ثم صوتي") : null;

  const playMine = () =>
    new Promise<void>((resolve) => {
      if (!url) return resolve();
      const a = new Audio(url);
      a.onended = () => resolve();
      a.onerror = () => resolve();
      void a.play();
    });

  recBtn.addEventListener("click", async () => {
    if (media && media.state === "recording") {
      media.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      status.textContent = "متصفحك لا يدعم التسجيل.";
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      media = new MediaRecorder(stream);
      media.ondataavailable = (e) => chunks.push(e.data);
      media.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (url) URL.revokeObjectURL(url);
        url = URL.createObjectURL(new Blob(chunks, { type: media?.mimeType || "audio/webm" }));
        recBtn.classList.remove("recording");
        recBtn.innerHTML = `${icon.mic}<span>سجّل مجدداً</span>`;
        mineBtn.removeAttribute("disabled");
        cmpBtn?.removeAttribute("disabled");
        status.textContent = "";
      };
      media.start();
      recBtn.classList.add("recording");
      recBtn.innerHTML = `${icon.stop}<span>إيقاف</span>`;
      status.textContent = "يسجّل الآن…";
    } catch {
      status.textContent = "لم يُسمح بالوصول إلى الميكروفون. فعّله من إعدادات المتصفح.";
    }
  });

  mineBtn.addEventListener("click", () => void playMine());
  cmpBtn?.addEventListener("click", async () => {
    await onCompare!();
    await new Promise((r) => setTimeout(r, 300));
    await playMine();
  });

  return h("div", { class: "recorder" }, recBtn, mineBtn, cmpBtn, status);
}

export function renderShadowing(unitId: string, s: ShadowingSection): HTMLElement {
  const items = s.items.map((item) => {
    const text = item.gloss ? glossedText(item.say, item.gloss) : { ...karaokeText(item.say), reset: () => {} };
    const play1 = (slow: boolean) => {
      const b = speakButton(unitId, item, { slow, onChar: text.onChar });
      b.addEventListener("click", text.reset);
      return b;
    };
    return h(
      "li",
      { class: "shadow-item" },
      h("p", { class: "shadow-fr" }, text.el),
      h("p", { class: "shadow-ar" }, item.ar),
      h(
        "div",
        { class: "shadow-controls" },
        play1(false),
        item.slow ? play1(true) : null,
        recorder(() => { text.reset(); return play(unitId, item, { onChar: text.onChar }); }),
      ),
    );
  });

  return h(
    "div",
    { class: "section-shadowing" },
    h("p", { class: "lede" }, s.hint_ar),
    s.items.some((i) => i.gloss) ? h("p", { class: "hint" }, "معنى كل كلمة يظهر فوقها لحظة نطقها، ويمكنك الضغط على أي كلمة لترى معناها.") : null,
    h("ol", { class: "shadow-list" }, items),
    s.task_ar
      ? h("aside", { class: "tip task" }, h("p", null, richAr(s.task_ar)), recorder())
      : null,
    h("p", { class: "hint" }, "التسجيلات تبقى في متصفحك فقط ولا تُرفع إلى أي مكان."),
  );
}
