"""The triangle: nervous. Wide eyes, worried brows, sweating."""
import skia

from ..face import brow, eye, o_mouth, sweat, wobble_mouth
from ..marks import shock_lines
from ..paint import solid
from ..palette import CORAL, CORAL_DK
from ..shapes import poly
from .body import arm, legs


def draw(c, mood):
    shocked = mood == "shocked"
    c.translate(0, 40)
    legs(c, (162, 238), 370)
    if shocked:
        arm(c, (102, 300), (60, 270), (50, 222))
        arm(c, (298, 300), (340, 270), (350, 222))
    else:
        arm(c, (102, 300), (68, 318), (64, 354))
        arm(c, (298, 300), (332, 318), (336, 354))
    shine = skia.Path()
    shine.moveTo(194, 112)
    shine.quadTo(180, 136, 168, 166)
    solid(c, poly([(200, 60), (348, 392), (52, 392)], 38), CORAL, CORAL_DK, shine=shine)
    if shocked:
        eye(c, 170, 248, 26, 33, pupil=0.28)
        eye(c, 230, 248, 26, 33, pupil=0.28)
        brow(c, (146, 198), (186, 186), bend=8)
        brow(c, (214, 186), (254, 198), bend=8)
        o_mouth(c, 200, 322, 15, 20)
        sweat(c, 296, 180)
        sweat(c, 104, 196, 0.8)
        shock_lines(c, 200, 100, (-140, -90, -40), 72, 100)
    else:
        eye(c, 170, 250, 23, 28, look=(0.55, -0.2), pupil=0.36)
        eye(c, 230, 250, 23, 28, look=(0.55, -0.2), pupil=0.36)
        brow(c, (146, 214), (186, 200), bend=4)
        brow(c, (214, 200), (254, 214), bend=4)
        wobble_mouth(c, 176, 224, 318)
        sweat(c, 290, 196)
