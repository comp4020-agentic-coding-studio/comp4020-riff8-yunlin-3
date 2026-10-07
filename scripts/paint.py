#!/usr/bin/env python3
"""Writes public/painting.svg: the watercolour of spruce, granite and a path.

Deterministic (seeded), so rerunning reproduces the committed file. The look
imitates a photo-to-watercolour pipeline step by step: big flat washes (no
detail inside shapes), a small fixed set of pigments reused across shapes,
nothing darker than a deep spruce green, translucent fills multiplied where
they overlap, darker pooled rims, one displacement filter for wet edges, a
tiled grain, and a ragged unpainted border.

    python3 scripts/paint.py
"""

import math
import random
from pathlib import Path

W, H = 820, 1230
rnd = random.Random(1363)

# The fixed pigments: five greens, three granites, two earths, one sky.
SKY = "#e6e9e4"
HAZE = "#a9bba8"
SPRUCE_LIGHT = "#6f9466"
SPRUCE = "#3d5a3a"
SPRUCE_VIVID = "#2f6e47"
SPRUCE_DEEP = "#27342c"
MOSS = "#7b9a5a"
GRANITE_LIGHT = "#b3ab9d"
GRANITE = "#8a8378"
GRANITE_DARK = "#6e675d"
CLAY = "#b79d7c"
CLAY_LIGHT = "#d2bf9f"

out: list[str] = []


def f(v: float) -> str:
    return str(int(round(v)))


def op(v) -> str:
    return f"{float(v):.2f}".lstrip("0")


def poly(points, fill, opacity, cls="", close=True):
    d = "M" + " ".join(f"{f(x)} {f(y)}" for x, y in points) + ("Z" if close else "")
    c = f' class="{cls}"' if cls else ""
    out.append(f'<path{c} d="{d}" fill="{fill}" fill-opacity="{op(opacity)}"/>')


def blob(cx, cy, rx, ry, n, jitter, fill, opacity, cls="", flat_bottom=False):
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        r = 1 + rnd.uniform(-jitter, jitter)
        x, y = cx + rx * r * math.cos(a), cy + ry * r * math.sin(a)
        if flat_bottom and y > cy:
            y = cy + (y - cy) * 0.35
        pts.append((x, y))
    poly(pts, fill, opacity, cls)


def spruce(cx, top, bottom, width, tiers, colours, opacity=0.62, lean=0.0, core=True):
    """Stacked, drooping tiers over a soft core: each tier a skirt of branches
    sagging at the tips, overlapping the one above."""
    out.append(
        f'<path class="r" d="M{f(cx)} {f(top + 10)}L{f(cx + lean * (bottom - top))} {f(bottom)}" '
        f'stroke="#4a3a2a" stroke-opacity=".45" stroke-width="{max(2, width / 24):.0f}" fill="none"/>'
    )
    if core:
        poly([(cx, top), (cx - width * 0.55, bottom - 20), (cx + width * 0.55, bottom - 10)], colours[-1], f"{opacity * 0.4:.2f}")
    step = (bottom - top) / tiers
    for pass_no, colour in enumerate(colours):
        for i in range(tiers):
            t = (i + rnd.uniform(-0.2, 0.2)) / max(1, tiers - 1)
            t = min(1, max(0, t))
            y = top + (bottom - top - step) * t
            x = cx + lean * (y - top) + pass_no * rnd.uniform(-5, 5)
            w = width * (0.1 + 0.9 * t**0.9) * rnd.uniform(0.85, 1.15)
            h = step * rnd.uniform(2.0, 2.6)
            lx, rx_ = x - w, x + w * rnd.uniform(0.9, 1.1)
            ly, ry_ = y + h * rnd.uniform(0.95, 1.2), y + h * rnd.uniform(0.95, 1.2)
            under = " ".join(
                f"L{f(lx + (rx_ - lx) * k / 4)} {f(y + h * rnd.uniform(0.6, 0.9))}" for k in range(1, 4)
            )
            d = (
                f"M{f(x)} {f(y)}Q{f(x - w * 0.35)} {f(y + h * 0.25)} {f(lx)} {f(ly)}{under}"
                f"L{f(rx_)} {f(ry_)}Q{f(x + w * 0.35)} {f(y + h * 0.25)} {f(x)} {f(y)}Z"
            )
            o = opacity * (0.7 if pass_no else 1)
            out.append(f'<path d="{d}" fill="{colour}" fill-opacity="{op(o)}"/>')


def boulder(points, base, shade, opacity=0.7, moss=None, strokes=4, knockout=False):
    if knockout:
        # An opaque paper-toned base, so the stone sits in front of the
        # washes behind it instead of multiplying into them.
        poly(points, "#ece7dc", "1", "k")
    poly(points, base, opacity)
    # a shadow wash on the lower right half
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    cx, cy = sum(xs) / len(xs), sum(ys) / len(ys)
    shadow = [(x + (cx - x) * 0.25 + 6, y + (cy - y) * 0.2 + 4) for x, y in points if x > cx - 10 or y > cy]
    if len(shadow) > 2:
        poly(shadow, shade, f"{opacity * 0.55:.2f}")
    if moss:
        poly(moss, MOSS, ".62")
    # dry-brush texture strokes, Ni Zan's cun
    for _ in range(strokes):
        x = rnd.uniform(min(xs) + 15, max(xs) - 25)
        y = rnd.uniform(cy - 5, max(ys) - 12)
        out.append(
            f'<path class="r" d="M{f(x)} {f(y)}l{f(rnd.uniform(14, 34))} {f(rnd.uniform(-10, 4))}" '
            f'stroke="#3c2d1e" stroke-opacity=".22" stroke-width="2" fill="none" stroke-dasharray="7 3 2 4"/>'
        )


def tufts(x0, x1, y_at, n):
    d = []
    for _ in range(n):
        x = rnd.uniform(x0, x1)
        y = y_at(x)
        for _ in range(3):
            d.append(f"M{f(x)} {f(y)}q{f(rnd.uniform(-6, 6))} {f(-rnd.uniform(6, 12))} {f(rnd.uniform(-10, 10))} {f(-rnd.uniform(14, 24))}")
            x += rnd.uniform(2, 5)
    out.append(f'<path class="r" d="{"".join(d)}" stroke="{MOSS}" stroke-opacity=".8" stroke-width="2" fill="none"/>')


# Sky: one pale overcast wash, a little cooler at the top.
out.append(f'<rect x="20" y="20" width="{W - 40}" height="{H - 40}" fill="{SKY}"/>')
out.append('<g filter="url(#wc-mist)">')
blob(410, 620, 420, 70, 12, 0.15, "#f1f2ec", ".9")
blob(300, 180, 300, 90, 10, 0.2, "#d8ded7", ".5")
out.append("</g>")

# Far spruces in haze along the middle distance.
for i in range(11):
    x = 50 + i * 70 + rnd.uniform(-12, 12)
    spruce(x, rnd.uniform(440, 560), 740, rnd.uniform(26, 38), 4, [HAZE], opacity=0.4, core=False)

# The stack of weathered granite in the middle distance.
boulder([(300, 760), (318, 700), (360, 672), (420, 668), (470, 690), (492, 740), (480, 772)], GRANITE_LIGHT, GRANITE, 0.75, strokes=5)
boulder([(340, 690), (356, 640), (398, 616), (446, 626), (462, 668), (440, 690)], GRANITE, GRANITE_DARK, 0.6, moss=[(360, 642), (398, 618), (444, 628), (420, 636), (380, 646)], strokes=3)
boulder([(452, 770), (470, 722), (520, 708), (566, 730), (574, 774)], GRANITE_LIGHT, GRANITE_DARK, 0.7, strokes=3)

# Ground: a moss wash under everything near.
poly([(20, 780), (220, 752), (420, 770), (620, 748), (800, 766), (800, 1210), (20, 1210)], MOSS, ".42")
poly([(20, 860), (300, 830), (560, 850), (800, 830), (800, 1210), (20, 1210)], SPRUCE_LIGHT, ".3")

# The earth path, curving in from the lower left toward the stones, wide
# near the eye and narrowing into the distance.
poly(
    [(20, 1150), (110, 1090), (230, 1010), (330, 920), (392, 850), (424, 790), (444, 792), (436, 850), (410, 930), (370, 1020), (330, 1110), (310, 1210), (20, 1210)],
    CLAY_LIGHT,
    ".8",
    "k",
)
poly([(40, 1205), (150, 1120), (260, 1030), (350, 930), (420, 820), (402, 900), (360, 1000), (300, 1100), (250, 1210)], CLAY, ".45")
# Exposed roots across it.
roots = []
for y, x, span in ((1150, 120, 170), (1070, 220, 130), (990, 300, 90), (930, 350, 60)):
    roots.append(f"M{f(x - span / 2)} {f(y + 8)}c{f(span * 0.2)} -12 {f(span * 0.5)} -2 {f(span)} {f(-rnd.uniform(14, 26))}")
out.append(f'<path class="r" d="{"".join(roots)}" stroke="#5b4630" stroke-opacity=".35" stroke-width="4" stroke-linecap="round" fill="none"/>')

# Tall spruces: left, centre, right. Two passes each, a vivid and a deep green.
spruce(150, 70, 980, 165, 12, [SPRUCE, SPRUCE_VIVID], opacity=0.55)
spruce(60, 320, 930, 90, 9, [SPRUCE_DEEP], opacity=0.4)
spruce(560, 200, 860, 105, 10, [SPRUCE_VIVID, SPRUCE_LIGHT], opacity=0.5, lean=0.01)
spruce(715, 50, 900, 150, 12, [SPRUCE, SPRUCE_DEEP], opacity=0.55)

# The large mossy boulder, lower right, grass along its top.
top_edge = [(500, 930), (545, 885), (615, 862), (690, 866), (755, 892), (800, 940)]
boulder(
    [(470, 1110), (462, 1040), (476, 975), *top_edge, (802, 1020), (790, 1100), (700, 1130), (580, 1135)],
    GRANITE,
    GRANITE_DARK,
    0.72,
    knockout=True,
    moss=[(494, 960), *top_edge, (792, 950), (700, 930), (600, 935), (520, 960)],
    strokes=7,
)


def top_y(x: float) -> float:
    for (x0, y0), (x1, y1) in zip(top_edge, top_edge[1:]):
        if x0 <= x <= x1:
            return y0 + (y1 - y0) * (x - x0) / (x1 - x0) + 4
    return 900


tufts(505, 780, top_y, 14)

# A soft, blurred boulder across the bottom edge, close to the eye.
out.append('<g filter="url(#wc-soft)">')
blob(300, 1205, 300, 70, 12, 0.12, GRANITE_DARK, ".45", flat_bottom=False)
out.append("</g>")

painting = "\n".join(out)

# A ragged unpainted border: the wash stops 6-30 px short of the sheet.
edge = []
steps = 36
for side in range(4):
    for i in range(steps):
        t = i / steps
        inset = rnd.uniform(8, 30)
        if side == 0:
            edge.append((t * W, inset))
        elif side == 1:
            edge.append((W - inset, t * H))
        elif side == 2:
            edge.append((W - t * W, H - inset))
        else:
            edge.append((inset, H - t * H))
edge_d = "M" + " ".join(f"{f(x)} {f(y)}" for x, y in edge) + "Z"

svg = f"""<svg class="painting-art" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="A watercolour of a quiet spruce forest under a pale overcast sky: tall dark spruces at the left, centre and right, a stack of weathered granite boulders in the middle distance, a large mossy boulder at the lower right with grass along its top, and a pale earth path with exposed roots curving in from the lower left.">
<defs>
<filter id="wc-wet" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".022" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="13"/></filter>
<filter id="wc-soft"><feGaussianBlur stdDeviation="7"/></filter>
<filter id="wc-mist" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="28"/></filter>
<filter id="wc-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 .24 0 0 0 0 .18 0 0 0 0 .12 0 0 0 -1.6 .9"/></filter>
<pattern id="wc-tile" width="160" height="160" patternUnits="userSpaceOnUse"><rect width="160" height="160" filter="url(#wc-grain)"/></pattern>
<mask id="wc-edge"><path d="{edge_d}" fill="#fff" filter="url(#wc-soft)"/></mask>
<style>#wc-p path{{mix-blend-mode:multiply}}#wc-p .k{{mix-blend-mode:normal}}#wc-p path:not(.r){{stroke:#3c2d1e;stroke-opacity:.1;stroke-width:1.5}}</style>
</defs>
<g mask="url(#wc-edge)">
<g id="wc-p" filter="url(#wc-wet)">
{painting}
</g>
<rect width="{W}" height="{H}" fill="url(#wc-tile)" opacity=".3"/>
</g>
</svg>
"""
Path("public/painting.svg").write_text(svg)
print(f"public/painting.svg: {len(svg.encode())} bytes")
