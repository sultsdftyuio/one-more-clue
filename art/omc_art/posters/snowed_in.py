"""Case 004, Snowed In: Pinecrest Lodge at midnight in a blizzard. The power
is out, the Aurora diamond hangs over the roof, and footprints lead from the
lodge to a suspicious snowman."""
import math
import random

import skia

from ..paint import col, fill, pen, solid
from ..palette import (BRICK, BRICK_DK, CORAL, CREAM, DUSK, INK, LILAC, LILAC_DK, MUSTARD, NIGHT,
                       STEEL, TEAL, WHITE)
from ..shapes import oval, poly, rrect, sparkle_path
from .common import H, W, backdrop, glow, lineup, snow, soft, stars

SNOW, SNOW_DK = "#ECE8FA", "#C9C2EA"
PINE, PINE_DK = "#1F3B4A", "#172C38"
MOUNTAIN, MOUNTAIN_DK = "#2E2963", "#241F52"


def aurora(c):
    """Ribbons of light across the sky."""
    for i, (colour, y, amp, a) in enumerate(((TEAL, 150, 40, 60), (LILAC, 210, 50, 70), (TEAL, 260, 30, 40))):
        p = skia.Path()
        for x in range(-40, W + 41, 10):
            yy = y + math.sin(x / 90 + i) * amp
            if x == -40:
                p.moveTo(x, yy)
            else:
                p.lineTo(x, yy)
        c.drawPath(p, skia.Paint(Color=col(colour, a), AntiAlias=True, Style=skia.Paint.kStroke_Style,
                                 StrokeWidth=46, MaskFilter=skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 22)))


def necklace(c):
    """The Aurora diamond, hanging on its chain over the lodge."""
    sag = 640  # control point; the chain bottoms out at half of this
    chain = skia.Path()
    chain.moveTo(170, -10)
    chain.quadTo(300, sag, 430, -10)
    c.drawPath(chain, pen(STEEL, 4))
    for t in [i / 26 for i in range(27)]:
        x = (1 - t) ** 2 * 170 + 2 * (1 - t) * t * 300 + t ** 2 * 430
        y = (1 - t) ** 2 * -10 + 2 * (1 - t) * t * sag + t ** 2 * -10
        c.drawCircle(x, y, 4, fill(WHITE))
        c.drawCircle(x, y, 4, pen(INK, 1.5))
    cx, cy = 300, sag / 2 - 4
    glow(c, cx, cy + 24, 110, LILAC, 140)
    outline = poly([(cx - 40, cy), (cx + 40, cy), (cx + 52, cy + 18), (cx, cy + 78), (cx - 52, cy + 18)])
    facets = [
        (poly([(cx - 40, cy), (cx - 14, cy), (cx - 26, cy + 18), (cx - 52, cy + 18)]), "#D9D2FF"),
        (poly([(cx - 14, cy), (cx + 14, cy), (cx, cy + 18), (cx - 26, cy + 18)]), WHITE),
        (poly([(cx + 14, cy), (cx + 40, cy), (cx + 52, cy + 18), (cx, cy + 18)]), "#BEB2FA"),
        (poly([(cx - 52, cy + 18), (cx - 26, cy + 18), (cx, cy + 78)]), LILAC),
        (poly([(cx - 26, cy + 18), (cx + 26, cy + 18), (cx, cy + 78)]), "#C9BEFF"),
        (poly([(cx + 26, cy + 18), (cx + 52, cy + 18), (cx, cy + 78)]), LILAC_DK),
    ]
    for path, colour in facets:
        c.drawPath(path, fill(colour))
        c.drawPath(path, pen(INK, 2.5, 140))
    c.drawPath(outline, pen(INK, 6))
    solid(c, rrect(cx - 10, cy - 18, cx + 10, cy + 2, 4), STEEL, outline=4)
    for x, y, r in ((cx + 62, cy - 4, 14), (cx - 66, cy + 50, 10), (cx + 30, cy + 80, 8)):
        c.drawPath(sparkle_path(x, y, r), fill(WHITE))


def mountains(c):
    for pts, colour in (([(-40, 560), (110, 380), (240, 540), (380, 400), (520, 520), (660, 430), (660, 600), (-40, 600)],
                         MOUNTAIN_DK),
                        ([(-40, 600), (60, 470), (190, 600)], MOUNTAIN), ([(330, 610), (470, 450), (640, 610)], MOUNTAIN)):
        c.drawPath(poly(pts, 6), fill(colour))
    for x, y in ((110, 380), (380, 400), (470, 450), (60, 470)):
        c.drawPath(poly([(x - 30, y + 34), (x, y), (x + 30, y + 34), (x + 14, y + 26), (x, y + 38), (x - 14, y + 26)], 3),
                   fill(SNOW, 220))


def pine(c, x, base, h):
    for i, (w, top) in enumerate(((h * 0.42, 0.0), (h * 0.5, 0.28), (h * 0.58, 0.56))):
        y0 = base - h + top * h
        tri = poly([(x, y0), (x + w, y0 + h * 0.42), (x - w, y0 + h * 0.42)], 6)
        solid(c, tri, PINE, PINE_DK, shadow=(10, 0), outline=5)
        cap = poly([(x, y0), (x + w * 0.42, y0 + h * 0.18), (x - w * 0.42, y0 + h * 0.18)], 4)
        c.drawPath(cap, fill(SNOW))
    c.drawPath(rrect(x - 8, base - 4, x + 8, base + 14, 3), fill(INK))


def lodge(c):
    """An A-frame lodge, every light out except one candle in the window."""
    base = 770
    c.drawPath(rrect(410, 400, 446, 520, 4), fill(BRICK))
    c.drawPath(rrect(410, 400, 446, 520, 4), pen(INK, 5))
    for i in range(3):
        c.drawCircle(436 + i * 14, 380 - i * 30, 14 + i * 5, soft(STEEL, 70, 6))
    solid(c, rrect(150, 590, 450, base, 6), BRICK, BRICK_DK, shadow=(12, 0), outline=7)
    roof = poly([(120, 610), (300, 420), (480, 610)], 10)
    solid(c, roof, DUSK, NIGHT, shadow=(14, 0), outline=7)
    snowcap = poly([(120, 610), (300, 420), (480, 610), (440, 604), (400, 616), (360, 600), (300, 612), (240, 600),
                    (200, 616), (160, 602)], 6)
    c.drawPath(snowcap, fill(SNOW))
    c.drawPath(snowcap, pen(INK, 6))
    # Gable window, dark.
    c.drawPath(oval(300, 536, 26), fill(NIGHT))
    c.drawPath(oval(300, 536, 26), pen(INK, 5))
    # Ground floor windows: dark, and one with a candle.
    for x, lit in ((178, False), (246, False), (354, True)):
        if lit:
            glow(c, x + 34, 676, 90, MUSTARD, 140)
        c.drawPath(rrect(x, 640, x + 68, 712, 6), fill(MUSTARD if lit else NIGHT))
        if lit:
            c.drawPath(rrect(x + 30, 680, x + 38, 708, 2), fill(CREAM))
            c.drawPath(oval(x + 34, 674, 4, 7), fill(CORAL))
        c.drawLine(x + 34, 640, x + 34, 712, pen(INK, 4))
        c.drawLine(x, 676, x + 68, 676, pen(INK, 4))
        c.drawPath(rrect(x, 640, x + 68, 712, 6), pen(INK, 5))
    c.drawPath(rrect(250, 720, 330, 726, 3), fill(SNOW))


def ground(c):
    drift = skia.Path()
    drift.moveTo(-20, 760)
    drift.quadTo(120, 730, 260, 768)
    drift.quadTo(420, 800, 620, 750)
    drift.lineTo(620, H + 20)
    drift.lineTo(-20, H + 20)
    drift.close()
    solid(c, drift, SNOW, SNOW_DK, shadow=(0, -16), outline=7)


def footprints(c):
    """A trail from the lodge door to the snowman."""
    rng = random.Random(5)
    for i in range(8):
        t = i / 7
        x = 330 + t * 180 + (10 if i % 2 else -10)
        y = 780 + t * 60 + rng.uniform(-2, 2)
        c.drawPath(oval(x, y, 7, 4), fill(SNOW_DK))


def snowman(c):
    x, base = 520, 830
    solid(c, oval(x, base - 30, 46, 40), WHITE, SNOW_DK, shadow=(10, 6), outline=6)
    solid(c, oval(x, base - 92, 32), WHITE, SNOW_DK, shadow=(8, 5), outline=6)
    solid(c, oval(x, base - 142, 23), WHITE, SNOW_DK, shadow=(6, 4), outline=6)
    for ex in (-8, 8):
        c.drawCircle(x + ex, base - 146, 3.5, fill(INK))
    c.drawPath(poly([(x, base - 140), (x + 24, base - 136), (x, base - 133)], 2), fill(CORAL))
    # A suspicious bulge in its middle.
    c.drawPath(sparkle_path(x + 6, base - 92, 9), fill(LILAC))


def draw(c):
    backdrop(c, ["#0B0A22", NIGHT, "#2D2766"])
    stars(c, 404, 110, 0, 0, W, 460, sparkles=4, colours=(LILAC, CREAM))
    aurora(c)
    mountains(c)
    necklace(c)
    pine(c, 60, 776, 220)
    pine(c, 536, 760, 180)
    lodge(c)
    ground(c)
    footprints(c)
    lineup(c, 180, 880, 140, LILAC, gap=0.6)
    snowman(c)
    snow(c, 405, 160, 0, 0, W, H)
    # Blizzard streaks.
    rng = random.Random(406)
    for _ in range(40):
        x, y = rng.uniform(-60, W), rng.uniform(0, H)
        c.drawLine(x, y, x + 40, y + 16, pen(WHITE, 2, rng.randint(40, 90)))
