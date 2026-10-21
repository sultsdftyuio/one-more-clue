"""The circle: shifty. Side-eye, low lids, beanie, hands in pockets."""
import skia

from ..face import brow, eye, o_mouth
from ..marks import shock_lines
from ..paint import curve, fill, pen, solid
from ..palette import CORAL, CORAL_DK, CREAM, CREAM_DK, INK, OUTLINE, TEAL, TEAL_DK
from ..shapes import box, intersect, oval, rect, rrect
from .body import arm, legs


def beanie(c):
    cap = intersect(oval(200, 256, 142), box(0, 0, 400, 178))
    c.drawPath(cap, fill(CORAL))
    c.save()
    c.clipPath(cap, doAntiAlias=True)
    for x in range(90, 320, 22):
        c.drawLine(x, 100, x, 180, pen(CORAL_DK, 5))
    c.restore()
    c.drawPath(cap, pen(INK, OUTLINE))
    solid(c, rrect(76, 158, 324, 194, 17), CORAL, CORAL_DK, shadow=(0, 8))
    solid(c, oval(200, 108, 24), CREAM, CREAM_DK, shadow=(6, 6), outline=7)


def draw(c, mood):
    shocked = mood == "shocked"
    c.translate(0, 40)
    legs(c, (166, 234), 372)
    if shocked:
        arm(c, (72, 290), (40, 252), (40, 206))
        arm(c, (328, 290), (360, 252), (360, 206))
    shine = skia.Path()
    shine.addArc(rect(88, 144, 312, 368), 190, 34)
    solid(c, oval(200, 256, 136), TEAL, TEAL_DK, shine=shine)
    beanie(c)
    if shocked:
        eye(c, 166, 250, 26, 28, pupil=0.28)
        eye(c, 234, 250, 26, 28, pupil=0.28)
        brow(c, (140, 212), (186, 206), bend=6)
        brow(c, (214, 206), (260, 212), bend=6)
        o_mouth(c, 200, 322, 16, 20)
        shock_lines(c, 200, 150, (-150, -30), 120, 150)
        shock_lines(c, 200, 150, (-165, -15), 132, 160)
    else:
        eye(c, 166, 250, 24, 22, look=(-0.9, 0.15), lid=0.38, lid_color=TEAL, lid_tilt=8)
        eye(c, 234, 250, 24, 22, look=(-0.9, 0.15), lid=0.38, lid_color=TEAL, lid_tilt=-8)
        brow(c, (140, 214), (186, 222), bend=2)
        brow(c, (214, 222), (260, 214), bend=2)
        curve(c, (178, 318), (200, 315), (224, 308))
