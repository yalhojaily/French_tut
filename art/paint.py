"""لوحات مائية لمشاهد من باريس، مرسومة بالكود.

يكتب ملفات SVG في art/svg/ ثم يحوّلها إلى صور WebP في web/public/art/
(الصور الجاهزة أخف على الهاتف من تطبيق مرشّحات SVG أثناء التصفّح).

    python3 art/paint.py            # يرسم كل المشاهد
    python3 art/paint.py hero cafe  # مشاهد محددة

يحتاج Playwright (Chromium) و ffmpeg للتحويل.
"""

from __future__ import annotations

import math
import random
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SVG_DIR = ROOT / "art" / "svg"
OUT_DIR = ROOT / "web" / "public" / "art"

INK = "#2b3a67"

# ------------------------------------------------------------------ المرشّحات


def defs() -> str:
    """مرشّحات الألوان المائية: حواف متموّجة، تفاوت في الصبغة، حافة أغمق، وورق."""
    wash = []
    for i, (freq, scale, seed) in enumerate([(0.03, 10, 3), (0.022, 14, 11), (0.045, 7, 23)]):
        wash.append(f"""
  <filter id="wc{i}" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="{freq}" numOctaves="3" seed="{seed}" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="{scale}" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="{seed + 5}" result="blot"/>
    <feColorMatrix in="blot" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.8 1.3" result="blotA"/>
    <feComposite in="d" in2="blotA" operator="in" result="tex"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="{seed + 9}" result="grain"/>
    <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.7 1.15" result="grainA"/>
    <feComposite in="tex" in2="grainA" operator="in" result="tex2"/>
    <feMorphology in="d" operator="erode" radius="1.6" result="er"/>
    <feComposite in="d" in2="er" operator="out" result="edge"/>
    <feGaussianBlur in="edge" stdDeviation="0.6" result="edgeB"/>
    <feMerge><feMergeNode in="tex2"/><feMergeNode in="edgeB"/></feMerge>
  </filter>""")
    return f"""<defs>{''.join(wash)}
  <filter id="bleed" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.008" numOctaves="3" seed="4" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="46" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feGaussianBlur in="d" stdDeviation="3" result="soft"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="17" result="blot"/>
    <feColorMatrix in="blot" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.7 1.25" result="blotA"/>
    <feComposite in="soft" in2="blotA" operator="in"/>
  </filter>
  <filter id="ink" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="2" seed="2" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <filter id="paper" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="7" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.42  0 0 0 0 0.40  0 0 0 0.10 0"/>
  </filter>
</defs>"""


def svg(w: int, h: int, body: str) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">'
        f"{defs()}"
        f'<rect width="{w}" height="{h}" fill="#fffefc"/>'
        f"{body}"
        f'<rect width="{w}" height="{h}" filter="url(#paper)"/>'
        "</svg>"
    )


def layer(content: str, f: int | str = 0, opacity: float = 0.82) -> str:
    fid = f if isinstance(f, str) else f"wc{f}"
    return f'<g filter="url(#{fid})" opacity="{opacity}">{content}</g>'


def ink(content: str, opacity: float = 0.55, width: float = 1.3) -> str:
    return (
        f'<g filter="url(#ink)" fill="none" stroke="{INK}" stroke-width="{width}" '
        f'stroke-linecap="round" stroke-linejoin="round" opacity="{opacity}">{content}</g>'
    )


def rect(x, y, w, h, fill, extra="") -> str:
    return f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" fill="{fill}" {extra}/>'


def poly(pts, fill) -> str:
    return f'<polygon points="{" ".join(f"{x:.1f},{y:.1f}" for x, y in pts)}" fill="{fill}"/>'


def blob(cx, cy, r, fill, rnd: random.Random, n=9, jitter=0.28) -> str:
    """بقعة غير منتظمة (شجرة، سحابة، زهرة)."""
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        rr = r * (1 + rnd.uniform(-jitter, jitter))
        pts.append((cx + rr * math.cos(a), cy + rr * 0.85 * math.sin(a)))
    d = f"M{pts[0][0]:.1f},{pts[0][1]:.1f} "
    for i in range(n):
        p0, p1 = pts[i], pts[(i + 1) % n]
        mx, my = (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2
        d += f"Q{p0[0]:.1f},{p0[1]:.1f} {mx:.1f},{my:.1f} "
    return f'<path d="{d}Z" fill="{fill}"/>'


def grad(id_, stops, x2=0, y2=1) -> str:
    s = "".join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops)
    return f'<defs><linearGradient id="{id_}" x1="0" y1="0" x2="{x2}" y2="{y2}">{s}</linearGradient></defs>'


# ------------------------------------------------------------------ عناصر


def sky(w, h, stops, gid="sky") -> str:
    return grad(gid, stops) + layer(rect(-40, -40, w + 80, h + 40, f"url(#{gid})"), "bleed", 0.9)


def clouds(rnd, items) -> str:
    out = ""
    for cx, cy, s in items:
        for k in range(4):
            out += blob(cx + (k - 1.5) * 34 * s, cy + rnd.uniform(-8, 8) * s, (30 + rnd.uniform(0, 16)) * s, "#ffffff", rnd)
    return layer(out, 1, 0.9)


def eiffel(cx, base, H, color, detail=True) -> str:
    """البرج: ساقان منحنيتان، قوس، منصّتان، وشبكة بالحبر."""
    W = H * 0.5
    top = base - H
    p1, p2 = base - H * 0.27, base - H * 0.56

    def half(sign):
        s = sign
        return [
            (cx + s * 2, top),
            (cx + s * 5, top + H * 0.08),
            (cx + s * W * 0.075, p2),
            (cx + s * W * 0.16, p1 + H * 0.02),
            (cx + s * W * 0.5, base),
        ]

    left, right = half(-1), half(1)
    arch = (
        f"L{cx + W * 0.27:.1f},{base:.1f} "
        f"Q{cx + W * 0.22:.1f},{base - H * 0.2:.1f} {cx:.1f},{base - H * 0.2:.1f} "
        f"Q{cx - W * 0.22:.1f},{base - H * 0.2:.1f} {cx - W * 0.27:.1f},{base:.1f} "
    )
    d = f"M{left[0][0]:.1f},{left[0][1]:.1f} "
    d += f"Q{cx - 5:.1f},{top + H * 0.3:.1f} {left[2][0]:.1f},{left[2][1]:.1f} "
    d += f"Q{cx - W * 0.12:.1f},{p1 - H * 0.08:.1f} {left[3][0]:.1f},{left[3][1]:.1f} "
    d += f"Q{cx - W * 0.28:.1f},{base - H * 0.14:.1f} {left[4][0]:.1f},{left[4][1]:.1f} "
    d += arch
    d += f"L{right[4][0]:.1f},{right[4][1]:.1f} "
    d += f"Q{cx + W * 0.28:.1f},{base - H * 0.14:.1f} {right[3][0]:.1f},{right[3][1]:.1f} "
    d += f"Q{cx + W * 0.12:.1f},{p1 - H * 0.08:.1f} {right[2][0]:.1f},{right[2][1]:.1f} "
    d += f"Q{cx + 5:.1f},{top + H * 0.3:.1f} {right[0][0]:.1f},{right[0][1]:.1f} Z"
    body = f'<path d="{d}" fill="{color}"/>'
    plat = rect(cx - W * 0.21, p1 - H * 0.02, W * 0.42, H * 0.035, color)
    plat += rect(cx - W * 0.1, p2 - H * 0.015, W * 0.2, H * 0.025, color)
    plat += rect(cx - 1.5, top - H * 0.06, 3, H * 0.07, color)
    out = layer(body + plat, 2, 0.88)
    if detail:
        lines = ""
        for t in [0.12, 0.2, 0.33, 0.42, 0.5, 0.64, 0.74, 0.84]:
            y = base - H * t
            # عرض البرج التقريبي عند هذا الارتفاع
            ww = W * (0.5 * (1 - t) ** 2.2 + 0.03)
            lines += f'<path d="M{cx - ww:.1f},{y:.1f} L{cx + ww:.1f},{y - H * 0.04:.1f} M{cx - ww:.1f},{y - H * 0.04:.1f} L{cx + ww:.1f},{y:.1f}"/>'
        lines += f'<path d="{d}"/>'
        lines += f'<path d="M{cx - W * 0.21:.1f},{p1 - H * 0.02:.1f} h{W * 0.42:.1f} M{cx - W * 0.1:.1f},{p2 - H * 0.015:.1f} h{W * 0.2:.1f}"/>'
        out += ink(lines, 0.45, 1.1)
    return out


def building(rnd, x, base, w, floors, facade, roof="#7d8fc8", window="#9cc9ee", fh=30) -> tuple[str, str, str]:
    """مبنى باريسي (هوسماني): واجهة، سقف منحدر بنوافذ علوية، مداخن، شرفات.

    يعيد (طبقة الواجهة، طبقة السقف والنوافذ، خطوط الحبر)."""
    h = floors * fh
    top = base - h
    rh = fh * 1.15
    face = rect(x, top, w, h, facade)
    roofp = poly([(x - 3, top), (x + w + 3, top), (x + w - 10, top - rh), (x + 10, top - rh)], roof)
    chim = ""
    for cxp in rnd.sample([0.18, 0.38, 0.62, 0.82], 2):
        cxx = x + w * cxp
        chim += rect(cxx - 7, top - rh - 16, 14, 18, "#e98a6b")
        chim += rect(cxx - 9, top - rh - 18, 18, 4, "#d9705a")
    cols = max(2, int(w // 26))
    gap = w / cols
    wins = ""
    lines = f'<path d="M{x:.1f},{base:.1f} V{top:.1f} H{x + w:.1f} V{base:.1f}"/>'
    lines += f'<path d="M{x - 3:.1f},{top:.1f} L{x + 10:.1f},{top - rh:.1f} H{x + w - 10:.1f} L{x + w + 3:.1f},{top:.1f}"/>'
    for c in range(cols):
        wx = x + gap * c + gap * 0.28
        ww = gap * 0.44
        # نوافذ السقف
        wins += rect(wx + 1, top - rh * 0.72, ww - 2, rh * 0.5, window)
        for f_ in range(floors - 1):
            wy = top + fh * f_ + fh * 0.22
            wins += rect(wx, wy, ww, fh * 0.56, window)
    # الطابق الأرضي: محلات
    gy = base - fh * 0.95
    wins += rect(x + 4, gy, w - 8, fh * 0.9, rnd.choice(["#3fa7a0", "#e8607a", "#5d7fd6", "#f2a33a"]))
    # شرفات حديدية في الطابقين الثاني والخامس
    for f_ in [1, 4]:
        if f_ < floors - 1:
            by = top + fh * f_ + fh * 0.78
            lines += f'<path d="M{x + 2:.1f},{by:.1f} H{x + w - 2:.1f}"/>'
            lines += "".join(f'<path d="M{x + 4 + i * 5:.1f},{by:.1f} v-5"/>' for i in range(int((w - 8) / 5)))
    return face, roofp + chim + wins, lines


def tree(rnd, cx, base, r, greens=("#7fd36b", "#4fb06d", "#9be07a")) -> str:
    out = rect(cx - 3, base - r * 0.9, 6, r * 0.95, "#8a6a4a")
    for k in range(5):
        out += blob(cx + rnd.uniform(-r * 0.5, r * 0.5), base - r * 1.1 + rnd.uniform(-r * 0.4, r * 0.3), r * rnd.uniform(0.45, 0.7), rnd.choice(greens), rnd)
    return out


def ripples(rnd, x0, x1, y0, y1, n, color="#ffffff") -> str:
    out = ""
    for _ in range(n):
        x = rnd.uniform(x0, x1)
        y = rnd.uniform(y0, y1)
        L = rnd.uniform(20, 70)
        out += f'<path d="M{x:.1f},{y:.1f} q{L / 2:.1f},-4 {L:.1f},0" stroke="{color}" stroke-width="3" fill="none" stroke-linecap="round"/>'
    return out


def lamp(x, base, h=150) -> str:
    """عمود إنارة باريسي بخط الحبر."""
    top = base - h
    return ink(
        f'<path d="M{x},{base} V{top + 26} M{x - 10},{base} h20 M{x - 6},{base - 30} h12"/>'
        f'<path d="M{x - 13},{top + 26} h26 l-6,-22 h-14 Z M{x - 9},{top + 4} q9,-12 18,0 M{x},{top - 8} v-6"/>',
        0.75,
        1.8,
    ) + layer(rect(x - 7, top + 6, 14, 18, "#ffd65a"), 2, 0.9)


# ------------------------------------------------------------------ المشاهد


def scene_hero() -> str:
    W, H = 1600, 640
    rnd = random.Random(5)
    out = sky(W, 470, [(0, "#6cc0f5"), (0.55, "#bfe6ff"), (1, "#ffe1a6")])
    out += layer(f'<circle cx="560" cy="130" r="58" fill="#ffd25a"/>', 2, 0.92)
    out += clouds(rnd, [(820, 90, 1.1), (1350, 70, 0.9), (180, 120, 0.8)])
    # خط المدينة البعيد وقبة ذهبية
    far = ""
    x = -20
    while x < W:
        bw = rnd.uniform(40, 110)
        bh = rnd.uniform(25, 70)
        far += rect(x, 440 - bh, bw, bh + 40, "#c3bde8")
        x += bw - 4
    far += f'<path d="M905,402 a38,40 0 0 1 76,0 Z" fill="#f2c14e"/>' + rect(915, 400, 56, 30, "#c3bde8")
    far += rect(941, 340, 4, 26, "#f2c14e")
    out += layer(far, 1, 0.7)
    out += eiffel(330, 470, 400, "#6c7cc6")
    # صف المباني
    faces, roofs, lines = "", "", ""
    x = -30
    palette = ["#f9d6b0", "#f6c6cf", "#fbe6a2", "#d4e6f7", "#f4d1e8", "#ffe0c2"]
    while x < W + 20:
        bw = rnd.uniform(130, 200)
        low = x > 980
        floors = rnd.randint(4, 5) if low else rnd.randint(5, 7)
        if 120 < x < 540:
            floors = 2  # افسح للبرج
        f_, r_, l_ = building(rnd, x, 512, bw, floors, rnd.choice(palette), fh=26 if low else 28)
        faces += f_
        roofs += r_
        lines += l_
        x += bw + rnd.uniform(-6, 4)
    out += layer(faces, 0, 0.8) + layer(roofs, 2, 0.85) + ink(lines, 0.35, 1)
    # أشجار الرصيف
    trees = "".join(tree(rnd, x, 520, rnd.uniform(26, 40)) for x in range(-10, W + 40, 70))
    out += layer(trees, 1, 0.85)
    # الرصيف والنهر
    out += layer(rect(-20, 512, W + 40, 34, "#ecd6aa"), 0, 0.85)
    out += grad("seine", [(0, "#5fd0cf"), (1, "#2b86b8")])
    out += layer(rect(-30, 544, W + 60, 120, "url(#seine)"), "bleed", 0.9)
    # الجسر بأقواس
    bridge = f'<path fill-rule="evenodd" fill="#f0dcb4" d="M600,500 H1110 V600 H600 Z '
    for i in range(4):
        ax = 620 + i * 122
        bridge += f"M{ax},600 V570 Q{ax + 51},515 {ax + 102},570 V600 Z "
    bridge += '"/>'
    bridge += rect(594, 492, 522, 12, "#e2c48d")
    out += layer(bridge, 0, 0.9)
    out += ink(
        '<path d="M600,504 H1110"/>'
        + "".join(f'<path d="M{620 + i * 122},600 V570 Q{671 + i * 122},515 {722 + i * 122},570 V600"/>' for i in range(4))
        + "".join(f'<path d="M{640 + i * 61},492 v-26"/><circle cx="{640 + i * 61}" cy="462" r="4"/>' for i in range(8)),
        0.5,
    )
    out += layer(ripples(rnd, 0, W, 560, 630, 40), 1, 0.8)
    # قارب
    boat = f'<path d="M1210,592 H1440 L1420,616 H1228 Z" fill="#ef5a6f"/>' + rect(1260, 568, 110, 24, "#fff1c9") + rect(1290, 574, 18, 10, "#9cc9ee") + rect(1320, 574, 18, 10, "#9cc9ee")
    out += layer(boat, 2, 0.92)
    out += ink('<path d="M1210,592 H1440 L1420,616 H1228 Z M1260,592 V568 H1370 V592"/>', 0.5)
    return svg(W, H, out)


def scene_cafe() -> str:
    """المرحلة 0: مقهى رصيف بمظلّة مخطّطة."""
    W, H = 800, 560
    rnd = random.Random(11)
    out = sky(W, 200, [(0, "#8fd3ff"), (1, "#dff3ff")])
    # الواجهة
    out += layer(rect(-10, 40, W + 20, 380, "#fbe2c4"), 0, 0.85)
    wins = ""
    for i in range(5):
        wins += rect(40 + i * 155, 70, 70, 90, "#9cc9ee")
    out += layer(wins, 2, 0.85)
    # صناديق زهور تحت النوافذ
    flowers = ""
    for i in range(5):
        bx = 35 + i * 155
        flowers += rect(bx, 162, 80, 14, "#c9764f")
        for k in range(7):
            flowers += blob(bx + 6 + k * 11, 158, 7, rnd.choice(["#ff4f7b", "#ff7a59", "#ff4f7b", "#7fd36b"]), rnd, 7, 0.3)
    out += layer(flowers, 1, 0.9)
    out += ink("".join(f'<path d="M{40 + i * 155},70 h70 v90 h-70 Z M{75 + i * 155},70 v90 M{40 + i * 155},110 h70"/>' for i in range(5)), 0.5)
    # المظلّة المخططة
    aw = ""
    for i in range(20):
        x0 = -10 + i * 42
        aw += poly([(x0, 210), (x0 + 42, 210), (x0 + 50, 290), (x0 + 8, 290)], "#f0506e" if i % 2 == 0 else "#ffffff")
    for i in range(20):
        x0 = -2 + i * 42
        aw += f'<path d="M{x0},290 q21,26 42,0 Z" fill="{"#f0506e" if i % 2 == 0 else "#ffe9ee"}"/>'
    out += layer(aw, 0, 0.9)
    out += ink('<path d="M-10,210 H810 M-2,290 H842"/>', 0.5)
    out += f'<text x="400" y="262" text-anchor="middle" font-family="GFS Baskerville, Bitstream Charter, serif" font-style="italic" font-size="46" fill="{INK}" opacity="0.8">Café de la Gare</text>'
    # داخل المقهى
    out += layer(rect(-10, 300, W + 20, 120, "#8a5a3c"), 2, 0.55)
    out += layer("".join(rect(30 + i * 190, 320, 140, 90, "#ffd98a") for i in range(4)), 1, 0.6)
    # الرصيف
    out += layer(rect(-10, 410, W + 20, 170, "#c9d3ea"), "bleed", 0.85)
    # طاولات وكراسٍ
    furn = ""
    lines = ""
    for i, cx in enumerate([150, 400, 650]):
        furn += f'<ellipse cx="{cx}" cy="440" rx="62" ry="14" fill="#e9eef8"/>'
        furn += rect(cx - 4, 440, 8, 70, "#4a4f6a")
        furn += f'<ellipse cx="{cx}" cy="512" rx="30" ry="6" fill="#4a4f6a"/>'
        for side in (-1, 1):
            chx = cx + side * 95
            furn += rect(chx - 22, 455, 44, 10, "#f2a33a")
            furn += rect(chx - 22 + (12 if side < 0 else 0), 400, 32, 55, "#f6b955")
            lines += f'<path d="M{chx - 22},465 v50 M{chx + 22},465 v50 M{chx - 22},455 h44"/>'
        # فنجان وكرواسون
        furn += f'<path d="M{cx - 30},428 h20 v10 q-10,8 -20,0 Z" fill="#ffffff"/>'
        furn += f'<path d="M{cx + 8},434 q16,-14 32,0 q-16,-4 -32,0 Z" fill="#e6a148"/>'
        lines += f'<ellipse cx="{cx}" cy="440" rx="62" ry="14"/><path d="M{cx - 30},428 h20 v10 q-10,8 -20,0 Z"/>'
    out += layer(furn, 2, 0.92) + ink(lines, 0.55)
    # نبتة على الطرف
    plant = rect(735, 470, 46, 50, "#e46f4e") + "".join(blob(758 + rnd.uniform(-22, 22), 450 + rnd.uniform(-30, 10), 18, rnd.choice(["#4fb06d", "#7fd36b"]), rnd) for _ in range(8))
    out += layer(plant, 1, 0.9)
    return svg(W, H, out)


def scene_boulangerie() -> str:
    """المرحلة A1: مخبز بنافذة خبز ودرّاجة."""
    W, H = 800, 560
    rnd = random.Random(21)
    out = sky(W, 160, [(0, "#9ad8ff"), (1, "#fff0c4")])
    out += layer(rect(-10, 20, W + 20, 420, "#fff1d6"), 0, 0.8)
    # إطار المحل
    out += layer(rect(60, 120, 680, 320, "#1f9f9a"), 0, 0.92)
    # لافتة
    out += layer(rect(90, 140, 620, 54, "#ffd86b"), 2, 0.95)
    out += ink('<path d="M90,140 h620 v54 h-620 Z"/>', 0.5)
    out += f'<text x="400" y="181" text-anchor="middle" font-family="GFS Baskerville, Bitstream Charter, serif" font-style="italic" font-size="40" fill="{INK}" opacity="0.85">Boulangerie</text>'
    # النافذة
    out += layer(rect(100, 215, 380, 200, "#fff7e0"), 1, 0.95)
    bread = ""
    for i in range(6):
        bx = 130 + i * 52
        bread += f'<ellipse cx="{bx}" cy="300" rx="14" ry="78" fill="#e9a547" transform="rotate({-12 + i * 5} {bx} 300)"/>'
    bread += rect(115, 360, 350, 20, "#c9764f")
    for i in range(5):
        cx = 150 + i * 66
        bread += f'<path d="M{cx - 26},392 q26,-34 52,0 q-26,-10 -52,0 Z" fill="#f0b45a"/>'
    out += layer(bread, 2, 0.95)
    out += ink("".join(f'<path d="M{122 + i * 52},{262 + j * 22} l14,-6" transform="rotate({-12 + i * 5} {130 + i * 52} 300)"/>' for i in range(6) for j in range(4)), 0.5)
    out += ink('<path d="M100,215 h380 v200 h-380 Z M290,215 v200"/>', 0.5)
    # الباب
    out += layer(rect(530, 215, 160, 225, "#178a85") + rect(550, 235, 120, 120, "#bfe6ff"), 0, 0.9)
    out += ink('<path d="M530,215 h160 v225 M550,235 h120 v120 h-120 Z"/><circle cx="660" cy="390" r="5"/>', 0.55)
    # مظلة صفراء
    aw = "".join(poly([(50 + i * 50, 100), (100 + i * 50, 100), (104 + i * 50, 128), (54 + i * 50, 128)], "#ffd23f" if i % 2 == 0 else "#ffffff") for i in range(14))
    out += layer(aw, 1, 0.9)
    # الرصيف
    out += layer(rect(-10, 440, W + 20, 140, "#f3c9a6"), "bleed", 0.7)
    # درّاجة بسلة خبز
    bx, by = 330, 500
    bike = ink(
        f'<circle cx="{bx - 70}" cy="{by}" r="38"/><circle cx="{bx + 80}" cy="{by}" r="38"/>'
        f'<path d="M{bx - 70},{by} L{bx - 10},{by - 52} L{bx + 40},{by - 52} L{bx + 80},{by} M{bx - 10},{by - 52} L{bx},{by} L{bx + 40},{by - 52} '
        f'M{bx - 20},{by - 66} h22 M{bx + 40},{by - 52} l12,-26 h16"/>',
        0.85,
        2.6,
    )
    basket = rect(bx + 50, by - 82, 50, 28, "#d99a52") + f'<ellipse cx="{bx + 72}" cy="{by - 96}" rx="9" ry="34" fill="#e9a547" transform="rotate(18 {bx + 72} {by - 96})"/>'
    basket += f'<ellipse cx="{bx + 88}" cy="{by - 94}" rx="8" ry="30" fill="#f0b45a" transform="rotate(30 {bx + 88} {by - 94})"/>'
    out += layer(f'<path d="M{bx - 70},{by} L{bx - 10},{by - 52} L{bx + 40},{by - 52} L{bx + 80},{by} L{bx},{by} Z" fill="none" stroke="#ff5a7a" stroke-width="7"/>', 2, 0.9)
    out += layer(basket, 1, 0.95) + bike
    # أصيص زهور
    pot = rect(700, 470, 50, 46, "#e46f4e") + "".join(blob(725 + rnd.uniform(-24, 24), 452 + rnd.uniform(-26, 8), 12, rnd.choice(["#ff4f7b", "#ffb52e", "#4fb06d", "#7fd36b"]), rnd) for _ in range(12))
    out += layer(pot, 1, 0.9)
    return svg(W, H, out)


def scene_quais() -> str:
    """المرحلة A2: ضفاف السين وصناديق الكتب الخضراء."""
    W, H = 800, 560
    rnd = random.Random(31)
    out = sky(W, 300, [(0, "#7fcaf7"), (1, "#e7f6ff")])
    out += clouds(rnd, [(560, 70, 0.8), (150, 90, 0.6)])
    # جسر حجري في الخلفية
    br = f'<path fill-rule="evenodd" fill="#efd8ae" d="M-10,150 H810 V240 H-10 Z '
    for i in range(5):
        ax = 10 + i * 160
        br += f"M{ax},240 V212 Q{ax + 70},150 {ax + 140},212 V240 Z "
    br += '"/>'
    out += layer(br, 0, 0.85)
    out += ink("".join(f'<path d="M{10 + i * 160},240 V212 Q{80 + i * 160},150 {150 + i * 160},212 V240"/>' for i in range(5)) + '<path d="M-10,150 H810"/>', 0.45)
    # أشجار فوق الضفة
    out += layer("".join(tree(rnd, x, 268, rnd.uniform(34, 48)) for x in range(-20, W + 60, 85)), 1, 0.85)
    # النهر
    out += grad("riv", [(0, "#5fd0cf"), (1, "#2a8cbf")])
    out += layer(rect(-20, 250, W + 40, 150, "url(#riv)"), "bleed", 0.88)
    # قارب نزهة
    boat = '<path d="M430,326 H690 L668,352 H448 Z" fill="#ffffff"/>' + rect(470, 302, 170, 24, "#bfe6ff") + rect(470, 296, 170, 8, "#ff5a7a")
    out += layer(boat, 2, 0.95) + ink('<path d="M430,326 H690 L668,352 H448 Z M470,326 V296 H640 V326"/>', 0.5)
    out += layer(ripples(rnd, 0, W, 300, 395, 22), 1, 0.85)
    # جدار الضفة
    out += layer(rect(-10, 395, W + 20, 175, "#f2ddb6"), 0, 0.85)
    out += ink("".join(f'<path d="M-10,{420 + r * 30} H810"/>' for r in range(5)) + "".join(f'<path d="M{(c * 70 + (35 if r % 2 else 0)) % 840 - 20},{420 + r * 30} v30"/>' for r in range(5) for c in range(12)), 0.18, 1)
    # صناديق باعة الكتب
    boxes, lines = "", ""
    for i, bx in enumerate([40, 290, 540]):
        boxes += rect(bx, 450, 220, 70, "#2f8a55")
        boxes += poly([(bx, 450), (bx + 220, 450), (bx + 230, 390), (bx + 10, 390)], "#3aa565")
        x = bx + 8
        while x < bx + 210:
            bw = rnd.uniform(9, 16)
            bh = rnd.uniform(30, 46)
            boxes += rect(x, 450 - bh, bw, bh, rnd.choice(["#ff5a7a", "#ffd23f", "#5d7fd6", "#f2a33a", "#a46be8", "#ffffff"]))
            x += bw + 2
        lines += f'<path d="M{bx},450 h220 v70 h-220 Z M{bx},450 L{bx + 10},390 H{bx + 230} L{bx + 220},450"/>'
    out += layer(boxes, 2, 0.92) + ink(lines, 0.55)
    # مارّة بسيطة (ظل)
    out += layer(f'<circle cx="700" cy="440" r="13" fill="#2b3a67"/>' + rect(688, 455, 24, 60, "#ff5a7a") + rect(690, 512, 8, 40, "#2b3a67") + rect(702, 512, 8, 40, "#2b3a67"), 1, 0.8)
    out += lamp(760, 560, 190)
    return svg(W, H, out)


def scene_montmartre() -> str:
    """المرحلة B1: تلّة مونمارتر وكنيسة بقباب بيضاء عند الغروب."""
    W, H = 800, 560
    rnd = random.Random(41)
    out = sky(W, 360, [(0, "#a98bf2"), (0.5, "#f5a3c7"), (1, "#ffd7a1")])
    out += layer(f'<circle cx="160" cy="120" r="44" fill="#fff0b3"/>', 2, 0.9)
    # الكنيسة: قبة كبرى وقباب صغيرة
    c = ""
    cx, base = 470, 250
    c += rect(cx - 150, base - 60, 300, 80, "#fbf7ff")
    c += rect(cx - 60, base - 130, 120, 90, "#ffffff")
    c += f'<path d="M{cx - 58},{base - 130} Q{cx - 58},{base - 225} {cx},{base - 235} Q{cx + 58},{base - 225} {cx + 58},{base - 130} Z" fill="#ffffff"/>'
    c += rect(cx - 6, base - 262, 12, 30, "#ffffff")
    for dx in (-120, 120):
        c += rect(cx + dx - 26, base - 100, 52, 50, "#fbf7ff")
        c += f'<path d="M{cx + dx - 26},{base - 100} Q{cx + dx},{base - 150} {cx + dx + 26},{base - 100} Z" fill="#ffffff"/>'
    c += rect(cx + 175, base - 160, 34, 180, "#fbf7ff") + f'<path d="M{cx + 175},{base - 160} Q{cx + 192},{base - 196} {cx + 209},{base - 160} Z" fill="#ffffff"/>'
    out += layer(c, 0, 0.95)
    shade = f'<path d="M{cx + 10},{base - 225} Q{cx + 58},{base - 220} {cx + 58},{base - 130} H{cx + 20} Z" fill="#c9b8f0"/>'
    shade += rect(cx + 20, base - 130, 40, 90, "#d9ccf6") + rect(cx + 60, base - 60, 90, 80, "#e3d9f8")
    out += layer(shade, 2, 0.6)
    lines = f'<path d="M{cx - 58},{base - 130} Q{cx - 58},{base - 225} {cx},{base - 235} Q{cx + 58},{base - 225} {cx + 58},{base - 130} M{cx - 150},{base - 60} H{cx + 150} M{cx - 60},{base - 130} H{cx + 60}"/>'
    lines += "".join(f'<path d="M{cx - 40 + i * 20},{base - 120} v40 q5,-8 10,0 v-40"/>' for i in range(4))
    lines += "".join(f'<path d="M{cx - 130 + i * 30},{base - 40} v40 q8,-12 16,0 v-40"/>' for i in range(9))
    out += ink(lines, 0.4, 1)
    # التلة والأشجار
    out += layer(f'<path d="M-20,260 Q200,200 420,262 T820,250 V560 H-20 Z" fill="#7fd36b"/>', "bleed", 0.85)
    out += layer("".join(tree(rnd, x, 300 + rnd.uniform(-10, 20), rnd.uniform(28, 44), ("#4fb06d", "#3c9a5f", "#7fd36b")) for x in range(-20, W + 40, 60)), 1, 0.85)
    # البيوت الملوّنة
    houses = ""
    hl = ""
    for i, (hx, hc) in enumerate([(0, "#ffd23f"), (120, "#ff7aa0"), (230, "#8fd3ff")]):
        hh = 150 + i * 10
        houses += rect(hx, 560 - hh - 120, 120, hh, hc)
        houses += poly([(hx - 4, 560 - hh - 120), (hx + 124, 560 - hh - 120), (hx + 60, 560 - hh - 170)], "#e98a6b")
        for wy in range(2):
            for wx in range(2):
                houses += rect(hx + 20 + wx * 50, 560 - hh - 100 + wy * 50, 28, 34, "#ffffff")
        hl += f'<path d="M{hx},{440} V{560 - hh - 120} H{hx + 120} V440"/>'
    out += layer(houses, 0, 0.88) + ink(hl, 0.45)
    # الدرج
    st = ""
    for i in range(10):
        y = 440 + i * 13
        st += rect(400 - i * 12, y, 260 + i * 24, 13, "#f3e3c6" if i % 2 else "#e9d2ab")
    out += layer(st, 0, 0.9)
    out += ink("".join(f'<path d="M{400 - i * 12},{440 + i * 13} h{260 + i * 24}"/>' for i in range(10)) + '<path d="M400,440 L292,570 M660,440 L768,570"/>', 0.45)
    out += lamp(380, 470, 170) + lamp(690, 470, 170)
    return svg(W, H, out)


def scene_eiffel() -> str:
    """المرحلة B2: البرج عند الغروب فوق حديقة شان دو مارس."""
    W, H = 800, 560
    rnd = random.Random(51)
    out = sky(W, 440, [(0, "#5aa8f2"), (0.45, "#ff9fb8"), (0.8, "#ffcf7a"), (1, "#fff0b8")])
    out += clouds(rnd, [(150, 110, 0.7), (640, 80, 0.85)])
    out += eiffel(400, 430, 400, "#4b4f8f")
    # الأشجار المصفوفة على الجانبين
    out += layer("".join(tree(rnd, x, 440, rnd.uniform(34, 46), ("#3c9a5f", "#4fb06d", "#2f8a55")) for x in list(range(-20, 280, 52)) + list(range(530, W + 40, 52))), 1, 0.88)
    # العشب والممرّ
    out += layer(f'<path d="M-20,430 H820 V560 H-20 Z" fill="#8fdc6e"/>', "bleed", 0.85)
    out += layer(f'<path d="M330,430 H470 L620,560 H180 Z" fill="#f3dcae"/>', 0, 0.9)
    # نزهة: بطانية مربّعات وسلّة
    pic = ""
    for i in range(4):
        for j in range(3):
            pic += rect(80 + i * 22 + j * 8, 480 + j * 16, 22, 16, "#ff5a7a" if (i + j) % 2 == 0 else "#ffffff")
    pic += rect(110, 462, 34, 22, "#d99a52")
    out += layer(pic, 2, 0.92)
    # مارّة وبالونات
    out += layer(f'<circle cx="640" cy="458" r="10" fill="#2b3a67"/>' + rect(631, 470, 18, 46, "#ffd23f") + rect(633, 514, 6, 30, "#2b3a67") + rect(641, 514, 6, 30, "#2b3a67"), 1, 0.85)
    out += layer("".join(blob(670 + dx, 380 + dy, 16, col, rnd, 8, 0.1) for dx, dy, col in [(0, 0, "#ff5a7a"), (26, -18, "#5d7fd6"), (44, 8, "#ffd23f")]), 2, 0.92)
    out += ink('<path d="M640,470 Q660,430 670,396 M640,470 Q680,420 696,378 M640,470 Q700,440 714,404"/>', 0.6, 1)
    return svg(W, H, out)


SCENES = {
    "hero": (scene_hero, 1600),
    "cafe": (scene_cafe, 800),
    "boulangerie": (scene_boulangerie, 800),
    "quais": (scene_quais, 800),
    "montmartre": (scene_montmartre, 800),
    "eiffel": (scene_eiffel, 800),
}


def render(names: list[str]) -> None:
    from playwright.sync_api import sync_playwright

    SVG_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for name in names:
            fn, width = SCENES[name]
            src = fn()
            svg_path = SVG_DIR / f"{name}.svg"
            svg_path.write_text(src, encoding="utf-8")
            w = int(src.split('width="')[1].split('"')[0])
            h = int(src.split('height="')[1].split('"')[0])
            page = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
            page.set_content(f'<html><body style="margin:0">{src}</body></html>')
            png = SVG_DIR / f"{name}.png"
            page.screenshot(path=str(png), clip={"x": 0, "y": 0, "width": w, "height": h})
            page.close()
            out = OUT_DIR / f"{name}.webp"
            subprocess.run(
                ["ffmpeg", "-loglevel", "error", "-y", "-i", str(png), "-vf", f"scale={width}:-1", "-quality", "82", str(out)],
                check=True,
            )
            png.unlink()
            print(f"{name}: {out.stat().st_size // 1024} KB")
        browser.close()


if __name__ == "__main__":
    render(sys.argv[1:] or list(SCENES))
