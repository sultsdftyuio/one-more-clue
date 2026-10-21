"""Limbs shared by every suspect.

Suspects are drawn in a 400 x 520 frame (feet on y=480), shifted down 40 so
shocked poses have headroom. Canvas: 400 x 560.
"""
from ..paint import curve, fill, pen
from ..palette import CREAM, INK
from ..shapes import rrect

GROUND = 480


def legs(c, xs, top):
    for i, x in enumerate(xs):
        c.drawLine(x, top, x, GROUND - 10, pen(INK, 11))
        if i == 0:
            c.drawPath(rrect(x - 40, GROUND - 20, x + 6, GROUND, 10), fill(INK))
        else:
            c.drawPath(rrect(x - 6, GROUND - 20, x + 40, GROUND, 10), fill(INK))


def arm(c, shoulder, ctrl, hand):
    curve(c, shoulder, ctrl, hand, width=11)
    c.drawCircle(*hand, 14, fill(CREAM))
    c.drawCircle(*hand, 14, pen(INK, 6))
