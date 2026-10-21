"""Starry sky gradient, moon and clouds."""
import random

import skia

from ..paint import col, fill
from ..palette import CREAM, MOON, MOON_DK, MUSTARD, NIGHT
from ..shapes import minus, moved, oval, rect, rrect, sparkle_path, union

CLOUDS = {  # blobs as (cx, cy, r), base pill as (l, t, r, b)
    "a": ([(170, 150, 62), (270, 108, 88), (382, 134, 70), (472, 160, 48)], (90, 150, 524, 206)),
    "b": ([(120, 120, 46), (190, 92, 62), (262, 120, 44)], (60, 116, 316, 160)),
}


def sky(c, w=1600, h=900):
    paint = skia.Paint(
        AntiAlias=True,
        Shader=skia.GradientShader.MakeLinear(
            points=[(0, 0), (0, h)],
            colors=[col(NIGHT), col("#202550"), col("#2E3466")],
            positions=[0, 0.6, 1],
        ),
    )
    c.drawRect(rect(0, 0, w, h), paint)
    rng = random.Random(11)
    for _ in range(170):
        x, y = rng.uniform(0, w), rng.uniform(0, h * 0.75)
        c.drawCircle(x, y, rng.uniform(0.8, 2.2), fill(CREAM, rng.randint(90, 220)))
    for _ in range(16):
        x, y = rng.uniform(20, w - 20), rng.uniform(20, h * 0.6)
        c.drawPath(sparkle_path(x, y, rng.uniform(5, 11)), fill(rng.choice([CREAM, MUSTARD]), 230))


def moon(c):
    cx = cy = 200
    for r, a in ((196, 16), (168, 26), (142, 40)):
        c.drawCircle(cx, cy, r, fill(MUSTARD, a))
    m = oval(cx, cy, 118)
    c.drawPath(m, fill(MOON))
    c.save()
    c.clipPath(m, doAntiAlias=True)
    c.drawPath(minus(m, moved(m, -26, -20)), fill(MOON_DK))
    for x, y, r in ((160, 160, 24), (240, 148, 14), (212, 236, 30), (146, 240, 12), (264, 212, 10)):
        c.drawCircle(x, y, r, fill(MOON_DK))
        c.drawCircle(x + r * 0.2, y + r * 0.2, r * 0.82, fill(MOON))
    c.restore()


def cloud(c, variant):
    blobs, base = CLOUDS[variant]
    shape = rrect(*base, (base[3] - base[1]) / 2)
    for b in blobs:
        shape = union(shape, oval(*b))
    c.drawPath(shape, fill("#363C74"))
    c.drawPath(minus(shape, moved(shape, 0, 14)), fill("#4A5194"))
    c.drawPath(minus(shape, moved(shape, 0, -12)), fill("#2C3166"))
