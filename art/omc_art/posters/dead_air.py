"""Case 002, Dead Air: Studio A at 11:58. The ON AIR light is dead, the
waveform flatlines, the jackpot envelope is empty, and the four suspects
watch from behind the control-room glass."""
import math
import random

import skia

from ..paint import fill, pen, solid
from ..palette import (CORAL, CORAL_DK, CORAL_DKR, CREAM, CREAM_DK, DUSK, INK, MUSTARD, NIGHT, STEEL, TEAL,
                       TEAL_DK)
from ..shapes import oval, poly, rect, rrect
from .common import H, W, backdrop, glow, lineup, sign_text, soft, stars

WINE = "#3A1A3C"
PANEL = "#2C1D44"
PANEL_DK = "#22163A"
DESK = "#241B3F"


def foam_wall(c):
    """Acoustic panels on the studio wall."""
    for row in range(5):
        for cl in range(4):
            x, y = 14 + cl * 146, 300 + row * 92
            c.drawPath(rrect(x, y, x + 136, y + 82, 10), fill(PANEL))
            for i in range(4):
                c.drawLine(x + 16 + i * 32, y + 12, x + 16 + i * 32, y + 70, pen(PANEL_DK, 10))


def control_window(c):
    """The control-room glass, blind half down, with the suspects behind it."""
    l, t, r, b = 40, 316, 340, 520
    c.drawPath(rrect(l, t, r, b, 12), fill("#1A1430"))
    c.save()
    c.clipPath(rrect(l, t, r, b, 12), doAntiAlias=True)
    glow(c, 190, 470, 220, CORAL, 70)
    lineup(c, 190, 590, 200, CORAL, gap=0.6)
    # The blind, lowered most of the way.
    for y in range(t, t + 92, 13):
        c.drawPath(rrect(l - 4, y, r + 4, y + 10, 3), fill(STEEL, 215))
        c.drawLine(l, y + 10, r, y + 10, pen(INK, 2, 120))
    c.drawLine(l + 40, t, l + 40, t + 100, pen(INK, 2))
    # Reflection on the glass.
    p = skia.Path()
    p.moveTo(r - 90, t)
    p.lineTo(r - 40, t)
    p.lineTo(r - 150, b)
    p.lineTo(r - 200, b)
    p.close()
    c.drawPath(p, fill(CREAM, 22))
    c.restore()
    c.drawPath(rrect(l, t, r, b, 12), pen(INK, 9))
    c.drawPath(rrect(l - 8, t - 8, r + 8, b + 8, 16), pen(DUSK, 6))


def on_air(c):
    """The ON AIR sign, dead and cracked."""
    x, y = 470, 360
    c.drawLine(x - 40, 300, x - 40, y - 34, pen(INK, 5))
    c.drawLine(x + 40, 300, x + 40, y - 34, pen(INK, 5))
    solid(c, rrect(x - 84, y - 36, x + 84, y + 36, 12), "#2A1430", outline=7)
    c.drawPath(rrect(x - 70, y - 24, x + 70, y + 24, 8), fill(CORAL_DKR, 90))
    sign_text(c, "ON AIR", x, y + 13, 34, CORAL, 70)
    crack = skia.Path()
    crack.moveTo(x + 20, y - 24)
    for px, py in ((x + 8, y - 6), (x + 22, y + 4), (x + 6, y + 24)):
        crack.lineTo(px, py)
    c.drawPath(crack, pen(CREAM, 3, 150))


def microphone(c):
    """A broadcast mic on its arm, lit from below by the desk."""
    glow(c, 360, 620, 200, CORAL, 90)
    # Arm from the top right.
    for width, colour in ((14, INK), (6, DUSK)):
        arm = skia.Path()
        arm.moveTo(610, 470)
        arm.lineTo(500, 556)
        arm.lineTo(446, 636)
        c.drawPath(arm, pen(colour, width))
    # Shock mount ring.
    c.drawPath(oval(360, 640, 86, 26), pen(INK, 10))
    body = rrect(312, 520, 408, 720, 48)
    c.drawPath(rrect(318, 528, 418, 730, 48), soft(INK, 160, 10))
    solid(c, body, STEEL, "#9CA3CC", shadow=(16, 0), outline=8)
    c.save()
    c.clipPath(rrect(312, 520, 408, 610, 48), doAntiAlias=True)
    c.drawRect(rect(312, 520, 408, 610), fill("#3A3F6E"))
    for i in range(10):
        c.drawLine(312, 528 + i * 9, 408, 528 + i * 9, pen(INK, 2.5, 160))
    for i in range(8):
        c.drawLine(320 + i * 12, 520, 320 + i * 12, 610, pen(INK, 2, 110))
    c.restore()
    c.drawPath(rrect(312, 520, 408, 720, 48), pen(INK, 8))
    solid(c, rrect(306, 604, 414, 624, 6), CORAL, CORAL_DK, shadow=(6, 0), outline=5)
    c.drawPath(oval(360, 640, 86, 26), pen(INK, 10))
    c.drawPath(oval(360, 640, 86, 26), pen(DUSK, 4))


def waveform(c):
    """Live audio that drops dead in the middle: nine minutes of silence."""
    y = 788
    p = skia.Path()
    rng = random.Random(4)
    for i in range(0, 601, 4):
        if 200 < i < 420:
            amp = 0
        else:
            fade = min(1, abs(i - 310) / 140)
            amp = (12 + rng.random() * 26) * fade * abs(math.sin(i * 0.21))
        pts = (i, y - amp) if (i // 4) % 2 else (i, y + amp)
        if i == 0:
            p.moveTo(*pts)
        else:
            p.lineTo(*pts)
    c.drawPath(p, soft(TEAL, 140, 6))
    c.drawPath(p, pen(TEAL, 4))
    c.drawLine(204, y, 416, y, pen(CORAL, 5))
    c.drawLine(204, y, 416, y, soft(CORAL, 160, 8))


def desk(c):
    """The mixing desk, with one fader pulled all the way down."""
    c.drawPath(poly([(0, 732), (W, 732), (W, H), (0, H)]), fill(DESK))
    c.drawRect(rect(0, 732, W, 744), fill(DUSK))
    c.drawLine(0, 732, W, 732, pen(INK, 6))
    for i in range(9):
        x = 40 + i * 64
        c.drawPath(rrect(x - 4, 828, x + 4, 892, 4), fill(INK))
        down = i == 4
        fy = 880 if down else 840 + (i * 13) % 34
        solid(c, rrect(x - 16, fy - 8, x + 16, fy + 8, 4), CORAL if down else CREAM, CORAL_DK if down else CREAM_DK,
              shadow=(4, 0), outline=4)
        if down:
            glow(c, x, fy, 46, CORAL, 120)
        for k in range(2):
            c.drawCircle(x - 12 + k * 24, 812, 6, fill(MUSTARD if (i + k) % 3 else TEAL))


def jackpot(c):
    """The torn, empty jackpot envelope and a couple of loose notes falling."""
    c.save()
    c.rotate(-18, 120, 650)
    solid(c, rrect(54, 612, 186, 694, 6), CREAM, CREAM_DK, shadow=(8, 6), outline=6)
    flap = poly([(54, 612), (120, 664), (186, 612)], 4)
    c.drawPath(flap, pen(INK, 5))
    c.drawPath(oval(120, 660, 14), fill(CORAL))
    c.drawPath(oval(120, 660, 14), pen(INK, 4))
    c.restore()
    for x, y, a in ((512, 238, 22), (90, 250, -30), (560, 640, -12)):
        c.save()
        c.rotate(a, x, y)
        solid(c, rrect(x - 34, y - 17, x + 34, y + 17, 4), TEAL, TEAL_DK, shadow=(5, 4), outline=5)
        c.drawCircle(x, y, 8, pen(INK, 3))
        c.restore()


def draw(c):
    backdrop(c, ["#120C24", NIGHT, WINE])
    foam_wall(c)
    # A spotlight from the ceiling onto the mic; the specks are dust in the beam.
    beam = poly([(330, -20), (390, -20), (520, 760), (200, 760)])
    c.drawPath(beam, soft(CORAL, 34, 24))
    stars(c, 202, 40, 330, 120, 470, 700, sparkles=2, colours=(CORAL,))
    control_window(c)
    on_air(c)
    jackpot(c)
    desk(c)
    waveform(c)
    microphone(c)
