"""Case folder with papers, a "?" stamp and a paperclip."""
import skia

from ..marks import question_mark
from ..paint import pen, solid
from ..palette import CORAL, CREAM, CREAM_DK, INK, MUSTARD, MUSTARD_DK, STEEL
from ..shapes import rrect, union


def stamp(c):
    c.save()
    c.rotate(-14, 270, 262)
    c.drawCircle(270, 262, 46, pen(CORAL, 9))
    c.drawCircle(270, 262, 35, pen(CORAL, 3))
    question_mark(c, 270, 248, 14, CORAL, 9)
    c.restore()


def paperclip(c):
    clip = skia.Path()
    clip.moveTo(306, 166)
    clip.lineTo(306, 96)
    clip.quadTo(306, 80, 320, 80)
    clip.quadTo(334, 80, 334, 96)
    clip.lineTo(334, 180)
    clip.quadTo(334, 196, 318, 196)
    clip.quadTo(298, 196, 298, 180)
    clip.lineTo(298, 110)
    c.drawPath(clip, pen(INK, 12))
    c.drawPath(clip, pen(STEEL, 6))


def draw(c):
    c.save()
    c.rotate(-6, 200, 200)
    solid(c, union(rrect(46, 104, 354, 336, 18), rrect(58, 78, 176, 130, 14)), MUSTARD_DK)
    for angle, dx in ((5, 8), (-3, -4)):
        c.save()
        c.rotate(angle, 200, 200)
        solid(c, rrect(74 + dx, 62, 326 + dx, 300, 6), CREAM, CREAM_DK, shadow=(8, 0), outline=6)
        for y in (94, 114, 134):
            c.drawLine(98 + dx, y, 262 + dx, y, pen(INK, 5, 70))
        c.restore()
    solid(c, rrect(46, 132, 354, 340, 18), MUSTARD, MUSTARD_DK, shadow=(0, 12))
    solid(c, rrect(78, 162, 214, 196, 6), CREAM, outline=5)
    c.drawLine(92, 179, 196, 179, pen(INK, 5, 120))
    stamp(c)
    paperclip(c)
    c.restore()
