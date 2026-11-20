"""The four detectives in the cast's house style (thick ink, cream sticker rim, big eyes), plus one sprite sheet.

    python detectives.py      # -> sprites.png: squires idle, squires nervous, ozzy, priya, rena, sam, mei, ali, jo
"""
from __future__ import annotations

import os

import numpy as np
import skia
from PIL import Image

OUT = os.path.dirname(os.path.abspath(__file__))
CAST = r"C:\Users\sulta\one-more-clue\src\assets\art\cast"
INK, CREAM = "#1B1F3B", "#FFF4E0"


def P(hexc, a=1.0, stroke=None, corner=None):
    p = skia.Paint(AntiAlias=True)
    v = int(hexc[1:], 16)
    p.setColor(skia.Color((v >> 16) & 255, (v >> 8) & 255, v & 255, int(a * 255)))
    if stroke:
        p.setStyle(skia.Paint.kStroke_Style)
        p.setStrokeWidth(stroke)
        p.setStrokeCap(skia.Paint.kRound_Cap)
        p.setStrokeJoin(skia.Paint.kRound_Join)
    if corner:
        p.setPathEffect(skia.CornerPathEffect.Make(corner))
    return p


def shade(hexc, k):
    v = int(hexc[1:], 16)
    r, g, b = ((v >> 16) & 255) * k, ((v >> 8) & 255) * k, (v & 255) * k
    return "#%02X%02X%02X" % (int(min(255, r)), int(min(255, g)), int(min(255, b)))


def body_path(kind):
    p = skia.Path()
    if kind == "circle":
        p.addCircle(320, 482, 182)
    elif kind == "square":
        p.addRRect(skia.RRect.MakeRectXY(skia.Rect.MakeLTRB(140, 300, 500, 662), 58, 58))
    elif kind == "rect":
        p.addRRect(skia.RRect.MakeRectXY(skia.Rect.MakeLTRB(170, 272, 470, 664), 46, 46))
    else:  # triangle, its corners rounded
        p.moveTo(320, 262)
        p.lineTo(514, 662)
        p.lineTo(126, 662)
        p.close()
    return p


HAT = {"circle": (318, 168), "square": (318, 176), "rect": (290, 160), "triangle": (304, 118)}


def detective(kind, colour, prop):
    surf = skia.Surface(640, 896)
    c = surf.getCanvas()
    c.clear(skia.ColorTRANSPARENT)
    corner = 44 if kind == "triangle" else None
    body = body_path(kind)
    hy, hw = HAT[kind]
    beanie = prop == "headset"

    def hat_path():
        h = skia.Path()
        if beanie:
            h.addOval(skia.Rect.MakeLTRB(320 - hw * 0.78, hy - 96, 320 + hw * 0.78, hy + 40))
        else:
            h.moveTo(320 - hw * 0.6, hy)
            h.lineTo(320 - hw * 0.52, hy - 92)
            h.quadTo(320, hy - 124, 320 + hw * 0.52, hy - 92)
            h.lineTo(320 + hw * 0.6, hy)
            h.close()
        return h

    brim = skia.Rect.MakeLTRB(320 - hw, hy - 22, 320 + hw, hy + 22)
    # shadow, then the cream sticker rim round the whole silhouette
    c.drawOval(skia.Rect.MakeLTRB(176, 820, 464, 848), P("#000000", 0.22))
    for x in (270, 370):
        c.drawLine(x, 640, x, 808, P(CREAM, stroke=36))
        c.drawOval(skia.Rect.MakeLTRB(x - 18 - 30 * (x < 320) + 0, 794, x + 18 + 30 * (x > 320), 834), P(CREAM))
    c.drawPath(body, P(CREAM, stroke=34, corner=corner))
    c.drawPath(hat_path(), P(CREAM, stroke=30))
    if not beanie:
        c.drawOval(brim.makeOutset(13, 13), P(CREAM))
    # legs and feet
    for x in (270, 370):
        c.drawLine(x, 640, x, 806, P(INK, stroke=15))
        dx = -16 if x < 320 else 16
        c.drawOval(skia.Rect.MakeLTRB(x + dx - 34, 800, x + dx + 34, 828), P(INK))
    # body, shaded, with a trench coat over the lower half
    c.drawPath(body, P(colour, corner=corner))
    c.save()
    c.clipPath(body, skia.ClipOp.kIntersect, True)
    c.drawRect(skia.Rect.MakeLTRB(452, 200, 560, 700), P(shade(colour, 0.8)))
    c.drawRect(skia.Rect.MakeLTRB(60, 566, 580, 700), P("#C9A877"))
    lap = skia.Path()
    lap.moveTo(250, 566)
    lap.lineTo(320, 652)
    lap.lineTo(390, 566)
    lap.close()
    c.drawPath(lap, P("#E9D7B2"))
    c.drawPath(lap, P(INK, stroke=6))
    c.drawLine(60, 566, 580, 566, P(INK, stroke=7))
    for y in (604, 638):
        c.drawCircle(300 if y < 620 else 340, y, 6, P("#5A4632"))
    c.drawRect(skia.Rect.MakeLTRB(60, 642, 580, 660), P("#9C7E52"))
    c.restore()
    c.drawPath(body, P(INK, stroke=12, corner=corner))
    hl = skia.Path()
    hl.addArc(skia.Rect.MakeLTRB(176, 330, 300, 470), 200, 60)
    c.drawPath(hl, P("#FFFFFF", 0.4, stroke=13))
    # face
    for x in (268, 372):
        c.drawCircle(x, 448, 37, P("#FFFFFF"))
        c.drawCircle(x, 448, 37, P("#3F425A", stroke=6))
        c.drawCircle(x + 4, 452, 14, P(INK))
        c.drawCircle(x + 9, 446, 4.6, P("#FFFFFF"))
    c.drawLine(236, 398, 298, 404, P(INK, stroke=12))
    c.drawLine(342, 404, 404, 398, P(INK, stroke=12))
    smile = skia.Path()
    smile.moveTo(294, 522)
    smile.quadTo(320, 542, 346, 522)
    c.drawPath(smile, P(INK, stroke=10))
    # the hat
    if beanie:
        c.drawPath(hat_path(), P(shade(colour, 0.55)))
        c.drawRect(skia.Rect.MakeLTRB(320 - hw * 0.8, hy - 6, 320 + hw * 0.8, hy + 24), P(shade(colour, 0.45)))
        c.drawPath(hat_path(), P(INK, stroke=9))
        c.drawCircle(320, hy - 100, 18, P(CREAM))
        c.drawCircle(320, hy - 100, 18, P(INK, stroke=6))
    else:
        c.drawPath(hat_path(), P("#2A2433"))
        c.drawRect(skia.Rect.MakeLTRB(320 - hw * 0.58, hy - 34, 320 + hw * 0.58, hy - 12), P(shade(colour, 0.7)))
        c.drawPath(hat_path(), P(INK, stroke=8))
        c.drawOval(brim, P("#2A2433"))
        c.drawOval(brim, P(INK, stroke=8))
        c.drawLine(320, hy - 112, 320, hy - 92, P("#4A4258", stroke=6))
    # what the role carries (no hands)
    if prop == "camera":
        c.drawLine(196, 410, 286, 590, P(INK, stroke=7))
        c.drawLine(444, 410, 354, 590, P(INK, stroke=7))
        c.drawRRect(skia.RRect.MakeRectXY(skia.Rect.MakeLTRB(258, 570, 382, 644), 14, 14), P("#2A2E34"))
        c.drawRRect(skia.RRect.MakeRectXY(skia.Rect.MakeLTRB(258, 570, 382, 644), 14, 14), P(INK, stroke=8))
        c.drawCircle(320, 607, 25, P("#5E6A70"))
        c.drawCircle(320, 607, 25, P(INK, stroke=6))
        c.drawCircle(320, 607, 12, P("#9FC0FF"))
        c.drawRect(skia.Rect.MakeLTRB(352, 578, 372, 590), P(CREAM))
    elif prop == "scarf":
        for x in (268, 372):
            c.drawCircle(x, 448, 46, P(INK, stroke=7))
        c.drawLine(314, 444, 326, 444, P(INK, stroke=7))
        c.drawRRect(skia.RRect.MakeRectXY(skia.Rect.MakeLTRB(150, 548, 490, 584), 16, 16), P("#D6312F"))
        c.drawRRect(skia.RRect.MakeRectXY(skia.Rect.MakeLTRB(150, 548, 490, 584), 16, 16), P(INK, stroke=6))
        c.save()
        c.rotate(-6, 410, 570)
        c.drawRRect(skia.RRect.MakeRectXY(skia.Rect.MakeLTRB(394, 566, 432, 664), 12, 12), P("#D6312F"))
        c.drawRRect(skia.RRect.MakeRectXY(skia.Rect.MakeLTRB(394, 566, 432, 664), 12, 12), P(INK, stroke=6))
        c.restore()
    elif prop == "notebook":
        c.drawLine(398, 584, 432, 560, P("#F2B33D", stroke=8))
        c.drawRect(skia.Rect.MakeLTRB(356, 590, 412, 652), P(CREAM))
        c.drawRect(skia.Rect.MakeLTRB(356, 590, 412, 652), P(INK, stroke=5))
        for y in (606, 620, 634):
            c.drawLine(364, y, 404, y, P("#7E8AAE", stroke=3))
    elif prop == "headset":
        for x in (166, 474):
            c.drawRRect(skia.RRect.MakeRectXY(skia.Rect.MakeLTRB(x - 20, 410, x + 20, 482), 14, 14), P("#2A2E34"))
            c.drawRRect(skia.RRect.MakeRectXY(skia.Rect.MakeLTRB(x - 20, 410, x + 20, 482), 14, 14), P(INK, stroke=6))
        boom = skia.Path()
        boom.moveTo(166, 470)
        boom.quadTo(190, 548, 284, 540)
        c.drawPath(boom, P(INK, stroke=6))
        c.drawCircle(288, 540, 9, P("#2A2E34"))
    img = surf.makeImageSnapshot().toarray(colorType=skia.kRGBA_8888_ColorType, alphaType=skia.kUnpremul_AlphaType)
    return Image.fromarray(img, "RGBA")


def main():
    names = ["c001-squires-idle", "c001-squires-nervous", "c001-ozzy-idle", "c001-priya-idle", "c001-rena-idle"]
    tiles = [Image.open(os.path.join(CAST, n + ".webp")).convert("RGBA") for n in names]
    tiles += [detective("square", "#F2B33D", "scarf"), detective("circle", "#EF5B5B", "camera"),
              detective("triangle", "#9B87F5", "notebook"), detective("rect", "#3FB8AF", "headset")]
    sheet = Image.new("RGBA", (320 * len(tiles), 448), (0, 0, 0, 0))
    for i, t in enumerate(tiles):
        sheet.paste(t.resize((320, 448), Image.LANCZOS), (i * 320, 0))
    sheet.save(os.path.join(OUT, "sprites.png"), optimize=True)
    preview = Image.new("RGBA", sheet.size, (24, 20, 40, 255))
    preview.alpha_composite(sheet)
    preview.convert("RGB").save(os.path.join(OUT, "sprites-preview.png"))
    print(os.path.join(OUT, "sprites.png"), sheet.size, os.path.getsize(os.path.join(OUT, "sprites.png")))


if __name__ == "__main__":
    main()
