"""Paint, shapes, glows and type: the drawing helpers the building painters share with the films.

Copied from omc_cinema/film.py in the one-more-clue-videos repo (last changed there in 2597bf2, 2026-11-16).
Kept: colours, paints, gradients, paths, glows, fonts and text, and the easing and noise helpers that the
Case 001 clock and skyline use. Left out: the camera and depth layers, tall and wide frames, frame rendering
and ffmpeg encoding. One change: the fonts load from this repo's art/fonts (the same files).
"""
from __future__ import annotations

import math
from pathlib import Path

import skia

ROOT = Path(__file__).resolve().parent.parent.parent  # this repo's art/ folder
FONTS = ROOT / "fonts"


# ---------------------------------------------------------------------------
# Time

def clamp(x, lo=0.0, hi=1.0):
    return max(lo, min(hi, x))


def span(t, start, end):
    """0 before `start`, 1 after `end`, linear in between."""
    return clamp((t - start) / (end - start)) if end > start else float(t >= start)


def ease_out(x, power=3):
    return 1 - (1 - clamp(x)) ** power


def noise1(t, seed=0.0):
    """Cheap smooth noise for handheld drift and flicker (sum of incommensurate sines)."""
    return (math.sin(t * 1.31 + seed) * 0.5 + math.sin(t * 2.17 + seed * 1.7) * 0.3 + math.sin(t * 3.73 + seed * 2.3) * 0.2)


# ---------------------------------------------------------------------------
# Paint

def rgb(hex_: str, a: float = 1.0) -> int:
    h = hex_.lstrip("#")
    return skia.Color(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), round(255 * clamp(a)))


def fill(hex_: str, a: float = 1.0, blend=None) -> skia.Paint:
    p = skia.Paint(Color=rgb(hex_, a), AntiAlias=True)
    if blend is not None:
        p.setBlendMode(blend)
    return p


def stroke(hex_: str, width: float, a: float = 1.0) -> skia.Paint:
    return skia.Paint(Color=rgb(hex_, a), AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=width,
                      StrokeCap=skia.Paint.kRound_Cap, StrokeJoin=skia.Paint.kRound_Join)


def linear(p0, p1, stops, blend=None) -> skia.Paint:
    """`stops` is [(position, hex, alpha), ...]."""
    shader = skia.GradientShader.MakeLinear([skia.Point(*p0), skia.Point(*p1)],
                                            [rgb(c, a) for _, c, a in stops], [s for s, _, _ in stops])
    p = skia.Paint(Shader=shader, AntiAlias=True)
    if blend is not None:
        p.setBlendMode(blend)
    return p


def radial(center, radius, stops, blend=None) -> skia.Paint:
    shader = skia.GradientShader.MakeRadial(skia.Point(*center), radius,
                                            [rgb(c, a) for _, c, a in stops], [s for s, _, _ in stops])
    p = skia.Paint(Shader=shader, AntiAlias=True)
    if blend is not None:
        p.setBlendMode(blend)
    return p


def rrect(x0, y0, x1, y1, r) -> skia.Path:
    p = skia.Path()
    p.addRRect(skia.RRect.MakeRectXY(skia.Rect.MakeLTRB(x0, y0, x1, y1), r, r))
    return p


def poly(points, close=True) -> skia.Path:
    p = skia.Path()
    p.moveTo(*points[0])
    for pt in points[1:]:
        p.lineTo(*pt)
    if close:
        p.close()
    return p


_glows: dict[str, skia.Image] = {}


def glow(c, center, radius, hex_, alpha, blend=skia.BlendMode.kPlus, falloff=((0, 1.0), (0.45, 0.3), (1, 0.0))):
    """A soft round light. Drawn from a small pre-rendered sprite: big gradients are slow to draw directly."""
    key = f"{hex_}{falloff}"
    if key not in _glows:
        size = 256
        surf = skia.Surface(size, size)
        sc = surf.getCanvas()
        sc.clear(skia.ColorTRANSPARENT)
        shader = skia.GradientShader.MakeRadial(skia.Point(size / 2, size / 2), size / 2,
                                                [rgb(hex_, a) for _, a in falloff], [p for p, _ in falloff])
        sc.drawRect(skia.Rect.MakeWH(size, size), skia.Paint(Shader=shader))
        _glows[key] = surf.makeImageSnapshot()
    paint = skia.Paint(AntiAlias=True)
    paint.setAlphaf(clamp(alpha))
    paint.setBlendMode(blend)
    x, y = center
    c.drawImageRect(_glows[key], skia.Rect.MakeLTRB(x - radius, y - radius, x + radius, y + radius),
                    skia.SamplingOptions(skia.FilterMode.kLinear), paint)


_faces: dict[str, skia.Typeface] = {}


def face(name: str) -> skia.Typeface:
    files = {"display": "LilitaOne-Regular.ttf", "type": "SpecialElite-Regular.ttf", "body": "Nunito[wght].ttf", "neon": "Monoton-Regular.ttf", "serif": "PlayfairDisplay-Italic[wght].ttf", "frost": "MountainsofChristmas-Bold.ttf"}
    if name not in _faces:
        _faces[name] = skia.Typeface.MakeFromFile(str(FONTS / files[name]))
    return _faces[name]


def font(name: str, size: float) -> skia.Font:
    f = skia.Font(face(name), size)
    f.setSubpixel(True)
    f.setEdging(skia.Font.Edging.kSubpixelAntiAlias)
    return f


def text(c, s, x, y, f: skia.Font, paint: skia.Paint, align="left", tracking=0.0):
    """Draws a line of text; `tracking` adds space between letters (in px)."""
    if tracking:
        total = sum(f.measureText(ch) for ch in s) + tracking * (len(s) - 1)
        cx = x - (total if align == "right" else total / 2 if align == "center" else 0)
        for ch in s:
            c.drawString(ch, cx, y, f, paint)
            cx += f.measureText(ch) + tracking
        return total
    w = f.measureText(s)
    dx = w if align == "right" else w / 2 if align == "center" else 0
    c.drawString(s, x - dx, y, f, paint)
    return w
