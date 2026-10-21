"""Small markers: pushpin, question bubble, sparkle."""
import skia

from ..marks import question_mark
from ..paint import pen, solid
from ..palette import CORAL, CORAL_DK, CREAM, CREAM_DK, INK, MUSTARD, MUSTARD_DK, STEEL
from ..shapes import oval, poly, rect, rrect, sparkle_path, union


def pushpin(c):
    c.save()
    c.rotate(24, 200, 200)
    c.drawLine(200, 240, 200, 372, pen(INK, 14))
    c.drawLine(200, 240, 200, 366, pen(STEEL, 6))
    solid(c, rrect(182, 200, 218, 252, 8), CORAL_DK, shadow=(8, 0), outline=7)
    shine = skia.Path()
    shine.addArc(rect(150, 90, 250, 190), 200, 55)
    solid(c, oval(200, 146, 76), CORAL, CORAL_DK, shadow=(16, 14), shine=shine)
    c.restore()


def question(c):
    bubble = union(rrect(56, 64, 344, 296, 64), poly([(112, 270), (82, 362), (186, 286)], 10))
    solid(c, bubble, CREAM, CREAM_DK, shadow=(12, 12))
    question_mark(c, 200, 140, 46, CORAL, 30)


def sparkle(c):
    solid(c, sparkle_path(190, 210, 150), MUSTARD, MUSTARD_DK, shadow=(14, 14))
    solid(c, sparkle_path(320, 82, 44), CREAM, CREAM_DK, shadow=(6, 6), outline=7)
