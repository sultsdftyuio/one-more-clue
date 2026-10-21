"""Magnifying glass; `inner` draws something seen through the lens (the logo's eye)."""
import skia

from ..paint import fill, pen, solid
from ..palette import CORAL, CORAL_DK, CREAM, INK, MUSTARD, MUSTARD_DK, WHITE
from ..shapes import minus, oval, rect, rrect


def lens_eye(c, cx, cy):
    almond = skia.Path()
    almond.moveTo(cx - 62, cy)
    almond.quadTo(cx, cy - 60, cx + 62, cy)
    almond.quadTo(cx, cy + 60, cx - 62, cy)
    almond.close()
    c.drawPath(almond, fill(WHITE))
    c.save()
    c.clipPath(almond, doAntiAlias=True)
    c.drawCircle(cx + 10, cy, 27, fill(CORAL))
    c.drawCircle(cx + 12, cy, 13, fill(INK))
    c.drawCircle(cx + 3, cy - 9, 6, fill(WHITE))
    c.restore()
    c.drawPath(almond, pen(INK, 7))


def draw(c, inner=None):
    cx, cy = 165, 165
    c.save()
    c.translate(cx, cy)
    c.rotate(-45)
    solid(c, rrect(-24, 140, 24, 280, 24), CORAL, CORAL_DK, shadow=(10, 0))
    for y in (182, 207, 232):
        c.drawLine(-12, y, 12, y, pen(CORAL_DK, 6))
    solid(c, rrect(-30, 108, 30, 148, 10), MUSTARD, MUSTARD_DK, shadow=(10, 0))
    c.restore()
    glass = oval(cx, cy, 92)
    c.drawPath(glass, fill(CREAM, 70))
    if inner:
        inner(c, cx, cy)
    c.save()
    c.clipPath(glass, doAntiAlias=True)
    shine = skia.Path()
    shine.addArc(rect(cx - 68, cy - 68, cx + 68, cy + 68), 200, 50)
    c.drawPath(shine, pen(WHITE, 12, 190))
    c.drawCircle(cx + 40, cy + 48, 7, fill(WHITE, 150))
    c.restore()
    solid(c, minus(oval(cx, cy, 118), oval(cx, cy, 92)), MUSTARD, MUSTARD_DK, shadow=(10, 10))
