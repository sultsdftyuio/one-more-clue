"""Case 003, The Last Course: Maison Lune, a restaurant on its big night."""
import skia

from ..paint import curve, fill, pen, solid
from ..palette import CORAL, CORAL_DK, CREAM, CREAM_DK, INK, MUSTARD, TEAL, TEAL_DK, WHITE
from ..shapes import box, intersect, oval, poly, rect, rrect
from .base import Character, blush, collar, lapels
from .colors import (
    BLUE, BLUE_DK, BURGUNDY, BURGUNDY_DK, HAIR_BLACK, HAIR_BLACK_DK, HAIR_GINGER, HAIR_GINGER_DK, NAVY, SAND,
    SAND_DK, SILVER,
)


# ----- Amélie Duret: head chef, a perfectionist --------------------------------------


def amelie_body(c, ch, mood):
    # Chef's whites: a double-breasted jacket with two rows of buttons, and a red neckerchief.
    c.drawPath(box(0, 330, 400, 420), fill(WHITE))
    c.drawLine(0, 330, 400, 330, pen(INK, 6))
    for x in (170, 230):
        for y in (352, 378):
            c.drawCircle(x, y, 6, fill(INK))
    # A red neckerchief, knotted at the side.
    c.drawPath(box(0, 330, 400, 340), fill(CORAL))
    solid(c, oval(252, 340, 13, 10), CORAL, CORAL_DK, shadow=(0, 3), outline=5)
    for dx in (-8, 8):
        solid(c, poly([(252, 346), (252 + dx, 372), (252 + dx * 2.4, 366)], 4), CORAL, CORAL_DK, shadow=(0, 3), outline=5)
    # Dark hair, tucked away under the hat.
    c.drawPath(box(0, 0, 400, 150), fill(HAIR_BLACK))
    curve(c, (150, 150), (176, 170), (200, 150), width=0)


def amelie_top(c, ch, mood):
    lift = -22 if mood == "shocked" else 0
    y = 108 + lift
    # A tall pleated toque.
    puff = skia.Path()
    for cx, cy, r in ((160, y - 50, 40), (200, y - 74, 46), (240, y - 50, 40), (200, y - 34, 44)):
        puff.addCircle(cx, cy, r)
    puff = skia.Op(puff, rrect(152, y - 30, 248, y + 22, 6), skia.PathOp.kUnion_PathOp)
    solid(c, puff, WHITE, CREAM_DK, shadow=(10, 6), outline=8)
    for x in (180, 200, 220):
        c.drawLine(x, y - 26, x, y + 16, pen(CREAM_DK, 4))
    c.drawLine(156, y - 6, 244, y - 6, pen(INK, 5))


AMELIE = Character("c003-amelie", "Amélie Duret", "triangle", TEAL, TEAL_DK, attitude="stern", arms="akimbo", body=amelie_body, top=amelie_top)


# ----- Bertrand Carré: the owner, tastes the chocolate course every night ---------------


def bertrand_body(c, ch, mood):
    c.drawPath(poly([(160, 316), (240, 316), (200, 400)], 2), fill(WHITE))
    c.drawPath(poly([(190, 330), (210, 330), (204, 400), (196, 400)], 2), fill(INK))
    lapels(c, ch, "#3A2F55", "#2A2140", 330, open_w=22)
    solid(c, poly([(254, 344), (284, 340), (282, 356), (256, 358)], 3), CORAL, CORAL_DK, shadow=(0, 0), outline=5)
    # Slicked-back hair with comb lines.
    c.drawPath(box(0, 0, 400, 158), fill(HAIR_BLACK))
    for x in (120, 160, 200, 240, 280):
        curve(c, (x - 10, 150), (x - 4, 132), (x + 8, 128), width=4, color="#4A3B5C")


def bertrand_face(c, ch, mood):
    # A waxed moustache with curled tips.
    mx, my = ch.s.mouth
    y = my - 18
    for side in (-1, 1):
        p = skia.Path()
        p.moveTo(mx, y)
        p.cubicTo(mx + side * 20, y - 12, mx + side * 44, y - 4, mx + side * 50, y - 20)
        p.cubicTo(mx + side * 58, y - 8, mx + side * 44, y + 10, mx, y + 6)
        p.close()
        solid(c, p, HAIR_BLACK, HAIR_BLACK_DK, shadow=(0, 4), outline=6)


BERTRAND = Character("c003-bertrand", "Bertrand Carré", "square", SAND, SAND_DK, attitude="smug", arms="behind", body=bertrand_body, face=bertrand_face, mouth_drop=6)


# ----- Olu Bello: sommelier, wine and charm -----------------------------------------------


def olu_body(c, ch, mood):
    # A waistcoat, a silver tasting cup on a chain.
    lapels(c, ch, INK, "#000000", 340, open_w=40)
    p = skia.Path()
    p.moveTo(150, 300)
    p.quadTo(200, 372, 250, 300)
    c.drawPath(p, pen(SILVER, 5))
    solid(c, oval(200, 362, 22, 12), SILVER, "#A9AFC4", shadow=(0, 5), outline=6)
    curve(c, (186, 358), (200, 352), (214, 358), width=3, color=WHITE)


def olu_top(c, ch, mood):
    lift = -20 if mood == "shocked" else 0
    # A neat high-top fade.
    c.save()
    c.translate(0, lift)
    # Close-cropped hair with a sharp line-up.
    cap = intersect(oval(200, 254, 139), box(0, 0, 400, 176))
    solid(c, cap, HAIR_BLACK, HAIR_BLACK_DK, shadow=(8, 6), outline=8)
    import random

    rnd = random.Random(3)
    for _ in range(40):
        x, y = rnd.uniform(110, 290), rnd.uniform(130, 170)
        c.drawCircle(x, y, 2, fill("#4A3B5C"))
    c.restore()
    # A small bow tie at the collar.
    mx, my = ch.s.mouth


def olu_face(c, ch, mood):
    blush(c, ch, mood, colour="#7A2E3E", alpha=80)


OLU = Character("c003-olu", "Olu Bello", "circle", BURGUNDY, BURGUNDY_DK, attitude="cheerful", arms="down", body=olu_body, face=olu_face, top=olu_top)


# ----- Ruth Vale: pastry chef, twelve years of desserts -----------------------------------


def ruth_body(c, ch, mood):
    # A white apron with straps, and curls peeking out under the scarf.
    c.drawPath(rrect(140, 270, 260, 420, 10), fill(WHITE))
    c.drawPath(rrect(140, 270, 260, 420, 10), pen(INK, 6))
    for x in (148, 252):
        c.drawLine(x, 270, x - 10 if x < 200 else x + 10, 200, pen(WHITE, 10))
    solid(c, rrect(170, 316, 230, 344, 6), CREAM, CREAM_DK, shadow=(0, 0), outline=5)
    for x, y in ((128, 132), (272, 132), (130, 156), (270, 156)):
        c.drawCircle(x, y, 12, fill(HAIR_GINGER))
        c.drawCircle(x, y, 12, pen(INK, 5))


def ruth_face(c, ch, mood):
    # A smudge of flour on her cheek.
    (lx, ey), _ = ch.s.eyes
    c.drawOval(rect(lx - 26, ey + 30, lx + 4, ey + 44), fill(WHITE, 220))


def ruth_top(c, ch, mood):
    lift = -10 if mood == "shocked" else 0
    # A headscarf, knotted on top.
    scarf = rrect(116, 62 + lift, 284, 122 + lift, 26)
    solid(c, scarf, CORAL, CORAL_DK, shadow=(0, 8), outline=8)
    for x in (150, 186, 222, 258):
        c.drawCircle(x, 92 + lift, 5, fill(WHITE))
    for side in (-1, 1):
        ear = poly([(200, 64 + lift), (200 + side * 46, 28 + lift), (200 + side * 40, 72 + lift)], 8)
        solid(c, ear, CORAL, CORAL_DK, shadow=(0, 4), outline=7)
    solid(c, oval(200, 62 + lift, 14, 12), CORAL_DK, outline=6)


RUTH = Character("c003-ruth", "Ruth Vale", "rectangle", BLUE, BLUE_DK, attitude="tired", arms="down", body=ruth_body, face=ruth_face, top=ruth_top)

CAST = [AMELIE, BERTRAND, OLU, RUTH]
