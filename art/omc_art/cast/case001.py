"""Case 001, The Last Message: a university lab at night."""
import skia

from ..paint import curve, fill, pen, solid
from ..palette import CORAL, CORAL_DK, CREAM, CREAM_DK, INK, MUSTARD, MUSTARD_DK, TEAL, TEAL_DK, WHITE
from ..shapes import box, intersect, oval, poly, rect, rrect
from .base import Character, collar, glasses, lapels, stubble
from .colors import HAIR_BLACK, HAIR_BLACK_DK, HAIR_GREY, HAIR_GREY_DK, NAVY, NAVY_DK, SLATE, SLATE_DK


# ----- Priya Tran: PhD researcher, built HALO, hasn't slept --------------------


def priya_body(c, ch, mood):
    # Lab coat over the lower half, a pen in the pocket.
    lapels(c, ch, WHITE, CREAM_DK, 336, open_w=22)
    c.drawLine(132, 372, 132, 352, pen(CORAL, 7))
    solid(c, rrect(116, 368, 150, 392, 4), WHITE, outline=5)
    # Her fringe, cut straight across, clipped to the triangle.
    hair = poly([(200, 20), (360, 380), (300, 196), (268, 206), (232, 186), (200, 202), (166, 186), (132, 206), (100, 196), (40, 380)], 10)
    c.drawPath(hair, fill(HAIR_BLACK))
    c.drawPath(intersect(hair, box(0, 0, 400, 140)), fill(HAIR_BLACK_DK, 120))


def priya_top(c, ch, mood):
    lift = -16 if mood == "shocked" else 0
    y = 78 + lift
    # A messy bun on top, with a pencil pushed through it.
    c.drawLine(160, y + 4, 244, y - 22, pen(INK, 13))
    c.drawLine(160, y + 4, 244, y - 22, pen(MUSTARD, 7))
    solid(c, oval(200, y, 30, 26), HAIR_BLACK, HAIR_BLACK_DK, shadow=(8, 6), outline=8)
    curve(c, (184, y - 6), (200, y - 16), (216, y - 2), width=4, color=HAIR_BLACK_DK)
    for x, dx in ((222, 8), (182, -8)):
        curve(c, (x, y - 20), (x + dx, y - 36), (x + dx * 2, y - 40), width=5, color=HAIR_BLACK)
    glasses(c, ch, mood, "round", lens_alpha=40)


PRIYA = Character("c001-priya", "Priya Tran", "triangle", TEAL, TEAL_DK, attitude="tired", arms="down", body=priya_body, top=priya_top)


# ----- Prof. Edmund Squires: lab director, needs the investors --------------


def squires_body(c, ch, mood):
    # Tweed jacket, shirt collar and a coral tie, low on the body.
    c.drawPath(poly([(170, 322), (230, 322), (200, 400)], 2), fill(WHITE))
    solid(c, poly([(200, 330), (188, 342), (196, 400), (204, 400), (212, 342)], 3), CORAL, CORAL_DK, shadow=(4, 0), outline=5)
    lapels(c, ch, SLATE_DK, "#636B8C", 334, open_w=24)


def squires_top(c, ch, mood):
    # Bald on top, grey tufts over the ears.
    for side in (-1, 1):
        x = 200 + side * 112
        for dy, r in ((0, 26), (26, 22), (-22, 20)):
            c.drawCircle(x, 182 + dy, r, fill(HAIR_GREY))
        for dy, r in ((0, 26), (26, 22), (-22, 20)):
            c.drawCircle(x, 182 + dy, r, pen(INK, 6))
        for dy, r in ((0, 20), (26, 16), (-22, 14)):
            c.drawCircle(x, 182 + dy, r, fill(HAIR_GREY))
    glasses(c, ch, mood, "square", lens_alpha=40)


SQUIRES = Character("c001-squires", "Prof. Edmund Squires", "square", SLATE, SLATE_DK, attitude="stern", arms="behind", body=squires_body, top=squires_top)


# ----- Ozzy Reyes: night security, football on his phone ---------------------


def ozzy_body(c, ch, mood):
    # A uniform shirt: collar, a shoulder patch and a radio on the chest.
    collar(c, ch, NAVY, NAVY_DK, 352, depth=30, width=54)
    solid(c, poly([(96, 330), (128, 322), (132, 352), (112, 364), (94, 352)], 6), MUSTARD, MUSTARD_DK, shadow=(4, 4), outline=5)
    solid(c, rrect(244, 340, 274, 384, 6), INK, outline=0)
    c.drawLine(266, 340, 266, 318, pen(INK, 6))
    c.drawCircle(254, 352, 4, fill(CORAL))


def ozzy_face(c, ch, mood):
    stubble(c, ch, mood)


def ozzy_top(c, ch, mood):
    lift = -26 if mood == "shocked" else 0
    c.save()
    c.translate(0, lift)
    cap = intersect(oval(200, 256, 141), box(0, 0, 400, 172))
    solid(c, cap, NAVY, NAVY_DK, shadow=(14, 10), outline=9)
    # The peak, and a star badge.
    solid(c, poly([(84, 168), (316, 168), (330, 194), (70, 194)], 12), NAVY_DK, INK, shadow=(0, 6), outline=8)
    star = skia.Path()
    import math

    for i in range(10):
        r = 22 if i % 2 == 0 else 10
        a = math.radians(-90 + i * 36)
        (star.moveTo if i == 0 else star.lineTo)(200 + math.cos(a) * r, 140 + math.sin(a) * r)
    star.close()
    solid(c, star, MUSTARD, MUSTARD_DK, shadow=(4, 4), outline=5)
    c.restore()


OZZY = Character("c001-ozzy", "Ozzy Reyes", "circle", "#6B8FD6", "#4F70B5", attitude="shifty", arms="down", body=ozzy_body, face=ozzy_face, top=ozzy_top)


# ----- Rena Voss: visiting engineer from the investors ------------------------


def rena_body(c, ch, mood):
    # A dark blazer, and a lanyard with a visitor card.
    lapels(c, ch, "#3A2F55", "#2A2140", 292, open_w=20)
    for side in (-1, 1):
        c.drawLine(200 + side * 24, 282, 200 + side * 6, 330, pen(MUSTARD, 6))
    solid(c, rrect(180, 326, 220, 372, 5), WHITE, CREAM_DK, shadow=(4, 4), outline=5)
    c.drawRect(rect(184, 330, 216, 340), fill(CORAL))
    # Hair pulled back tight, parted on one side, clipped to her head.
    hair = skia.Path()
    hair.moveTo(110, 60)
    hair.lineTo(290, 60)
    hair.lineTo(290, 150)
    hair.quadTo(270, 108, 226, 104)
    hair.quadTo(190, 104, 172, 120)
    hair.quadTo(150, 112, 110, 140)
    hair.close()
    c.drawPath(hair, fill(HAIR_BLACK))
    curve(c, (226, 66), (222, 86), (226, 104), width=4, color=HAIR_BLACK_DK)


def rena_top(c, ch, mood):
    lift = -14 if mood == "shocked" else 0
    swing = {"shocked": -18, "cracked": 16, "nervous": 6}.get(mood, 0)
    # A high ponytail, swinging out to one side.
    tail = skia.Path()
    tail.moveTo(252, 78 + lift)
    tail.cubicTo(318, 52 + lift, 346, 120 + swing, 322, 200 + swing)
    tail.cubicTo(312, 158 + swing, 290, 116 + lift, 250, 100 + lift)
    tail.close()
    solid(c, tail, HAIR_BLACK, HAIR_BLACK_DK, shadow=(8, 4), outline=8)
    curve(c, (292, 92 + lift), (314, 120 + swing / 2), (318, 168 + swing), width=4, color=HAIR_BLACK_DK)
    solid(c, rrect(240, 74 + lift, 262, 104 + lift, 8), CORAL_DK, outline=6)
    # Small gold earrings.
    for x in (126, 274):
        c.drawCircle(x, 204, 7, fill(MUSTARD))
        c.drawCircle(x, 204, 7, pen(INK, 4))


RENA = Character("c001-rena", "Rena Voss", "rectangle", CORAL, CORAL_DK, attitude="calm", arms="folded", body=rena_body, top=rena_top, tags={"sleeve": "#3A2F55"})

CAST = [PRIYA, SQUIRES, OZZY, RENA]
