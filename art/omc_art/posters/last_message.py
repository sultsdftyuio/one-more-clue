"""Case 001, The Last Message: the innovation lab at 9:17. One window is lit
over an empty pedestal, and a phone in the foreground shows the edited message."""
import skia

from ..marks import clock_hands, clock_ticks
from ..paint import fill, pen, solid
from ..palette import (BRICK, BRICK_DK, CORAL, CORAL_DK, CREAM, CREAM_DK, DUSK, HAZE, INK, LILAC, MOON,
                       MOON_DK, MUSTARD, MUSTARD_DK, NIGHT, STEEL, TEAL)
from ..shapes import minus, moved, oval, poly, rect, rrect
from .common import H, W, backdrop, glow, lineup, soft, stars

GLASS = "#323A78"
GLASS_DK = "#283066"
GROUND = 780


def moon(c, x, y, r):
    glow(c, x, y, r * 2.4, MOON, 70)
    m = oval(x, y, r)
    c.drawPath(m, fill(MOON))
    c.save()
    c.clipPath(m, doAntiAlias=True)
    c.drawPath(minus(m, moved(m, -r * 0.22, -r * 0.18)), fill(MOON_DK))
    for dx, dy, cr in ((-0.3, -0.25, 0.2), (0.25, 0.1, 0.26), (-0.1, 0.45, 0.12)):
        c.drawCircle(x + dx * r, y + dy * r, cr * r, fill(MOON_DK))
    c.restore()


def lab(c):
    """A glass-fronted lab tower with a clock, all dark but one window."""
    l, t, r = 150, 300, 450
    # Rooftop plant and antenna.
    solid(c, rrect(190, t - 40, 270, t + 4, 6), DUSK, outline=5)
    c.drawLine(400, t, 400, t - 90, pen(INK, 6))
    c.drawCircle(400, t - 94, 16, fill(CORAL, 70))
    c.drawCircle(400, t - 94, 6, fill(CORAL))
    solid(c, rrect(l, t, r, GROUND + 20, 8), BRICK, BRICK_DK, shadow=(12, 0), outline=7)
    solid(c, rrect(l - 8, t - 6, r + 8, t + 14, 5), DUSK, outline=5)
    # Clock over the entrance, stopped at 9:17.
    solid(c, oval(300, t + 66, 38), CREAM, CREAM_DK, shadow=(-5, -5), outline=6)
    clock_ticks(c, 300, t + 66, 32, 7, 4)
    clock_hands(c, 300, t + 66, 9, 17, 17, 26, 6, 4)
    c.drawCircle(300, t + 66, 4, fill(INK))
    # Glass curtain wall: a grid of dark panes.
    cols, rows = 5, 6
    x0, y0, pw, ph, g = l + 22, t + 128, 42, 44, 10
    lit = (2, 2)
    for row in range(rows):
        for cl in range(cols):
            x, y = x0 + cl * (pw + g), y0 + row * (ph + g)
            if (row, cl) == lit:
                continue
            c.drawPath(rrect(x, y, x + pw, y + ph, 4), fill(GLASS))
            c.drawPath(rrect(x, y, x + pw * 0.45, y + ph, 4), fill(GLASS_DK))
            c.drawPath(rrect(x, y, x + pw, y + ph, 4), pen(INK, 4))
    # The one lit window: an empty pedestal where the prototype stood.
    x, y = x0 + lit[1] * (pw + g), y0 + lit[0] * (ph + g)
    glow(c, x + pw / 2, y + ph / 2, 120, MUSTARD, 120)
    c.drawPath(rrect(x, y, x + pw, y + ph, 4), fill(MUSTARD))
    c.drawPath(rrect(x + 13, y + 28, x + pw - 13, y + ph, 2), fill(INK))
    c.drawPath(rrect(x + 9, y + 24, x + pw - 9, y + 30, 2), fill(INK))
    c.drawPath(rrect(x + 12, y + 8, x + pw - 12, y + 24, 5), pen(INK, 2.5, 200))
    c.drawPath(rrect(x, y, x + pw, y + ph, 4), pen(INK, 4))
    # Entrance.
    solid(c, rrect(262, GROUND - 74, 338, GROUND + 4, 6), HAZE, outline=5)
    c.drawLine(300, GROUND - 74, 300, GROUND, pen(INK, 4))
    # Low wing on the left with a row of dark windows.
    solid(c, rrect(36, 560, l + 6, GROUND + 20, 6), BRICK, BRICK_DK, shadow=(10, 0), outline=6)
    for i in range(3):
        for j in range(3):
            wx, wy = 56 + i * 30, 590 + j * 52
            c.drawPath(rrect(wx, wy, wx + 18, wy + 26, 3), fill(DUSK))
            c.drawPath(rrect(wx, wy, wx + 18, wy + 26, 3), pen(INK, 3))


def street(c):
    c.drawRect(rect(0, GROUND, W, H), fill(INK))
    c.drawRect(rect(0, GROUND, W, GROUND + 10), fill(DUSK))
    for x in (40, 150, 260, 370, 480, 590):
        c.drawPath(rrect(x, GROUND + 60, x + 60, GROUND + 66, 3), fill(STEEL, 50))


def lamp(c, x):
    glow(c, x + 26, GROUND - 150, 110, MUSTARD, 90)
    p = skia.Path()
    p.moveTo(x, GROUND)
    p.lineTo(x, GROUND - 150)
    p.quadTo(x, GROUND - 172, x + 22, GROUND - 172)
    p.lineTo(x + 28, GROUND - 172)
    c.drawPath(p, pen(INK, 9))
    c.drawCircle(x + 28, GROUND - 152, 10, fill(MUSTARD))
    solid(c, poly([(x + 10, GROUND - 156), (x + 28, GROUND - 178), (x + 46, GROUND - 156)], 4), DUSK, outline=4)


def phone(c):
    """The group chat, held up in the foreground; the last message is edited."""
    c.save()
    c.rotate(-11, 470, 760)
    c.drawPath(rrect(372, 560, 584, 960, 34), soft(INK, 140, 14))
    solid(c, rrect(360, 548, 572, 948, 34), CORAL, CORAL_DK, shadow=(12, 0), outline=8)
    screen = rrect(378, 580, 554, 930, 20)
    c.drawPath(screen, fill(NIGHT))
    c.drawPath(screen, pen(INK, 6))
    c.drawPath(rrect(438, 562, 494, 572, 5), fill(INK))
    bubbles = [((392, 600, 492, 634), LILAC, 1), ((436, 646, 540, 680), MUSTARD, 1),
               ((392, 692, 512, 742), TEAL, 2), ((420, 756, 540, 820), CREAM, 2)]
    for (l, t, r, b), colour, lines in bubbles:
        c.drawPath(rrect(l, t, r, b, 15), fill(colour))
        c.drawPath(rrect(l, t, r, b, 15), pen(INK, 5))
        for i in range(lines):
            y = t + (b - t) * (i + 1) / (lines + 1)
            c.drawLine(l + 14, y, r - 14 - i * 26, y, pen(INK, 6, 110))
    # "Edited" tag on the last message.
    solid(c, rrect(470, 826, 542, 850, 10), CORAL, outline=4)
    c.drawLine(484, 838, 528, 838, pen(CREAM, 4))
    c.restore()
    # The notification dot.
    solid(c, oval(560, 560, 26), MUSTARD, MUSTARD_DK, shadow=(5, 5), outline=6)
    c.drawLine(560, 546, 560, 562, pen(INK, 6))
    c.drawCircle(560, 574, 3.8, fill(INK))


def draw(c):
    backdrop(c, ["#0E1026", NIGHT, "#2A2B5E"])
    stars(c, 101, 120, 0, 0, W, 520, colours=(CREAM, MUSTARD))
    moon(c, 478, 228, 54)
    glow(c, 300, 560, 360, LILAC, 45)
    lab(c)
    street(c)
    lamp(c, 70)
    lineup(c, 210, GROUND + 92, 150, MUSTARD, gap=0.6)
    phone(c)
