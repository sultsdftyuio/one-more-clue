"""Taped polaroid of the night street - a square suspect peeks out from behind a building."""
import math

import skia

from ..marks import question_mark
from ..paint import col, fill, pen, solid
from ..palette import BRICK, CORAL, CREAM, CREAM_DK, DUSK, HAZE, INK, MOON, MUSTARD, NIGHT, WHITE
from ..shapes import rect, rrect


def photo_scene(c):
    sky_paint = skia.Paint(
        AntiAlias=True,
        Shader=skia.GradientShader.MakeLinear(points=[(0, 68), (0, 290)], colors=[col(NIGHT), col(DUSK)]),
    )
    c.drawRect(rect(92, 68, 308, 290), sky_paint)
    c.drawCircle(266, 108, 22, fill(MOON))
    for x, y in ((120, 92), (150, 120), (210, 86), (236, 132), (296, 150)):
        c.drawCircle(x, y, 2.2, fill(CREAM, 200))
    c.drawRect(rect(92, 190, 142, 290), fill(BRICK))
    c.drawRect(rect(136, 160, 192, 290), fill(HAZE))
    c.drawPath(rrect(196, 222, 256, 296, 10), fill(MUSTARD))
    c.drawPath(rrect(196, 222, 256, 296, 10), pen(INK, 5))
    for x in (208, 224):
        c.drawCircle(x, 246, 6.5, fill(WHITE))
        c.drawCircle(x - 2.5, 247, 3, fill(INK))
    c.drawRect(rect(232, 176, 308, 290), fill(BRICK))
    for wx, wy in ((150, 176), (170, 176), (150, 206), (246, 196), (276, 226), (106, 210)):
        c.drawRect(rect(wx, wy, wx + 10, wy + 14), fill(MUSTARD, 220))


def caption_scribble(c):
    p = skia.Path()
    for i in range(41):
        t = i / 40
        x = 110 + 140 * t
        y = 328 + math.sin(t * math.pi * 6) * 5 + math.sin(t * math.pi * 15) * 2
        if i == 0:
            p.moveTo(x, y)
        else:
            p.lineTo(x, y)
    c.drawPath(p, pen(INK, 5, 170))
    question_mark(c, 286, 318, 9, CORAL, 6)


def draw(c):
    c.save()
    c.rotate(-7, 200, 210)
    solid(c, rrect(72, 48, 328, 372, 8), CREAM, CREAM_DK, shadow=(8, 8), outline=7)
    photo = rrect(92, 68, 308, 290, 4)
    c.save()
    c.clipPath(photo, doAntiAlias=True)
    photo_scene(c)
    c.restore()
    c.drawPath(photo, pen(INK, 5))
    caption_scribble(c)
    c.save()
    c.rotate(-5, 200, 46)
    c.drawRect(rect(156, 30, 244, 62), fill(WHITE, 120))
    c.restore()
    c.restore()
