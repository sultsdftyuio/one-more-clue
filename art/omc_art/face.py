"""Facial features shared by the suspects."""
import math

import skia

from .paint import curve, fill, pen
from .palette import CORAL, INK, SWEAT, WHITE
from .shapes import oval, rect


def brow(c, p0, p1, bend=0.0, width=8):
    """Eyebrow; positive bend arches it upward."""
    mx, my = (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    length = math.hypot(dx, dy)
    curve(c, p0, (mx + dy / length * bend, my - dx / length * bend), p1, width)


def eye(c, cx, cy, rx, ry, look=(0.0, 0.0), pupil=0.42, lid=0.0, lid_color=None, lid_tilt=0.0):
    shape = oval(cx, cy, rx, ry)
    c.drawPath(shape, fill(WHITE))
    pr = min(rx, ry) * pupil
    px = cx + look[0] * (rx - pr) * 0.85
    py = cy + look[1] * (ry - pr) * 0.85
    c.save()
    c.clipPath(shape, doAntiAlias=True)
    c.drawCircle(px, py, pr, fill(INK))
    c.drawCircle(px - pr * 0.35, py - pr * 0.38, pr * 0.32, fill(WHITE))
    if lid > 0:
        c.save()
        c.rotate(lid_tilt, cx, cy)
        edge = cy - ry + 2 * ry * lid
        c.drawRect(rect(cx - rx * 2, cy - ry * 2, cx + rx * 2, edge), fill(lid_color))
        c.drawLine(cx - rx * 2, edge, cx + rx * 2, edge, pen(INK, 6))
        c.restore()
    c.restore()
    c.drawPath(shape, pen(INK, 6))


def wobble_mouth(c, x0, x1, y, amp=5.0, waves=2.5, width=7):
    p = skia.Path()
    steps = 40
    for i in range(steps + 1):
        t = i / steps
        x = x0 + (x1 - x0) * t
        yy = y + math.sin(t * math.pi * 2 * waves) * amp
        if i == 0:
            p.moveTo(x, yy)
        else:
            p.lineTo(x, yy)
    c.drawPath(p, pen(INK, width))


def o_mouth(c, cx, cy, rx, ry):
    shape = oval(cx, cy, rx, ry)
    c.drawPath(shape, fill(INK))
    c.save()
    c.clipPath(shape, doAntiAlias=True)
    c.drawOval(rect(cx - rx * 0.8, cy + ry * 0.25, cx + rx * 0.8, cy + ry * 1.4), fill(CORAL))
    c.restore()
    c.drawPath(shape, pen(INK, 6))


def sweat(c, x, y, s=1.0):
    p = skia.Path()
    p.moveTo(x, y - 22 * s)
    p.cubicTo(x + 14 * s, y - 2 * s, x + 14 * s, y + 14 * s, x, y + 14 * s)
    p.cubicTo(x - 14 * s, y + 14 * s, x - 14 * s, y - 2 * s, x, y - 22 * s)
    p.close()
    c.drawPath(p, fill(SWEAT))
    c.drawCircle(x - 4 * s, y + 4 * s, 3.5 * s, fill(WHITE, 210))
    c.drawPath(p, pen(INK, 5))
