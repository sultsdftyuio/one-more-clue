"""The square: smug. Half-lidded eyes, one raised brow, bow tie, hands on hips."""
import skia

from ..face import brow, eye, o_mouth
from ..marks import shock_lines
from ..paint import curve, pen, solid
from ..palette import CORAL, CORAL_DK, INK, MUSTARD, MUSTARD_DK
from ..shapes import poly, rrect
from .body import arm, legs


def bow_tie(c):
    solid(c, poly([(200, 345), (160, 324), (160, 366)], 8), CORAL, CORAL_DK, shadow=(6, 6), outline=6)
    solid(c, poly([(200, 345), (240, 324), (240, 366)], 8), CORAL, CORAL_DK, shadow=(6, 6), outline=6)
    solid(c, rrect(188, 333, 212, 357, 8), CORAL_DK, outline=6)


def draw(c, mood):
    shocked = mood == "shocked"
    c.translate(0, 40)
    legs(c, (160, 240), 360)
    if shocked:
        arm(c, (90, 262), (52, 232), (46, 188))
        arm(c, (310, 262), (348, 232), (354, 188))
    else:
        akimbo = skia.Path()
        akimbo.moveTo(90, 258)
        akimbo.lineTo(52, 298)
        akimbo.lineTo(90, 338)
        akimbo.moveTo(310, 258)
        akimbo.lineTo(348, 298)
        akimbo.lineTo(310, 338)
        c.drawPath(akimbo, pen(INK, 11))
    shine = skia.Path()
    shine.moveTo(106, 204)
    shine.quadTo(106, 152, 152, 150)
    solid(c, rrect(84, 128, 316, 372, 30), MUSTARD, MUSTARD_DK, shine=shine)
    bow_tie(c)
    if shocked:
        eye(c, 160, 224, 28, 30, pupil=0.3)
        eye(c, 240, 224, 28, 30, pupil=0.3)
        brow(c, (134, 172), (184, 178), bend=8)
        brow(c, (216, 178), (266, 172), bend=8)
        o_mouth(c, 200, 300, 18, 22)
        shock_lines(c, 200, 140, (-140, -90, -40), 40, 70)
    else:
        eye(c, 160, 226, 27, 24, look=(0.55, 0.15), pupil=0.45, lid=0.48, lid_color=MUSTARD)
        eye(c, 240, 226, 27, 24, look=(0.55, 0.15), pupil=0.45, lid=0.48, lid_color=MUSTARD)
        brow(c, (134, 188), (184, 194), bend=2)
        brow(c, (216, 182), (266, 174), bend=14)
        curve(c, (172, 296), (214, 316), (244, 284), width=8)
        curve(c, (244, 284), (252, 282), (254, 274), width=6)
