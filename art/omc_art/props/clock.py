"""Ringing alarm clock, stopped at 9:17 PM - the time of the incident."""
import skia

from ..marks import clock_hands, clock_ticks, shock_lines
from ..paint import fill, pen, solid
from ..palette import CORAL, CORAL_DK, CREAM, CREAM_DK, INK, MUSTARD, MUSTARD_DK
from ..shapes import oval, rect


def bells(c, cx, cy):
    for s in (-1, 1):
        c.save()
        c.rotate(s * 38, cx, cy)
        c.drawLine(cx, cy - 166, cx, cy - 182, pen(INK, 8))
        c.drawCircle(cx, cy - 184, 8, fill(MUSTARD_DK))
        c.drawCircle(cx, cy - 184, 8, pen(INK, 5))
        bell = skia.Path()
        bell.addArc(rect(cx - 44, cy - 170, cx + 44, cy - 82), 180, 180)
        bell.close()
        solid(c, bell, MUSTARD, MUSTARD_DK, shadow=(8, 6))
        c.restore()


def draw(c, hours=9, minutes=17):
    cx, cy = 200, 214
    for s in (-1, 1):
        c.drawLine(cx + s * 62, cy + 96, cx + s * 86, cy + 140, pen(INK, 12))
    bells(c, cx, cy)
    shock_lines(c, cx, cy, (-158, -143, -128), 176, 196)
    shock_lines(c, cx, cy, (-52, -37, -22), 176, 196)
    solid(c, oval(cx, cy, 120), CORAL, CORAL_DK)
    solid(c, oval(cx, cy, 94), CREAM, CREAM_DK, shadow=(-8, -8), outline=7)
    clock_ticks(c, cx, cy, 82, 16, 9)
    clock_hands(c, cx, cy, hours, minutes, 48, 70, 12, 8)
    c.drawCircle(cx, cy, 10, fill(MUSTARD))
    c.drawCircle(cx, cy, 10, pen(INK, 5))
