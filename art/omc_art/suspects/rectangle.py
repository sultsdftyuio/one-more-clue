"""The rectangle: stern. Tall, fedora, glasses, moustache, arms crossed."""
import skia

from ..face import brow, eye, o_mouth
from ..marks import shock_lines
from ..paint import curve, fill, pen, solid
from ..palette import BRICK, CORAL, DUSK, INK, LILAC, LILAC_DK, OUTLINE
from ..shapes import minus, moved, poly, rect, rrect
from .body import arm, legs


def fedora(c):
    crown = poly([(150, 70), (160, 8), (240, 8), (250, 70)], 14)
    c.drawPath(crown, fill(DUSK))
    c.save()
    c.clipPath(crown, doAntiAlias=True)
    c.drawRect(rect(140, 44, 260, 66), fill(CORAL))
    c.drawPath(minus(crown, moved(crown, -12, 0)), fill(BRICK))
    c.restore()
    c.drawPath(crown, pen(INK, OUTLINE))
    curve(c, (182, 12), (200, 26), (218, 12), width=5)
    solid(c, rrect(92, 62, 308, 84, 11), DUSK, BRICK, shadow=(0, 6))


def glasses_and_moustache(c, shocked):
    for x in (172, 228):
        c.drawCircle(x, 168, 27, pen(INK, 6))
    curve(c, (196, 162), (200, 156), (204, 162), width=6)
    c.drawLine(145, 166, 126, 160, pen(INK, 6))
    c.drawLine(255, 166, 274, 160, pen(INK, 6))
    tache_y = 206 if shocked else 214
    for x, rot in ((184, -14), (216, 14)):
        c.save()
        c.rotate(rot, x, tache_y)
        c.drawOval(rect(x - 20, tache_y - 9, x + 20, tache_y + 9), fill(INK))
        c.restore()


def draw(c, mood):
    shocked = mood == "shocked"
    c.translate(0, 40)
    legs(c, (172, 228), 380)
    if shocked:
        arm(c, (128, 250), (94, 214), (88, 168))
        arm(c, (272, 250), (306, 214), (312, 168))
    shine = skia.Path()
    shine.moveTo(144, 104)
    shine.lineTo(144, 146)
    solid(c, rrect(124, 72, 276, 392, 26), LILAC, LILAC_DK, shine=shine)
    if shocked:
        c.save()
        c.translate(0, -34)
        c.rotate(-10, 200, 70)
        fedora(c)
        c.restore()
        eye(c, 172, 168, 22, 22, pupil=0.28)
        eye(c, 228, 168, 22, 22, pupil=0.28)
    else:
        fedora(c)
        solid(c, rrect(108, 268, 292, 304, 18), LILAC_DK, shadow=(0, 0))
        curve(c, (200, 272), (208, 286), (196, 300), width=6)
        eye(c, 172, 170, 17, 15, pupil=0.5, lid=0.32, lid_color=LILAC, lid_tilt=12)
        eye(c, 228, 170, 17, 15, pupil=0.5, lid=0.32, lid_color=LILAC, lid_tilt=-12)
    glasses_and_moustache(c, shocked)
    if shocked:
        brow(c, (146, 120), (190, 112), bend=6)
        brow(c, (210, 112), (254, 120), bend=6)
        o_mouth(c, 200, 246, 12, 16)
        shock_lines(c, 124, 150, (200, 222, 244), 18, 46)
        shock_lines(c, 276, 150, (-20, -42, -64), 18, 46)
    else:
        brow(c, (146, 128), (190, 140), bend=-2)
        brow(c, (210, 140), (254, 128), bend=-2)
        c.drawLine(190, 240, 210, 240, pen(INK, 6))
