"""The rainy skyline and the wall clock from Case 001's opening film, which the evidence photos reuse.

Copied from omc_cinema/case001.py in the one-more-clue-videos repo (last changed there in 2597bf2,
2026-11-16), keeping `campus_view`, `rain_streaks` and `clock`. Left out: the rest of the film (its set,
laptop, typing, camera moves, sound and voice).
"""
from __future__ import annotations

import math

import skia
from omc_art.palette import CORAL, CREAM, INK, MUSTARD

from .film import ease_out, fill, glow, linear, noise1, span, stroke

OUTLINE = 10


# ---------------------------------------------------------------------------
# The set

def campus_view(c, t):
    """Far layer: the campus at night through the rain, mostly glow and silhouettes."""
    c.drawRect(skia.Rect.MakeLTRB(-300, -300, 1400, 1500), linear((0, 100), (0, 1150), [(0, "#070A1F", 1), (0.7, "#1A1F4A", 1), (1, "#3A2C4E", 1)]))
    # Far buildings, then nearer ones, each with a few lit windows.
    for row, (base, tone, seed) in enumerate(((930, "#0D1030", 3), (1010, "#090B22", 7))):
        x = -260
        k = seed
        while x < 1300:
            k = (k * 1103515245 + 12345) & 0x7FFFFFFF
            w = 90 + k % 120
            h = 160 + (k >> 8) % 260 - row * 60
            c.drawRect(skia.Rect.MakeLTRB(x, base - h, x + w, base + 600), fill(tone))
            for wy in range(int(base - h + 24), base - 20, 34):
                for wx in range(int(x + 14), int(x + w - 14), 26):
                    k = (k * 1103515245 + 12345) & 0x7FFFFFFF
                    if k % 7 == 0:
                        c.drawRect(skia.Rect.MakeXYWH(wx, wy, 12, 16), fill(MUSTARD if k % 3 else "#7FD3CB", 0.75))
            x += w + 18
    # Street lamps, as soft bokeh.
    for i, (bx, by, r) in enumerate(((140, 990, 46), (420, 1010, 34), (760, 985, 52), (980, 1015, 30))):
        flick = 0.85 + 0.15 * noise1(t * 3, i)
        glow(c, (bx, by), r * 2.2, MUSTARD, 0.35 * flick, blend=skia.BlendMode.kSrcOver)
        c.drawCircle(bx, by, r * 0.5, fill("#FFE2A0", 0.9))


def rain_streaks(c, t):
    """Rain falling past the window: long thin streaks, fast."""
    paint = stroke("#A9BCFF", 2.2, 0.22)
    for i in range(140):
        x0 = (i * 97.3) % 1400 - 200
        speed = 1900 + (i * 37) % 900
        y0 = ((i * 151.7) + t * speed) % 1500 - 300
        c.drawLine(x0, y0, x0 - 22, y0 + 90, paint)


def clock(c, t, x, y, r, minute=12, second0=41):
    """The wall clock at 9:<minute>. The second hand ticks on every whole second."""
    c.drawCircle(x, y + 10, r + 8, fill("#000000", 0.35))
    c.drawCircle(x, y, r, fill(CREAM))
    c.drawCircle(x, y, r, stroke(INK, OUTLINE))
    for i in range(60):
        a = math.radians(i * 6)
        long_ = i % 5 == 0
        r0 = r - (26 if long_ else 14)
        c.drawLine(x + math.sin(a) * r0, y - math.cos(a) * r0, x + math.sin(a) * (r - 10), y - math.cos(a) * (r - 10),
                   stroke(INK, 7 if long_ else 3))

    def hand(angle_deg, length, width, colour):
        a = math.radians(angle_deg)
        c.drawLine(x - math.sin(a) * 16, y + math.cos(a) * 16, x + math.sin(a) * length, y - math.cos(a) * length, stroke(colour, width))

    seconds_ = second0 + math.floor(t)
    tick = ease_out(span(t - math.floor(t), 0, 0.12), 4)  # a quick, slightly springy tick
    sec_angle = (seconds_ - 1 + tick) * 6
    hand((9 + minute / 60) * 30, r * 0.5, 13, INK)
    hand((minute + seconds_ / 60) * 6, r * 0.75, 9, INK)
    hand(sec_angle, r * 0.84, 4, CORAL)
    c.drawCircle(x, y, 9, fill(CORAL))
