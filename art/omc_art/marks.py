"""Small reusable marks: surprise lines, question marks, clock faces."""
import math

import skia

from .paint import fill, pen
from .palette import INK, MUSTARD
from .shapes import rect


def shock_lines(c, ox, oy, angles, d0, d1, color=MUSTARD):
    for a in angles:
        r = math.radians(a)
        c.drawLine(ox + math.cos(r) * d0, oy + math.sin(r) * d0,
                   ox + math.cos(r) * d1, oy + math.sin(r) * d1, pen(color, 8))


def question_mark(c, cx, cy, r, color, width):
    p = skia.Path()
    p.addArc(rect(cx - r, cy - r, cx + r, cy + r), 180, 270)
    p.lineTo(cx, cy + r * 1.55)
    c.drawPath(p, pen(color, width))
    c.drawCircle(cx, cy + r * 1.55 + width * 1.6, width * 0.65, fill(color))


def clock_hands(c, cx, cy, hours, minutes, hour_len, min_len, hour_w, min_w):
    for angle, length, width in (
        ((hours % 12 + minutes / 60) * 30, hour_len, hour_w),
        (minutes * 6, min_len, min_w),
    ):
        a = math.radians(angle)
        c.drawLine(cx, cy, cx + math.sin(a) * length, cy - math.cos(a) * length, pen(INK, width))


def clock_ticks(c, cx, cy, r, major, minor):
    for i in range(12):
        a = math.radians(i * 30)
        length, width = (major, 6) if i % 3 == 0 else (minor, 4)
        c.drawLine(cx + math.sin(a) * r, cy - math.cos(a) * r,
                   cx + math.sin(a) * (r - length), cy - math.cos(a) * (r - length), pen(INK, width))
