"""Logo mark, app icon and the tileable confetti pattern."""
import math
import random

import skia

from .paint import fill, pen
from .palette import CORAL, INK, LILAC, MUSTARD, TEAL
from .props import magnifier
from .shapes import poly, rrect


def logo_mark(c):
    magnifier.draw(c, inner=magnifier.lens_eye)


def app_icon(c):
    c.drawPath(rrect(0, 0, 400, 400, 92), fill(INK))
    c.save()
    c.translate(200, 200)
    c.scale(0.8, 0.8)
    c.translate(-214, -214)
    logo_mark(c)
    c.restore()


def confetti_piece(c, kind, colour, s):
    if kind == "tri":
        c.drawPath(poly([(0, -s), (s * 0.9, s * 0.6), (-s * 0.9, s * 0.6)], 3), pen(colour, 5))
    elif kind == "ring":
        c.drawCircle(0, 0, s * 0.7, pen(colour, 5))
    elif kind == "plus":
        c.drawLine(-s * 0.7, 0, s * 0.7, 0, pen(colour, 6))
        c.drawLine(0, -s * 0.7, 0, s * 0.7, pen(colour, 6))
    elif kind == "squiggle":
        p = skia.Path()
        for i in range(25):
            t = i / 24
            px, py = -s * 1.4 + 2.8 * s * t, math.sin(t * math.pi * 3) * s * 0.35
            if i == 0:
                p.moveTo(px, py)
            else:
                p.lineTo(px, py)
        c.drawPath(p, pen(colour, 5))
    else:
        c.drawCircle(0, 0, s * 0.35, fill(colour))


def confetti(c, size=600):
    """Each piece is also drawn one tile over in every direction so the pattern wraps seamlessly."""
    rng = random.Random(21)
    colours = [MUSTARD, CORAL, TEAL, LILAC]
    for _ in range(26):
        x, y = rng.uniform(0, size), rng.uniform(0, size)
        kind = rng.choice(["tri", "ring", "plus", "squiggle", "dot"])
        colour = rng.choice(colours)
        angle = rng.uniform(0, 360)
        s = rng.uniform(10, 18)
        for dx in (-size, 0, size):
            for dy in (-size, 0, size):
                c.save()
                c.translate(x + dx, y + dy)
                c.rotate(angle)
                confetti_piece(c, kind, colour, s)
                c.restore()
