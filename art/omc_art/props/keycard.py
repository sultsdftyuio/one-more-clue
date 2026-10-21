"""Lab access keycard on a lanyard, with a tiny triangle mugshot."""
import random

import skia

from ..paint import fill, pen, solid
from ..palette import CORAL, CREAM, CREAM_DK, INK, LILAC, OUTLINE, STEEL, TEAL, WHITE
from ..shapes import minus, moved, poly, rect, rrect


def lanyard(c):
    strap = skia.Path()
    strap.moveTo(146, -20)
    strap.lineTo(188, 70)
    strap.moveTo(254, -20)
    strap.lineTo(212, 70)
    c.drawPath(strap, pen(INK, 28))
    c.drawPath(strap, pen(CORAL, 16))
    solid(c, rrect(182, 56, 218, 104, 8), STEEL, outline=6)


def mugshot(c):
    photo = rrect(116, 170, 200, 262, 10)
    c.drawPath(photo, fill(TEAL))
    c.save()
    c.clipPath(photo, doAntiAlias=True)
    c.drawPath(poly([(158, 192), (192, 268), (124, 268)], 6), fill(CORAL))
    for x in (150, 166):
        c.drawCircle(x, 232, 5, fill(WHITE))
        c.drawCircle(x + 1, 233, 2.4, fill(INK))
    c.restore()
    c.drawPath(photo, pen(INK, 6))


def barcode(c):
    rng = random.Random(3)
    x = 118
    while x < 282:
        w = rng.choice([3, 3, 5, 7])
        c.drawRect(rect(x, 292, x + w, 340), fill(INK, 220))
        x += w + rng.choice([3, 4, 6])


def draw(c):
    c.save()
    c.rotate(10, 200, 210)
    lanyard(c)
    card = rrect(92, 88, 308, 372, 22)
    c.drawPath(card, fill(CREAM))
    c.save()
    c.clipPath(card, doAntiAlias=True)
    c.drawRect(rect(92, 88, 308, 150), fill(LILAC))
    c.drawLine(92, 150, 308, 150, pen(INK, 5))
    c.drawPath(minus(card, moved(card, -10, -10)), fill(CREAM_DK, 200))
    c.restore()
    c.drawPath(card, pen(INK, OUTLINE))
    c.drawPath(rrect(170, 106, 230, 118, 6), fill(INK))
    mugshot(c)
    c.drawLine(220, 186, 284, 186, pen(INK, 8, 170))
    c.drawLine(220, 210, 268, 210, pen(INK, 6, 90))
    c.drawLine(220, 232, 276, 232, pen(INK, 6, 90))
    barcode(c)
    c.restore()
