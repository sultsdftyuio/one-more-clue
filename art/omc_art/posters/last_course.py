"""Case 003, The Last Course: course seven at Maison Lune. The cloche lifts off
a chocolate dessert with gold leaf, a glass has tipped over, there is one
spoon too many, and the four suspects stand behind the table."""
import skia

from ..paint import fill, pen, solid
from ..palette import (CORAL, CORAL_DKR, CREAM, CREAM_DK, INK, MOON, MUSTARD, MUSTARD_DK, NIGHT,
                       STEEL, TEAL, TEAL_DK, TEAL_DKR, WHITE)
from ..shapes import minus, oval, poly, rect, rrect
from .common import H, W, backdrop, glow, lineup, soft, stars

CHOC, CHOC_DK = "#6B4232", "#4A2C22"
WALL, WALL_DK = "#123A40", "#0D2C31"
TABLE_TOP = 640


def wall(c):
    """Teal striped wallpaper and an arched window with the moon outside (Maison Lune)."""
    c.drawRect(rect(0, 250, W, TABLE_TOP), fill(WALL))
    for x in range(0, W, 40):
        c.drawRect(rect(x, 250, x + 18, TABLE_TOP), fill(WALL_DK))
    c.drawRect(rect(0, 250, W, 262), fill(TEAL_DKR))
    arch = skia.Path()
    arch.moveTo(200, 560)
    arch.lineTo(200, 380)
    arch.arcTo(skia.Rect.MakeLTRB(200, 280, 400, 480), 180, 180, False)
    arch.lineTo(400, 560)
    arch.close()
    c.drawPath(arch, fill(NIGHT))
    c.save()
    c.clipPath(arch, doAntiAlias=True)
    stars(c, 303, 30, 200, 280, 400, 560, sparkles=2)
    glow(c, 330, 370, 90, MOON, 80)
    crescent = minus(oval(330, 370, 40), oval(348, 360, 36))
    c.drawPath(crescent, fill(MOON))
    c.restore()
    c.drawPath(arch, pen(INK, 9))
    c.drawLine(300, 290, 300, 560, pen(INK, 6))
    c.drawLine(200, 430, 400, 430, pen(INK, 6))


def pendant(c):
    """The lamp over the table."""
    c.drawLine(300, 0, 300, 150, pen(INK, 5))
    glow(c, 300, 200, 260, MUSTARD, 70)
    shade = poly([(254, 150), (346, 150), (380, 202), (220, 202)], 8)
    solid(c, shade, TEAL, TEAL_DK, shadow=(10, 0), outline=7)
    c.drawPath(oval(300, 206, 24, 10), fill(MOON))
    beam = poly([(222, 206), (378, 206), (500, 680), (100, 680)])
    c.drawPath(beam, soft(MOON, 26, 20))


def tablecloth(c):
    top = poly([(60, TABLE_TOP), (540, TABLE_TOP), (620, 760), (-20, 760)])
    c.drawPath(top, fill(CREAM))
    c.drawRect(rect(-20, 760, 620, H), fill(CREAM_DK))
    for x in range(-20, 640, 70):
        c.drawLine(x + 35, 770, x + 30, H, pen("#D9C29C", 6))
    c.drawPath(top, pen(INK, 7))
    c.drawLine(-20, 760, 620, 760, pen(INK, 7))


def candle(c, x, base):
    glow(c, x, base - 110, 90, MUSTARD, 120)
    solid(c, rrect(x - 13, base - 90, x + 13, base, 5), CREAM, CREAM_DK, shadow=(6, 0), outline=5)
    flame = skia.Path()
    flame.moveTo(x, base - 132)
    flame.quadTo(x + 14, base - 106, x, base - 96)
    flame.quadTo(x - 14, base - 106, x, base - 132)
    c.drawPath(flame, fill(MUSTARD))
    c.drawPath(flame, pen(INK, 3.5))
    c.drawPath(oval(x, base, 30, 9), fill(STEEL))
    c.drawPath(oval(x, base, 30, 9), pen(INK, 5))


def tipped_glass(c):
    """A wine glass knocked over, its last drop pooling on the cloth."""
    c.drawPath(oval(150, 726, 62, 14), fill(CORAL_DKR, 200))
    c.save()
    c.translate(24, 4)
    c.rotate(-72, 150, 706)
    bowl = skia.Path()
    bowl.moveTo(120, 620)
    bowl.quadTo(118, 680, 150, 684)
    bowl.quadTo(182, 680, 180, 620)
    bowl.close()
    c.drawPath(bowl, fill(WHITE, 60))
    c.drawPath(bowl, pen(INK, 5))
    c.drawLine(150, 684, 150, 720, pen(INK, 5))
    c.drawPath(oval(150, 722, 24, 6), pen(INK, 5))
    c.restore()


def plate_and_dessert(c):
    c.drawPath(oval(300, 724, 156, 40), soft(INK, 90, 10))
    solid(c, oval(300, 716, 150, 38), WHITE, CREAM_DK, shadow=(0, -8), outline=7)
    c.drawPath(oval(300, 714, 104, 24), pen(CREAM_DK, 4))
    # Chocolate dome.
    dome = skia.Path()
    dome.addArc(skia.Rect.MakeLTRB(236, 640, 364, 768), 180, 180)
    dome.close()
    solid(c, dome, CHOC, CHOC_DK, shadow=(18, 0), outline=7)
    c.drawPath(oval(300, 704, 64, 10), fill(CHOC_DK))
    shine = skia.Path()
    shine.addArc(skia.Rect.MakeLTRB(252, 654, 348, 750), 205, 50)
    c.drawPath(shine, pen(WHITE, 6, 110))
    # Gold leaf, only on the owner's plate.
    leaf = poly([(296, 640), (318, 646), (310, 662), (290, 656)], 2)
    c.drawPath(leaf, fill(MUSTARD))
    c.drawPath(leaf, pen(MUSTARD_DK, 2))
    # Smoke rising from course seven.
    for i, dx in enumerate((-24, 6, 30)):
        p = skia.Path()
        p.moveTo(300 + dx, 630)
        for k in range(1, 5):
            p.quadTo(300 + dx + (18 if (k + i) % 2 else -18), 630 - k * 26 + 13, 300 + dx, 630 - k * 26)
        c.drawPath(p, pen(STEEL, 4, 90))


def cloche(c):
    """The silver dome, lifted off the plate and floating above it."""
    glow(c, 300, 600, 160, MOON, 80)
    c.save()
    c.rotate(-12, 300, 470)
    body = skia.Path()
    body.addArc(skia.Rect.MakeLTRB(196, 400, 404, 600), 180, 180)
    body.close()
    solid(c, body, STEEL, "#9CA3CC", shadow=(22, 0), outline=8)
    hl = skia.Path()
    hl.addArc(skia.Rect.MakeLTRB(222, 424, 378, 580), 200, 46)
    c.drawPath(hl, pen(WHITE, 10, 170))
    solid(c, rrect(186, 494, 414, 510, 8), STEEL, "#9CA3CC", shadow=(8, 0), outline=6)
    solid(c, oval(300, 396, 20, 13), STEEL, "#9CA3CC", shadow=(5, 0), outline=6)
    c.restore()


def cutlery(c):
    """A fork, and two dessert spoons where there should be one."""
    def spoon(x, y, a):
        c.save()
        c.rotate(a, x, y)
        c.drawPath(rrect(x - 4, y, x + 4, y + 92, 4), fill(STEEL))
        c.drawPath(rrect(x - 4, y, x + 4, y + 92, 4), pen(INK, 4))
        c.drawPath(oval(x, y - 10, 14, 20), fill(STEEL))
        c.drawPath(oval(x, y - 10, 14, 20), pen(INK, 4))
        c.restore()

    spoon(440, 694, 14)
    spoon(476, 698, 20)
    c.save()
    c.rotate(-10, 104, 774)
    c.drawPath(rrect(100, 770, 108, 862, 4), fill(STEEL))
    c.drawPath(rrect(100, 770, 108, 862, 4), pen(INK, 4))
    for k in range(4):
        c.drawLine(94 + k * 7, 742, 94 + k * 7, 772, pen(INK, 4))
    c.restore()
    # A coral circle around the extra spoon, like a detective's marker.
    c.drawPath(oval(478, 716, 40, 64), pen(CORAL, 5, 220))


def draw(c):
    backdrop(c, ["#08151B", NIGHT, WALL])
    wall(c)
    pendant(c)
    lineup(c, 300, TABLE_TOP + 48, 220, TEAL, gap=0.66)
    tablecloth(c)
    candle(c, 34, 700)
    candle(c, 540, 676)
    tipped_glass(c)
    plate_and_dessert(c)
    cloche(c)
    cutlery(c)
