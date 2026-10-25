"""The two city layers: a hand-placed front street and a random far skyline."""
import random

from ..paint import fill, pen
from ..palette import CORAL, DUSK, HAZE, INK
from ..shapes import poly, rect
from .buildings import building, streetlamp
from .lights import lights_off, lights_on
from .windows import windows

FRONT_STREET = [  # x, width, height, roof
    (-20, 150, 250, "flat"),
    (118, 122, 330, "tri"),
    (228, 172, 210, "water"),
    (392, 112, 370, "antenna"),
    (494, 190, 280, "clock"),
    (676, 130, 230, "dome"),
    (796, 160, 350, "step"),
    (946, 122, 262, "tri"),
    (1058, 200, 300, "fire"),
    (1248, 120, 382, "antenna"),
    (1358, 150, 240, "dome"),
    (1498, 140, 320, "flat"),
]
LAMPS = (372, 990, 1440)


def city_front(c, w=1600, h=460):
    for i, (x, bw, bh, roof) in enumerate(FRONT_STREET):
        building(c, x, bw, bh, roof, seed=100 + i)
    for x in LAMPS:
        streetlamp(c, x, 440)
    c.drawRect(rect(0, 436, w, h), fill(INK))
    c.drawLine(0, 440, w, 440, pen(DUSK, 4))


def far_roof(c, roof, x, bw, top, mid):
    if roof == "tri":
        c.drawPath(poly([(x, top + 1), (mid, top - bw * 0.36), (x + bw, top + 1)], 6), fill(HAZE))
    elif roof == "dome":
        c.drawCircle(mid, top, bw / 2 - 12, fill(HAZE))
    elif roof == "antenna":
        c.drawLine(mid, top, mid, top - 70, pen(HAZE, 5))
        if lights_on():
            c.drawCircle(mid, top - 72, 4, fill(CORAL, 170))
    elif roof == "step":
        c.drawRect(rect(x + 22, top - 40, x + bw - 22, top + 1), fill(HAZE))


def city_back(c, w=1600, h=560):
    rng = random.Random(7)
    x = -30
    while x < w:
        bw = rng.uniform(80, 170)
        bh = rng.uniform(200, 470)
        top = h - bh
        roof = rng.choice(["flat", "flat", "tri", "dome", "antenna", "step"])
        far_roof(c, roof, x, bw, top, x + bw / 2)
        c.drawRect(rect(x, top, x + bw, h), fill(HAZE))
        windows(c, rng, x + 14, top + 22, x + bw - 14, h - 20, lit=0.12, coral=0.0, off="#30366A",
                outline=False, ww=12, wh=16)
        x += bw - rng.uniform(0, 14)


def city_front_dark(c, w=1600, h=460):
    """The front street during the 9:17 blackout: same buildings, every light out."""
    with lights_off():
        city_front(c, w, h)


def city_back_dark(c, w=1600, h=560):
    with lights_off():
        city_back(c, w, h)
