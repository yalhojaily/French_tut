#!/usr/bin/env python3
"""
فحص محتوى الوحدات قبل النشر.

يتأكد أن:
- كل سطر حوار وكل جملة ترديد لها ترجمة كلمة بكلمة (gloss)
- أجزاء الترجمة تكوّن الجملة الفرنسية حرفاً بحرف
- معرّفات العناصر المسموعة لا تتكرر داخل الوحدة
- كل وحدة موجودة في خريطة المنهج

يُشغَّل تلقائياً في GitHub Actions قبل النشر، ويمكن تشغيله محلياً:
    python tools/check_content.py
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
errors: list[str] = []

curriculum = json.loads((ROOT / "content" / "curriculum.json").read_text(encoding="utf-8"))
known_units = {u["id"] for st in curriculum["stages"] for u in st["units"]}


def collect_ids(node, out: list[str]):
    if isinstance(node, list):
        for x in node:
            collect_ids(x, out)
    elif isinstance(node, dict):
        if "id" in node and isinstance(node.get("say"), str):
            out.append(node["id"])
        for v in node.values():
            if isinstance(v, (dict, list)):
                collect_ids(v, out)


for path in sorted((ROOT / "content" / "units").glob("*.json")):
    try:
        unit = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        errors.append(f"{path.name}: JSON غير صالح ({e})")
        continue
    uid = unit.get("id", path.stem)
    if uid != path.stem:
        errors.append(f"{path.name}: المعرّف {uid} لا يطابق اسم الملف")
    if uid not in known_units:
        errors.append(f"{uid}: غير موجودة في content/curriculum.json")

    ids: list[str] = []
    collect_ids(unit, ids)
    dupes = sorted({i for i in ids if ids.count(i) > 1})
    if dupes:
        errors.append(f"{uid}: معرّفات مكررة: {', '.join(dupes)}")

    for sec in unit.get("sections", []):
        if sec.get("type") == "dialogue":
            lines = sec.get("lines", [])
        elif sec.get("type") == "shadowing":
            lines = sec.get("items", [])
        else:
            continue
        for line in lines:
            where = f"{uid}:{line.get('id')}"
            gloss = line.get("gloss")
            if not gloss:
                errors.append(f"{where}: لا توجد ترجمة كلمة بكلمة (gloss)")
                continue
            joined = " ".join(part[0] for part in gloss)
            if joined != line["say"]:
                errors.append(f"{where}: أجزاء gloss لا تطابق الجملة\n    say:   {line['say']}\n    gloss: {joined}")

if errors:
    print("فشل فحص المحتوى:")
    for e in errors:
        print(" -", e)
    sys.exit(1)
print("المحتوى سليم.")
