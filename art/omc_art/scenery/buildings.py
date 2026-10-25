"""Foreground buildings: roof styles, facade details, street lamps."""
import random

import skia

from ..marks import clock_hands, clock_ticks
from ..paint import col, fill, pen, solid
from ..palette import (BRICK, BRICK_DK, CORAL, CORAL_DK, CORAL_DKR, CREAM, CREAM_DK, DUSK, HAZE, INK,
                       MUSTARD, TEAL_DK, TEAL_DKR)
from ..shapes import oval, poly, rect, rrect
from .lights import lights_on
from .windows import windows

RAIL = "#4A5194"


def roof_antenna(c, x, w, top, mid, rng):
    ax = x + w * 0.62
    c.drawLine(ax, top, ax, top - 92, pen(INK, 6))
    c.drawLine(ax - 14, top - 60, ax + 14, top - 60, pen(INK, 4))
    c.drawLine(ax - 9, top - 76, ax + 9, top - 76, pen(INK, 4))
    c.drawCircle(ax, top - 96, 18, fill(CORAL, 60))
    c.drawCircle(ax, top - 96, 7, fill(CORAL))
    solid(c, rrect(x + 16, top - 24, x + 56, top + 4, 4), DUSK, outline=4)


def roof_water(c, x, w, top, mid, rng):
    for a, b in ((0.32, 0.37), (0.68, 0.63)):
        c.drawLine(x + w * a, top, x + w * b, top - 44, pen(INK, 6))
    c.drawLine(x + w * 0.34, top - 22, x + w * 0.66, top - 22, pen(INK, 4))
    solid(c, rrect(x + w * 0.27, top - 106, x + w * 0.73, top - 40, 8), CORAL_DK, CORAL_DKR,
          shadow=(10, 0), outline=5)
    for y in (top - 86, top - 62):
        c.drawLine(x + w * 0.27, y, x + w * 0.73, y, pen(INK, 3, 160))
    solid(c, poly([(x + w * 0.24, top - 102), (mid, top - 142), (x + w * 0.76, top - 102)], 6), DUSK, outline=5)


def roof_tri(c, x, w, top, mid, rng):
    solid(c, poly([(x - 2, top + 2), (mid, top - w * 0.42), (x + w + 2, top + 2)], 8), CORAL_DK, CORAL_DKR,
          shadow=(10, 6), outline=5)
    c.drawCircle(mid, top - w * 0.15, w * 0.07, fill(MUSTARD))
    c.drawCircle(mid, top - w * 0.15, w * 0.07, pen(INK, 3))


def roof_dome(c, x, w, top, mid, rng):
    r = (w - 24) / 2
    c.drawLine(mid, top - r, mid, top - r - 28, pen(INK, 5))
    c.drawCircle(mid, top - r - 30, 5, fill(MUSTARD))
    dome = skia.Path()
    dome.addArc(rect(x + 12, top - r, x + w - 12, top + r), 180, 180)
    dome.close()
    solid(c, dome, TEAL_DK, TEAL_DKR, shadow=(10, 4), outline=5)


def roof_step(c, x, w, top, mid, rng):
    c.drawLine(mid, top - 86, mid, top - 130, pen(INK, 5))
    c.drawCircle(mid, top - 134, 16, fill(CORAL, 60))
    c.drawCircle(mid, top - 134, 6, fill(CORAL))
    solid(c, rrect(x + 42, top - 86, x + w - 42, top - 36, 4), BRICK, BRICK_DK, shadow=(8, 0), outline=5)
    solid(c, rrect(x + 18, top - 46, x + w - 18, top + 6, 4), BRICK, BRICK_DK, shadow=(8, 0), outline=5)
    windows(c, rng, x + 26, top - 34, x + w - 26, top - 4, lit=0.4)


def roof_flat(c, x, w, top, mid, rng):
    solid(c, rrect(x + w - 62, top - 30, x + w - 18, top + 2, 4), DUSK, outline=4)
    c.drawCircle(x + w - 40, top - 14, 9, pen(INK, 3))


ROOFS = {
    "antenna": roof_antenna,
    "water": roof_water,
    "tri": roof_tri,
    "dome": roof_dome,
    "step": roof_step,
    "flat": roof_flat,
}


def facade_clock(c, mid, top):
    """Clock face on the facade, at 9:17. Returns where the windows start."""
    cy = top + 72
    solid(c, oval(mid, cy, 42), CREAM, CREAM_DK, shadow=(-5, -5), outline=5)
    clock_ticks(c, mid, cy, 36, 8, 5)
    clock_hands(c, mid, cy, 9, 17, 20, 30, 6, 4)
    c.drawCircle(mid, cy, 4, fill(INK))
    return top + 134


def fire_escape(c, x, w, top, ground):
    y = top + 64
    flip = False
    while y + 70 < ground - 20:
        c.drawLine(x + 14, y, x + w - 14, y, pen(RAIL, 5))
        c.drawLine(x + 14, y - 18, x + w - 14, y - 18, pen(RAIL, 3))
        for px in range(int(x + 14), int(x + w - 13), 20):
            c.drawLine(px, y, px, y - 18, pen(RAIL, 3))
        sx0, sx1 = (x + w - 34, x + 30) if flip else (x + 30, x + w - 34)
        c.drawLine(sx0, y, sx1, y + 70, pen(RAIL, 4))
        y += 70
        flip = not flip


def building(c, x, w, h, roof, seed, ground=440):
    rng = random.Random(seed)
    top = ground - h
    mid = x + w / 2
    if roof in ROOFS:
        ROOFS[roof](c, x, w, top, mid, rng)
    solid(c, rrect(x, top, x + w, ground + 20, 6), BRICK, BRICK_DK, shadow=(10, 0), outline=5)
    solid(c, rrect(x - 6, top - 4, x + w + 6, top + 12, 4), DUSK, outline=4)
    win_top = facade_clock(c, mid, top) if roof == "clock" else top + 30
    windows(c, rng, x + 14, win_top, x + w - 14, ground - 30, peekers=True)
    if roof == "fire":
        fire_escape(c, x, w, top, ground)


def streetlamp(c, x, ground):
    glow = skia.Paint(
        AntiAlias=True,
        Shader=skia.GradientShader.MakeRadial(skia.Point(x + 30, ground - 120), 96,
                                              [col(MUSTARD, 120), col(MUSTARD, 0)]),
    )
    if lights_on():
        c.drawCircle(x + 30, ground - 120, 96, glow)
    p = skia.Path()
    p.moveTo(x, ground)
    p.lineTo(x, ground - 124)
    p.quadTo(x, ground - 144, x + 20, ground - 144)
    p.lineTo(x + 30, ground - 144)
    c.drawPath(p, pen(INK, 9))
    c.drawCircle(x + 30, ground - 124, 10, fill(MUSTARD if lights_on() else HAZE))
    solid(c, poly([(x + 12, ground - 128), (x + 30, ground - 150), (x + 48, ground - 128)], 4), DUSK, outline=4)
    c.drawPath(rrect(x - 10, ground - 16, x + 10, ground, 4), fill(INK))
