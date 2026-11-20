"""What the world painter still uses from Halden Hall: the pass switch, glows, two textures, a lamp and a tree.

Copied from art/mockups/dollhouse/halden.py, the Dollhouse mockup's 3D house. The world paints in the same
three passes: albedo (every surface as painted), light, and emission (lamps, screens, LEDs). MODE says which
of the two painted passes is drawing; in "emit" a piece draws only what glows. Left out: the 3D house itself
(its rooms, furniture, attic, camera, light map and plate) and the textures only it used.
"""
from __future__ import annotations

import math

import numpy as np
import skia

from cinema import dollhouse_film as D
from cinema.film import fill, linear, poly, radial, rrect  # noqa: F401  rrect is for world.py
from cinema.look import Look, finish  # noqa: F401  for world.py

PLUS = skia.BlendMode.kPlus
MODE = "albedo"


def A():
    return MODE == "albedo"


def glow(c, x, y, r, col, a=1.0):
    c.drawCircle(x, y, r, radial((x, y), r, [(0, col, a), (1, col, 0.0)], blend=PLUS))


def R(x0, y0, x1, y1):
    return skia.Rect.MakeLTRB(x0, y0, x1, y1)


D.MAKERS.update({
    "labfloor": lambda: D._tiles("#BFCBCF", "#CFD9DC", "#8E9A9E", 6, 79),
})


# ---------------------------------------------------------------------------
# The night around the building

def asphalt():
    rng = np.random.default_rng(91)
    n = rng.normal(0, 7, (D.N, D.N))
    return np.stack([34 + n, 36 + n, 46 + n], axis=2)


D.MAKERS["asphalt"] = asphalt


def street_lamp(c):
    if A():
        c.drawLine(0, 0, 0, -400, D.line(7.0, "#1B1F2A"))
        c.drawLine(0, -380, 26, -400, D.line(4.0, "#1B1F2A"))
        D.shape(c, poly([(14, -420), (40, -420), (46, -396), (8, -396)]), "#1B1F2A", 0.8)
        c.drawRect(R(12, -396, 42, -380), fill("#3A3020"))
    else:
        c.drawRect(R(12, -396, 42, -382), fill("#FFE2A0", 0.95))
        glow(c, 27, -388, 110, "#FFD58A", 0.6)
        c.drawPath(poly([(12, -384), (42, -384), (120, 0), (-70, 0)]), linear((0, -384), (0, 0), [(0, "#FFD58A", 0.22), (1, "#FFD58A", 0.0)], blend=PLUS))


def bare_tree(c):
    if not A():
        return
    def branch(x, y, ang, ln, wd, d):
        x2, y2 = x + math.sin(math.radians(ang)) * ln, y - math.cos(math.radians(ang)) * ln
        c.drawLine(x, y, x2, y2, D.line(wd, "#0E0F18"))
        if d:
            branch(x2, y2, ang - 24, ln * 0.72, wd * 0.66, d - 1)
            branch(x2, y2, ang + 20, ln * 0.7, wd * 0.66, d - 1)
    branch(0, 0, 0, 150, 16, 6)


# ---------------------------------------------------------------------------
# The light pass

def lhex(v):
    return "#%02X%02X%02X" % tuple(int(np.clip(x / 2.0 * 255, 0, 255)) for x in v)
