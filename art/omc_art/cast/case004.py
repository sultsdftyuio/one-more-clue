"""Case 004, Snowed In: Pinecrest Lodge, cut off by a blizzard."""
import skia

from ..paint import curve, fill, pen, solid
from ..palette import CORAL, CORAL_DK, CREAM, CREAM_DK, INK, LILAC, MUSTARD, MUSTARD_DK, TEAL, TEAL_DK, WHITE
from ..shapes import box, intersect, oval, poly, rect, rrect
from .base import Character, blush, freckles
from .colors import (
    HAIR_BLOND, HAIR_BLOND_DK, HAIR_GREY, HAIR_GREY_DK, NAVY, NAVY_DK, ORANGE, ORANGE_DK, PINK, PINK_DK, SILVER,
    SLATE, SLATE_DK,
)


# ----- Otto Brennan: owns the lodge, loves his fireplaces ----------------------------------


def otto_body(c, ch, mood):
    # A chunky knit roll-neck.
    knit = box(0, 330, 400, 420)
    c.drawPath(knit, fill(CORAL))
    for x in range(60, 360, 18):
        c.drawLine(x, 336, x, 420, pen(CORAL_DK, 5))
    c.drawLine(0, 330, 400, 330, pen(INK, 7))
    # A big grey beard over the lower face.
    s = ch.s
    mx, my = s.mouth
    beard = skia.Path()
    beard.moveTo(90, 270)
    beard.quadTo(120, my - 4, 162, my - 14)
    beard.quadTo(200, my - 24, 238, my - 14)
    beard.quadTo(280, my - 4, 310, 270)
    beard.quadTo(320, 372, 200, 396)
    beard.quadTo(80, 372, 90, 270)
    beard.close()
    solid(c, beard, HAIR_GREY, HAIR_GREY_DK, shadow=(10, 6), outline=7)


def otto_face(c, ch, mood):
    blush(c, ch, mood)
    mx, my = ch.s.mouth
    for side in (-1, 1):
        solid(c, oval(mx + side * 18, my - 14, 22, 10), HAIR_GREY, HAIR_GREY_DK, shadow=(0, 4), outline=6)


def otto_top(c, ch, mood):
    # Bald and shiny on top, grey tufts at the sides.
    for side in (-1, 1):
        x = 200 + side * 124
        for dy, r in ((0, 22), (24, 18)):
            c.drawCircle(x, 214 + dy, r, fill(HAIR_GREY))
            c.drawCircle(x, 214 + dy, r, pen(INK, 6))
            c.drawCircle(x, 214 + dy, r - 5, fill(HAIR_GREY))


OTTO = Character("c004-otto", "Otto Brennan", "circle", ORANGE, ORANGE_DK, attitude="cheerful", arms="akimbo", body=otto_body, face=otto_face, top=otto_top, mouth_drop=8)


# ----- Lily Ashford: Dame Agatha's niece, films everything ---------------------------------


def lily_back(c, ch, mood):
    # Long blond hair falling either side of her.
    for side in (-1, 1):
        h = skia.Path()
        h.moveTo(200 + side * 30, 130)
        h.cubicTo(200 + side * 90, 150, 200 + side * 136, 270, 200 + side * 134, 360)
        h.lineTo(200 + side * 92, 352)
        h.cubicTo(200 + side * 80, 280, 200 + side * 52, 200, 200 + side * 20, 170)
        h.close()
        solid(c, h, HAIR_BLOND, HAIR_BLOND_DK, shadow=(side * 8, 0), outline=8)


def lily_body(c, ch, mood):
    c.drawPath(box(0, 0, 400, 176), fill(HAIR_BLOND))
    curve(c, (200, 100), (196, 140), (210, 176), width=4, color=HAIR_BLOND_DK)
    # A cosy scarf.
    c.drawPath(box(0, 334, 400, 362), fill(TEAL))
    for x in range(40, 380, 26):
        c.drawLine(x, 334, x + 10, 362, pen(TEAL_DK, 5))
    c.drawLine(0, 334, 400, 334, pen(INK, 6))
    c.drawLine(0, 362, 400, 362, pen(INK, 6))


def lily_face(c, ch, mood):
    freckles(c, ch, mood)


def lily_top(c, ch, mood):
    lift = -8 if mood == "shocked" else 0
    # A headband across the top of her head.
    band = skia.Path()
    band.moveTo(154, 168 + lift)
    band.cubicTo(170, 110 + lift, 230, 110 + lift, 246, 168 + lift)
    c.drawPath(band, pen(INK, 16))
    c.drawPath(band, pen(CORAL, 9))
    solid(c, oval(232, 128 + lift, 14, 12), CORAL, CORAL_DK, outline=5)


LILY = Character("c004-lily", "Lily Ashford", "triangle", PINK, PINK_DK, attitude="worried", arms="down", back=lily_back, body=lily_body, face=lily_face, top=lily_top)


# ----- Sir Reginald Pike: auctioneer, selling the Aurora tomorrow ----------------------------


def reginald_body(c, ch, mood):
    # A cravat in a high collar, and a dark tailcoat.
    c.drawPath(box(0, 324, 400, 420), fill(NAVY))
    c.drawLine(0, 324, 400, 324, pen(INK, 6))
    solid(c, poly([(170, 318), (230, 318), (216, 372), (200, 380), (184, 372)], 10), "#B4D0E8", "#8DAFD0", shadow=(6, 0), outline=6)
    c.drawCircle(200, 340, 6, fill(MUSTARD))
    # Grey hair with a sharp side parting.
    c.drawPath(box(0, 0, 400, 152), fill(HAIR_GREY))
    c.drawLine(150, 128, 156, 160, pen(HAIR_GREY_DK, 5))


def reginald_face(c, ch, mood):
    # Mutton chops down both sides.
    for side in (-1, 1):
        p = poly([(200 + side * 116, 150), (200 + side * 92, 152), (200 + side * 74, 268), (200 + side * 116, 248)], 12)
        solid(c, p, HAIR_GREY, HAIR_GREY_DK, shadow=(side * -6, 0), outline=7)
    # A monocle on a gold chain over his right eye.
    (_, ey), (rx, _) = ch.s.eyes
    r = ch.s.eye_r[0] + 9
    c.drawCircle(rx, ey, r, fill(WHITE, 60))
    c.drawCircle(rx, ey, r, pen(MUSTARD_DK, 9))
    c.drawCircle(rx, ey, r, pen(MUSTARD, 4))
    curve(c, (rx + r - 4, ey + 10), (rx + 40, ey + 70), (rx + 10, 312), width=3, color=MUSTARD_DK)


REGINALD = Character("c004-reginald", "Sir Reginald Pike", "square", SLATE, SLATE_DK, attitude="smug", arms="behind", body=reginald_body, face=reginald_face)


# ----- Greta Holm: mountain guide, has a master keycard ------------------------------------


def greta_back(c, ch, mood):
    # Two blond braids hanging down.
    for side in (-1, 1):
        x = 200 + side * 84
        for i, y in enumerate(range(150, 300, 30)):
            solid(c, oval(x + side * (i % 2) * 4, y, 18, 18), HAIR_BLOND, HAIR_BLOND_DK, shadow=(4, 4), outline=6)
        solid(c, rrect(x - 10, 296, x + 10, 310, 4), CORAL, outline=5)


def greta_body(c, ch, mood):
    # A zipped fleece with a high collar.
    c.drawPath(box(0, 280, 400, 420), fill(NAVY))
    c.drawLine(0, 280, 400, 280, pen(INK, 6))
    c.drawLine(200, 280, 200, 420, pen(INK, 5))
    c.drawPath(rrect(194, 288, 206, 308, 3), fill(SILVER))
    c.drawPath(rrect(150, 330, 186, 354, 4), fill(CORAL))


def greta_top(c, ch, mood):
    lift = -16 if mood == "shocked" else 0
    c.save()
    c.translate(0, lift)
    # A knitted beanie with a pattern band, a pompom, and goggles pushed up on it.
    hat = rrect(116, 40, 284, 130, 40)
    solid(c, hat, CORAL, CORAL_DK, shadow=(10, 6), outline=9)
    c.drawPath(rrect(110, 106, 290, 140, 14), fill(CREAM))
    for x in range(124, 286, 20):
        c.drawPath(poly([(x, 132), (x + 10, 114), (x + 20, 132)], 2), fill(CORAL))
    c.drawPath(rrect(110, 106, 290, 140, 14), pen(INK, 7))
    for dx, dy in ((0, 0), (12, -8), (-12, -6), (6, 10), (-8, 10)):
        c.drawCircle(200 + dx, 26 + dy, 14, fill(WHITE))
    c.drawCircle(200, 24, 24, pen(INK, 7))
    for dx, dy in ((0, 0), (12, -8), (-12, -6), (6, 10), (-8, 10)):
        c.drawCircle(200 + dx, 26 + dy, 12, fill(WHITE))
    solid(c, rrect(140, 60, 260, 92, 16), "#7FD3F0", "#4FAED6", shadow=(6, 0), outline=7)
    c.drawLine(200, 64, 200, 88, pen(INK, 5))
    c.restore()


GRETA = Character("c004-greta", "Greta Holm", "rectangle", TEAL, TEAL_DK, attitude="stern", arms="folded", back=greta_back, body=greta_body, top=greta_top, tags={"sleeve": NAVY})

CAST = [OTTO, LILY, REGINALD, GRETA]
