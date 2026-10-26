"""The Season 1 triptych: one night panorama that runs through all three
cases, left to right: the KNHT radio station (Dead Air), Maison Lune (The
Last Course) and Pinecrest Lodge in the snow (Snowed In). Each third carries
its case's colour, so the three posters read as one set."""
import random

import skia

from ..paint import fill, pen, solid
from ..palette import (BRICK, BRICK_DK, CORAL, CREAM, DUSK, INK, LILAC, MOON, MUSTARD, NIGHT, STEEL,
                       TEAL, TEAL_DK, TEAL_DKR)
from ..shapes import minus, oval, poly, rect, rrect
from .common import backdrop, glow, lineup, sign_text, snow, soft, stars
from .snowed_in import SNOW, SNOW_DK, aurora, pine

TW, TH = 1800, 700
STREET = 600


def sky(c):
    backdrop(c, ["#0B0A22", NIGHT, "#262B5C"], TW, TH)
    glow(c, 300, 420, 520, CORAL, 46)
    glow(c, 900, 420, 520, TEAL, 40)
    glow(c, 1500, 420, 520, LILAC, 56)
    stars(c, 501, 260, 0, 0, TW, 380, sparkles=10, colours=(CREAM, MUSTARD, LILAC))
    glow(c, 900, 110, 150, MOON, 70)
    c.drawPath(oval(900, 110, 46), fill(MOON))


def radio_station(c):
    """KNHT 99.1: a low studio block and a lattice transmitter mast with blinking beacons."""
    mx, top = 150, 90
    for side in (-1, 1):
        c.drawLine(mx + side * 60, STREET - 120, mx + side * 6, top, pen(INK, 7))
    for i in range(11):
        y0 = top + 20 + i * 36
        w0 = 6 + (y0 - top) / (STREET - 120 - top) * 54
        w1 = 6 + (y0 + 36 - top) / (STREET - 120 - top) * 54
        c.drawLine(mx - w0, y0, mx + w1, y0 + 36, pen(INK, 4))
        c.drawLine(mx + w0, y0, mx - w1, y0 + 36, pen(INK, 4))
    for y in (top, top + 140, top + 280):
        glow(c, mx, y, 40, CORAL, 150)
        c.drawCircle(mx, y, 8, fill(CORAL))
    solid(c, rrect(40, 380, 470, STREET + 20, 8), BRICK, BRICK_DK, shadow=(12, 0), outline=7)
    solid(c, rrect(32, 372, 478, 394, 6), DUSK, outline=5)
    # Sign on the roof.
    solid(c, rrect(220, 300, 430, 366, 10), INK, outline=6)
    sign_text(c, "99.1", 325, 352, 44, CORAL)
    c.drawPath(rrect(226, 306, 424, 360, 8), soft(CORAL, 60, 10))
    for x in (250, 400):
        c.drawLine(x, 366, x, 374, pen(INK, 6))
    # Studio windows, one with its blind down.
    for i, x in enumerate((70, 170, 270, 370)):
        lit = i != 2
        c.drawPath(rrect(x, 430, x + 72, 500, 6), fill(CORAL if lit else NIGHT, 200 if lit else 255))
        if not lit:
            for y in range(434, 486, 10):
                c.drawLine(x + 4, y, x + 68, y, pen(STEEL, 5, 200))
        c.drawPath(rrect(x, 430, x + 72, 500, 6), pen(INK, 5))
    solid(c, rrect(206, 524, 282, STREET + 2, 6), DUSK, outline=5)


def bistro(c):
    """Maison Lune: a teal awning, arched windows in candlelight and a crescent-moon sign."""
    l, r, top = 640, 1170, 300
    solid(c, rrect(l, top, r, STREET + 20, 8), "#16424A", "#103239", shadow=(12, 0), outline=7)
    solid(c, rrect(l - 10, top - 10, r + 10, top + 14, 6), TEAL_DKR, outline=5)
    # The sign: a crescent moon.
    glow(c, 905, top + 70, 80, MOON, 110)
    crescent = minus(oval(905, top + 70, 40), oval(922, top + 60, 36))
    c.drawPath(crescent, fill(MOON))
    c.drawPath(crescent, pen(INK, 4))
    # Arched windows glowing.
    for x in (676, 800, 952, 1076):
        glow(c, x + 30, 470, 90, MUSTARD, 90)
        arch = skia.Path()
        arch.moveTo(x, 520)
        arch.lineTo(x, 440)
        arch.arcTo(skia.Rect.MakeLTRB(x, 410, x + 60, 470), 180, 180, False)
        arch.lineTo(x + 60, 520)
        arch.close()
        c.drawPath(arch, fill(MUSTARD))
        c.drawCircle(x + 30, 500, 5, fill(CORAL))
        c.drawLine(x + 30, 410, x + 30, 520, pen(INK, 4))
        c.drawPath(arch, pen(INK, 5))
    # Awning over the door.
    l2, r2, y = 852, 958, 380
    for i in range(6):
        x0 = l2 + i * (r2 - l2) / 6
        c.drawPath(poly([(x0, y), (x0 + (r2 - l2) / 6, y), (x0 + (r2 - l2) / 6 + 6, y + 40), (x0 + 6, y + 40)]),
                   fill(TEAL if i % 2 else CREAM))
    c.drawPath(poly([(l2, y), (r2, y), (r2 + 6, y + 40), (l2 + 6, y + 40)]), pen(INK, 5))
    solid(c, rrect(866, 430, 950, STREET + 2, 6), TEAL_DK, outline=5)
    c.drawCircle(936, 520, 5, fill(MUSTARD))


def street(c):
    """Pavement that gives way to snow drifts on the right."""
    c.drawRect(rect(0, STREET, TW, TH), fill(INK))
    c.drawRect(rect(0, STREET, TW, STREET + 10), fill(DUSK))
    for x in range(30, 1250, 120):
        c.drawPath(rrect(x, STREET + 56, x + 60, STREET + 62, 3), fill(STEEL, 40))
    drift = skia.Path()
    drift.moveTo(1150, TH + 10)
    drift.quadTo(1190, STREET + 6, 1330, STREET - 22)
    drift.quadTo(1560, STREET - 44, TW + 20, STREET - 30)
    drift.lineTo(TW + 20, TH + 10)
    drift.close()
    solid(c, drift, SNOW, SNOW_DK, shadow=(0, -16), outline=7)


def lodge(c):
    """Pinecrest Lodge, small, with one candle-lit window."""
    base = STREET - 30
    solid(c, rrect(1440, base - 120, 1660, base + 10, 6), BRICK, BRICK_DK, shadow=(10, 0), outline=6)
    roof = poly([(1416, base - 104), (1550, base - 240), (1684, base - 104)], 8)
    solid(c, roof, DUSK, NIGHT, shadow=(10, 0), outline=6)
    cap = poly([(1416, base - 104), (1550, base - 240), (1684, base - 104), (1640, base - 98), (1600, base - 110),
                (1550, base - 96), (1500, base - 110), (1460, base - 98)], 5)
    c.drawPath(cap, fill(SNOW))
    c.drawPath(cap, pen(INK, 5))
    for x, lit in ((1466, False), (1520, False), (1590, True)):
        if lit:
            glow(c, x + 22, base - 50, 70, MUSTARD, 140)
        c.drawPath(rrect(x, base - 76, x + 44, base - 26, 5), fill(MUSTARD if lit else NIGHT))
        c.drawPath(rrect(x, base - 76, x + 44, base - 26, 5), pen(INK, 4))


def lamps(c):
    for x in (520, 1210):
        glow(c, x + 24, STREET - 150, 100, MUSTARD, 90)
        p = skia.Path()
        p.moveTo(x, STREET)
        p.lineTo(x, STREET - 150)
        p.quadTo(x, STREET - 170, x + 20, STREET - 170)
        p.lineTo(x + 26, STREET - 170)
        c.drawPath(p, pen(INK, 8))
        c.drawCircle(x + 26, STREET - 152, 9, fill(MUSTARD))
        solid(c, poly([(x + 10, STREET - 156), (x + 26, STREET - 176), (x + 42, STREET - 156)], 4), DUSK, outline=4)


def draw(c):
    sky(c)
    c.save()
    c.clipRect(rect(1100, 0, TW, 420))
    c.translate(1200, 0)
    aurora(c)
    c.restore()
    radio_station(c)
    bistro(c)
    for x, h in ((1300, 200), (1380, 150), (1720, 220), (1770, 160)):
        pine(c, x, STREET - 20, h)
    lodge(c)
    street(c)
    lamps(c)
    lineup(c, 900, TH - 14, 150, TEAL, gap=0.62)
    # Snow only falls over the lodge, thickening to the right.
    rng = random.Random(502)
    for _ in range(140):
        x = 1150 + (rng.random() ** 0.6) * 650
        y = rng.uniform(0, TH)
        c.drawCircle(x, y, rng.uniform(1.2, 3), fill(CREAM, rng.randint(120, 220)))
    snow(c, 503, 30, 1500, 0, TW, TH)
