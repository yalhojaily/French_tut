#!/usr/bin/env python3
"""
توليد الصوت لدروس الفرنسية عبر ElevenLabs.

يمرّ السكربت على ملفات الوحدات في content/units/*.json، ويجمع كل عنصر
فيه حقلا "id" و "say"، ثم يولّد له ملف mp3 مع توقيت كل حرف
(لتظليل الكلمات أثناء التشغيل)، ويكتب فهرساً في web/public/audio/manifest.json.

لا يُستدعى الـ API إلا للعناصر الجديدة أو التي تغيّر نصها، لأن اسم الملف
مبني على بصمة (النص + الصوت + النموذج + السرعة). إعادة التشغيل مجانية.

الاستخدام:
    python tools/generate_audio.py voices --premade       # الأصوات المتاحة في الخطة المجانية
    python tools/generate_audio.py sample VOICE_ID        # جملة تجريبية لتسمع الصوت
    python tools/generate_audio.py build --dry-run        # كم عنصراً وكم حرفاً ستُرسل
    python tools/generate_audio.py build                  # توليد كل الوحدات
    python tools/generate_audio.py build --unit u0-01     # وحدة واحدة
    python tools/generate_audio.py build --prune          # حذف الملفات التي لم تعد مستخدمة

المفتاح يُقرأ من متغير البيئة ELEVENLABS_API_KEY أو من ملف .env في جذر المشروع.
لا يحتاج أي مكتبة خارجية.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UNITS_DIR = ROOT / "content" / "units"
VOICES_FILE = ROOT / "content" / "voices.json"
AUDIO_DIR = ROOT / "web" / "public" / "audio"
MANIFEST_FILE = AUDIO_DIR / "manifest.json"
API_BASE = "https://api.elevenlabs.io/v1"


# ---------------------------------------------------------------- الإعدادات

def load_api_key() -> str:
    key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    env_file = ROOT / ".env"
    if not key and env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("ELEVENLABS_API_KEY="):
                key = line.split("=", 1)[1].strip().strip('"').strip("'")
    if not key:
        sys.exit("لم أجد ELEVENLABS_API_KEY. انسخ .env.example إلى .env وضع مفتاحك فيه.")
    return key


def load_config() -> dict:
    return json.loads(VOICES_FILE.read_text(encoding="utf-8"))


# ---------------------------------------------------------------- جمع العناصر

@dataclass
class Item:
    key: str          # u0-01:d1 أو u0-01:d1@slow
    text: str
    voice: str        # اسم الصوت المنطقي (female/male/narrator)
    speed: float


def collect_items(unit: dict, cfg: dict) -> list[Item]:
    """يجمع كل كائن فيه id و say من ملف الوحدة، مع تحديد الصوت والسرعة."""
    unit_id = unit["id"]
    default_voice = cfg.get("default_voice", "narrator")
    slow_speed = float(cfg.get("slow_speed", 0.75))
    items: list[Item] = []
    seen: set[str] = set()

    def visit(node, inherited_voice: str, speakers: dict | None):
        if isinstance(node, list):
            for child in node:
                visit(child, inherited_voice, speakers)
            return
        if not isinstance(node, dict):
            return

        # المتحدثون في الحوار يحددون الصوت لكل سطر
        local_speakers = node.get("speakers", speakers)
        voice = node.get("voice", inherited_voice)
        if local_speakers and "speaker" in node:
            voice = local_speakers[node["speaker"]].get("voice", voice)

        if "id" in node and isinstance(node.get("say"), str):
            key = f"{unit_id}:{node['id']}"
            if key in seen:
                sys.exit(f"معرّف مكرر في {unit_id}: {node['id']}")
            seen.add(key)
            items.append(Item(key, node["say"], voice, 1.0))
            if node.get("slow"):
                items.append(Item(key + "@slow", node["say"], voice, slow_speed))

        for value in node.values():
            if isinstance(value, (dict, list)):
                visit(value, voice, local_speakers)

    visit(unit, default_voice, None)
    return items


def fingerprint(item: Item, voice_id: str, cfg: dict) -> str:
    raw = "|".join([item.text, voice_id, cfg["model_id"], f"{item.speed:.2f}",
                    json.dumps(cfg.get("voice_settings", {}), sort_keys=True)])
    # اللغة والسياق جزء من البصمة: تغييرهما يعيد التوليد
    extra = [cfg.get("language_code") or "", context_for(item.text, cfg)]
    if any(extra):
        raw += "|" + "|".join(extra)
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:16]


# ---------------------------------------------------------------- الـ API

def api_request(method: str, path: str, api_key: str, body: dict | None = None,
                query: str = "", retries: int = 4) -> dict:
    url = f"{API_BASE}{path}{query}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    for attempt in range(retries + 1):
        req = urllib.request.Request(url, data=data, method=method, headers={
            "xi-api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        })
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", errors="replace")[:500]
            if e.code in (429, 500, 502, 503) and attempt < retries:
                wait = 2 ** attempt * 2
                print(f"  ↻ {e.code}، إعادة المحاولة بعد {wait} ثانية…")
                time.sleep(wait)
                continue
            sys.exit(f"خطأ من ElevenLabs ({e.code}): {detail}")
        except urllib.error.URLError as e:
            if attempt < retries:
                time.sleep(2 ** attempt)
                continue
            sys.exit(f"تعذّر الاتصال بـ ElevenLabs: {e.reason}")
    raise RuntimeError("unreachable")


def context_for(text: str, cfg: dict) -> str:
    """نص قصير جداً (حرف أو كلمة) يُسبق بسياق فرنسي غير منطوق حتى لا يُقرأ بالإنجليزية."""
    ctx = cfg.get("short_text_context") or ""
    limit = int(cfg.get("short_text_max_chars", 12))
    return ctx if ctx and len(text) <= limit else ""


def synthesize(item: Item, voice_id: str, cfg: dict, api_key: str) -> tuple[bytes, dict]:
    settings = dict(cfg.get("voice_settings", {}))
    settings["speed"] = item.speed
    body = {"text": item.text, "model_id": cfg["model_id"], "voice_settings": settings}
    # فرض اللغة الفرنسية (لا يدعمه نموذج multilingual_v2)
    if cfg.get("language_code") and "multilingual_v2" not in cfg["model_id"]:
        body["language_code"] = cfg["language_code"]
    ctx = context_for(item.text, cfg)
    if ctx:
        body["previous_text"] = ctx
    resp = api_request("POST", f"/text-to-speech/{voice_id}/with-timestamps", api_key,
                       body, query=f"?output_format={cfg.get('output_format', 'mp3_44100_128')}")
    audio = base64.b64decode(resp["audio_base64"])
    al = resp.get("alignment") or {}
    alignment = {
        "chars": al.get("characters", []),
        "start": [round(t, 3) for t in al.get("character_start_times_seconds", [])],
        "end": [round(t, 3) for t in al.get("character_end_times_seconds", [])],
    }
    return audio, alignment


# ---------------------------------------------------------------- الأوامر

def cmd_voices(args):
    api_key = load_api_key()
    voices = api_request("GET", "/voices", api_key).get("voices", [])
    if args.premade:
        voices = [v for v in voices if v.get("category") == "premade"]
    # الأصوات الجاهزة (premade) أولاً: هي المتاحة عبر الـ API في الخطة المجانية
    voices.sort(key=lambda v: (v.get("category") != "premade", v.get("name", "")))
    print(f"{'الاسم':22} {'النوع':12} {'voice_id':24} الوصف")
    for v in voices:
        labels = v.get("labels") or {}
        desc = ", ".join(str(val) for val in labels.values())
        print(f"{v.get('name', '')[:22]:22} {v.get('category', ''):12} {v.get('voice_id', ''):24} {desc}")
    print("\nفي الخطة المجانية: استخدم أصوات النوع premade. نموذج eleven_multilingual_v2 يجعلها تنطق الفرنسية."
          "\nجرّب صوتاً قبل اعتماده:  python tools/generate_audio.py sample VOICE_ID")


def cmd_sample(args):
    """يولّد جملة تجريبية بصوت واحد لتسمعه قبل اعتماده (نحو 90 حرفاً)."""
    cfg = load_config()
    api_key = load_api_key()
    if args.model:
        cfg["model_id"] = args.model
    item = Item("sample", args.text, "sample", 1.0)
    audio, _ = synthesize(item, args.voice_id, cfg, api_key)
    out = ROOT / f"sample_{args.voice_id[:8]}_{cfg['model_id']}.mp3"
    out.write_bytes(audio)
    print(f"احفظ واستمع: {out.name}  ({len(args.text)} حرفاً)")


def cmd_build(args):
    cfg = load_config()
    unit_files = sorted(UNITS_DIR.glob("*.json"))
    if args.unit:
        unit_files = [f for f in unit_files if f.stem == args.unit]
        if not unit_files:
            sys.exit(f"لا توجد وحدة باسم {args.unit}")

    manifest: dict = {}
    if MANIFEST_FILE.exists():
        manifest = json.loads(MANIFEST_FILE.read_text(encoding="utf-8"))

    plan: list[tuple[Item, str, str]] = []   # (item, voice_id, relative file)
    for uf in unit_files:
        unit = json.loads(uf.read_text(encoding="utf-8"))
        for item in collect_items(unit, cfg):
            voice_id = cfg["voices"].get(item.voice)
            if not voice_id:
                sys.exit(f"الصوت «{item.voice}» غير معرّف في voices.json")
            rel = f"{unit['id']}/{fingerprint(item, voice_id, cfg)}.mp3"
            plan.append((item, voice_id, rel))

    todo = [p for p in plan if args.force or not (AUDIO_DIR / p[2]).exists()
            or p[0].key not in manifest]
    # الملف موجود والعنصر في الفهرس بنفس الملف ← لا شيء نفعله
    todo = [p for p in todo if args.force or manifest.get(p[0].key, {}).get("file") != p[2]
            or not (AUDIO_DIR / p[2]).exists()]
    # العناصر المتطابقة تتشارك ملفاً واحداً، فلا تُحسب مرتين
    chars = sum(len(p[0].text) for p in {p[2]: p for p in todo}.values())

    print(f"العناصر: {len(plan)} | تحتاج توليداً: {len(todo)} | عدد الحروف المرسلة: {chars}")
    if args.dry_run:
        for item, _, rel in todo:
            print(f"  · {item.key:24} [{item.voice}, {item.speed}] {item.text}")
        return

    placeholders = [v for v in cfg["voices"].values() if v.startswith("REPLACE")]
    if todo and placeholders:
        sys.exit("ضع معرّفات الأصوات الحقيقية في content/voices.json أولاً "
                 "(شغّل: python tools/generate_audio.py voices)")

    api_key = load_api_key() if todo else ""
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)

    # العناصر المتطابقة تتشارك نفس الملف: نولّد كل ملف مرة واحدة فقط
    generated: dict[str, dict] = {}
    for i, (item, voice_id, rel) in enumerate(todo, 1):
        path = AUDIO_DIR / rel
        if rel in generated:
            alignment = generated[rel]
        elif path.exists() and not args.force and path.with_suffix(".json").exists():
            alignment = json.loads(path.with_suffix(".json").read_text(encoding="utf-8"))
        else:
            print(f"[{i}/{len(todo)}] {item.key}: {item.text}")
            audio, alignment = synthesize(item, voice_id, cfg, api_key)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(audio)
            path.with_suffix(".json").write_text(json.dumps(alignment, ensure_ascii=False),
                                                 encoding="utf-8")
        generated[rel] = alignment
        manifest[item.key] = {"file": rel, "text": item.text, "alignment": alignment}
        MANIFEST_FILE.write_text(json.dumps(manifest, ensure_ascii=False, indent=0),
                                 encoding="utf-8")   # حفظ تدريجي: لا نخسر شيئاً عند الانقطاع

    # إزالة مفاتيح الفهرس لعناصر حُذفت من المحتوى (للوحدات التي عالجناها)
    processed_units = {json.loads(f.read_text(encoding="utf-8"))["id"] for f in unit_files}
    valid_keys = {p[0].key for p in plan}
    for key in list(manifest):
        if key.split(":")[0] in processed_units and key not in valid_keys:
            del manifest[key]
    MANIFEST_FILE.write_text(json.dumps(manifest, ensure_ascii=False, indent=0), encoding="utf-8")

    if args.prune:
        used = {v["file"] for v in manifest.values()}
        removed = 0
        for mp3 in AUDIO_DIR.rglob("*.mp3"):
            rel = mp3.relative_to(AUDIO_DIR).as_posix()
            if rel not in used:
                mp3.unlink()
                mp3.with_suffix(".json").unlink(missing_ok=True)
                removed += 1
        print(f"حُذف {removed} ملفاً غير مستخدم.")

    print("تم. الفهرس:", MANIFEST_FILE.relative_to(ROOT))


def main():
    parser = argparse.ArgumentParser(description="توليد صوت الدروس عبر ElevenLabs")
    sub = parser.add_subparsers(dest="cmd", required=True)
    v = sub.add_parser("voices", help="عرض الأصوات في حسابك")
    v.add_argument("--premade", action="store_true", help="الأصوات الجاهزة فقط (المتاحة في الخطة المجانية)")
    v.set_defaults(func=cmd_voices)
    sm = sub.add_parser("sample", help="جملة تجريبية بصوت واحد قبل اعتماده")
    sm.add_argument("voice_id")
    sm.add_argument("--text", default="a, bé, cé, dé, e, effe, gé, hache, i, ji, u, i grec. Bonjour, je m'appelle Youssef.")
    sm.add_argument("--model", help="جرّب نموذجاً آخر دون تغيير voices.json")
    sm.set_defaults(func=cmd_sample)
    b = sub.add_parser("build", help="توليد الصوت للوحدات")
    b.add_argument("--unit", help="معرّف وحدة واحدة، مثل u0-01")
    b.add_argument("--dry-run", action="store_true", help="اعرض ما سيُولّد دون استدعاء الـ API")
    b.add_argument("--force", action="store_true", help="أعد توليد كل شيء")
    b.add_argument("--prune", action="store_true", help="احذف الملفات غير المستخدمة")
    b.set_defaults(func=cmd_build)
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
