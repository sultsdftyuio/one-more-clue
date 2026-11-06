"""Case 002, Dead Air: a late-night radio station."""
import skia

from ..paint import curve, fill, pen, solid
from ..palette import CORAL, CORAL_DK, CREAM, INK, LILAC, LILAC_DK, MUSTARD, MUSTARD_DK, WHITE
from ..shapes import box, intersect, oval, poly, rect, rrect
from .base import Character, collar, glasses, lapels
from .colors import (
    GREEN, GREEN_DK, HAIR_BLACK, HAIR_BLACK_DK, HAIR_BROWN, HAIR_BROWN_DK, HAIR_GINGER, HAIR_GINGER_DK,
    NAVY, NAVY_DK, PINK, PINK_DK, SAND, SAND_DK,
)


def ear_cups(c, xs, y, colour, dark, w=26, h=40):
    for x in xs:
        solid(c, rrect(x - w / 2, y - h / 2, x + w / 2, y + h / 2, 12), colour, dark, shadow=(6, 0), outline=7)


# ----- Vince Valentine: the voice of Night Owls ---------------------------------


def vince_body(c, ch, mood):
    # A sparkly showman's jacket over an open shirt.
    c.drawPath(poly([(168, 326), (232, 326), (200, 400)], 2), fill(WHITE))
    lapels(c, ch, CORAL, CORAL_DK, 334, open_w=26)
    import random

    rnd = random.Random(7)
    for _ in range(26):
        x = rnd.choice([rnd.uniform(70, 168), rnd.uniform(232, 330)])
        y = rnd.uniform(318, 372)
        c.drawCircle(x, y, 2.6, fill(MUSTARD))


def vince_top(c, ch, mood):
    lift = -14 if mood == "shocked" else 0
    # A tall glossy quiff.
    q = skia.Path()
    q.moveTo(88, 176 + lift)
    q.cubicTo(80, 96 + lift, 150, 60 + lift, 236, 70 + lift)
    q.cubicTo(300, 76 + lift, 330, 112 + lift, 312, 150 + lift)
    q.cubicTo(296, 128 + lift, 262, 120 + lift, 230, 128 + lift)
    q.cubicTo(180, 132 + lift, 130, 132 + lift, 104, 176 + lift)
    q.close()
    solid(c, q, HAIR_BROWN, HAIR_BROWN_DK, shadow=(0, 10), outline=9)
    curve(c, (126, 112 + lift), (180, 80 + lift), (262, 88 + lift), width=7, color="#A26A44")
    # A gold tooth shows when he grins.
    if mood in ("idle", "smug"):
        mx, my = ch.s.mouth
        c.drawRect(rect(mx + 4, my + 2, mx + 14, my + 10), fill(MUSTARD))


VINCE = Character("c002-vince", "Vince Valentine", "square", MUSTARD, MUSTARD_DK, attitude="cheerful", arms="down", body=vince_body, top=vince_top)


# ----- Tess Okoye: producer, panics quietly -----------------------------------------


def tess_body(c, ch, mood):
    # Tight curls, clipped to her head.
    hair = skia.Path()
    hair.addRect(rect(0, 0, 400, 176))
    c.drawPath(hair, fill(HAIR_BLACK))
    for i, x in enumerate(range(116, 300, 22)):
        c.drawCircle(x, 178 + (i % 2) * 6, 14, fill(HAIR_BLACK))
    for x, y in ((170, 120), (204, 142), (232, 112), (186, 160), (222, 164)):
        curve(c, (x - 8, y), (x, y - 10), (x + 8, y), width=4, color="#4A3B5C")
    # A striped top under the triangle's hem.
    for y in (344, 366, 388):
        c.drawLine(0, y, 400, y, pen(LILAC_DK, 9))


def tess_top(c, ch, mood):
    lift = -10 if mood == "shocked" else 0
    s = ch.s
    y = 238
    half = s.half(y)
    # A producer's headset: band over the top, cups on both sides, a mic to her mouth.
    band = skia.Path()
    band.moveTo(200 - half - 2, y + lift)
    band.cubicTo(150, 40 + lift, 250, 40 + lift, 200 + half + 2, y + lift)
    c.drawPath(band, pen(INK, 14))
    c.drawPath(band, pen("#5B5F86", 7))
    ear_cups(c, (200 - half - 4, 200 + half + 4), y + lift, "#5B5F86", NAVY_DK)
    mx, my = s.mouth
    curve(c, (200 - half - 4, y + 16 + lift), (150, my + 6), (mx - 30, my + 2), width=7)
    c.drawCircle(mx - 30, my + 2, 8, fill(INK))


TESS = Character("c002-tess", "Tess Okoye", "triangle", LILAC, LILAC_DK, attitude="worried", arms="down", body=tess_body, top=tess_top)


# ----- Gus Marley: night engineer, always on a smoke break ------------------------


def gus_body(c, ch, mood):
    # A full ginger beard round the lower half of his face.
    s = ch.s
    mx, my = s.mouth
    beard = skia.Path()
    beard.moveTo(64, 268)
    beard.quadTo(110, 300, 160, my - 10)
    beard.quadTo(200, my - 22, 240, my - 10)
    beard.quadTo(290, 300, 336, 268)
    beard.lineTo(400, 420)
    beard.lineTo(0, 420)
    beard.close()
    c.drawPath(beard, fill(HAIR_GINGER))
    for x, y in ((130, 352), (170, 372), (232, 370), (270, 350), (200, 384)):
        curve(c, (x - 10, y), (x, y + 8), (x + 10, y), width=4, color=HAIR_GINGER_DK)


def gus_face(c, ch, mood):
    # A moustache above his mouth (drawn last so it sits over the beard's top).
    mx, my = ch.s.mouth
    for side in (-1, 1):
        p = oval(mx + side * 16, my - 12, 20, 9)
        solid(c, p, HAIR_GINGER, HAIR_GINGER_DK, shadow=(0, 4), outline=6)


def gus_top(c, ch, mood):
    lift = -24 if mood == "shocked" else 0
    # A flat cap, a little crooked.
    c.save()
    c.rotate(-6, 200, 130)
    c.translate(0, lift)
    cap = intersect(oval(200, 160, 120, 62), box(0, 0, 400, 156))
    solid(c, cap, SAND, SAND_DK, shadow=(10, 6), outline=9)
    solid(c, poly([(96, 150), (304, 150), (326, 172), (88, 172)], 12), SAND_DK, "#B08E5C", shadow=(0, 5), outline=8)
    c.drawCircle(200, 100, 7, fill(SAND_DK))
    c.drawCircle(200, 100, 7, pen(INK, 4))
    c.restore()
    # A pencil tucked behind his ear.
    c.drawLine(318, 214, 350, 176, pen(INK, 12))
    c.drawLine(318, 214, 350, 176, pen(MUSTARD, 6))


GUS = Character("c002-gus", "Gus Marley", "circle", GREEN, GREEN_DK, attitude="tired", arms="down", body=gus_body, face=gus_face, top=gus_top, mouth_drop=-2)


# ----- Darla Kingsley: the midnight DJ, wants Vince's slot ---------------------------


def darla_back(c, ch, mood):
    # Long wavy hair falling past her shoulders.
    h = skia.Path()
    h.moveTo(110, 120)
    h.quadTo(96, 60, 200, 54)
    h.quadTo(304, 60, 290, 120)
    for y, dx in ((180, 22), (240, -10), (300, 22)):
        h.quadTo(290 + dx, y - 30, 296, y)
    h.lineTo(104, 300)
    for y, dx in ((240, -22), (180, 10), (120, -22)):
        h.quadTo(110 + dx, y + 30, 104, y)
    h.close()
    solid(c, h, HAIR_BROWN, HAIR_BROWN_DK, shadow=(10, 0), outline=9)


def darla_body(c, ch, mood):
    # Her fringe, swept across, clipped to her head; a band tee below.
    f = skia.Path()
    f.moveTo(110, 60)
    f.lineTo(290, 60)
    f.lineTo(290, 140)
    f.quadTo(240, 96, 150, 128)
    f.lineTo(110, 150)
    f.close()
    c.drawPath(f, fill(HAIR_BROWN))
    # A vinyl record pin on her top.
    c.drawCircle(200, 350, 20, fill(INK))
    c.drawCircle(200, 350, 13, pen("#3A3F66", 2))
    c.drawCircle(200, 350, 7, fill(CORAL))


def darla_top(c, ch, mood):
    lift = -8 if mood == "shocked" else 0
    glasses(c, ch, mood, "cat", colour=INK)
    # DJ headphones on her head.
    band = skia.Path()
    band.moveTo(116, 150 + lift)
    band.cubicTo(110, 20 + lift, 290, 20 + lift, 284, 150 + lift)
    c.drawPath(band, pen(INK, 14))
    c.drawPath(band, pen(CORAL, 7))
    ear_cups(c, (112, 288), 156 + lift, CORAL, CORAL_DK, w=30, h=46)
    # Big hoop earrings.
    for x in (124, 276):
        c.drawCircle(x, 222, 14, pen(INK, 9))
        c.drawCircle(x, 222, 14, pen(MUSTARD, 4))


DARLA = Character("c002-darla", "Darla Kingsley", "rectangle", PINK, PINK_DK, attitude="smug", arms="folded", back=darla_back, body=darla_body, top=darla_top, tags={"sleeve": PINK_DK})

CAST = [VINCE, TESS, GUS, DARLA]
