"""Case 003, The Last Course: the opening film.

    python -m omc_cinema.case003_film voices     # record the cast, print how long each line runs
    python -m omc_cinema.case003_film stills     # the risky moments, as a contact sheet
    python -m omc_cinema.case003_film draft      # quick low-res film, to check timing
    python -m omc_cinema.case003_film            # the game copy (720 x 1280)
    python -m omc_cinema.case003_film master     # full size, for trailers

A montage that keeps speeding up, told by the critic herself: Celeste Hart reads
her review as she writes it, course by course, each shot shorter than the last
and each a different kind of picture (a shopfront at night, a turntable, a pour,
a whip along the ticket rail, a flambe, a plate shot across the pass, a pen). The
waltz under it gets faster with every cut. Then course seven, the only slow
shot in the film, her sentence skidding off the page, and a fork falling.

We never see her at all, only her notebook and pen. What it must not show or say: nuts,
peanut or allergy (what made her collapse is chapter 1's checkpoint), or anyone
touching the food. All four staff get the same treatment in the doorway. Hidden
clue: half a second of two desserts on the pass, one with a gold leaf and one
with a smudge on the plate's rim.
"""
from __future__ import annotations

import math
import sys

import numpy as np
import skia
from omc_art.palette import CORAL, CREAM, INK

from . import sound
from .film import (DRAFT, FPS, GAME, MASTER, Camera, ease_in_out, ease_out, fill, font, glow, layer, lerp, linear, noise1, poly, render_frame,
                   render_video, rrect, smooth, span, stroke, text, W, H)
from .kit import box, caption, contact_sheet, darkness, risky_moments, soft_shadow, suspect
from .look import Look, finish
from .textures import surface, weave
from .voice import line

GOLD = "#E8B46A"
GOLD_LEAF = "#F6CE6B"
LINEN = "#D9CCB2"
PORCELAIN = "#E2D8C5"
WINE = "#5A1F2B"
CHOCOLATE = "#3B2416"
FLAME = "#FFB65C"
GREEN = "#13261F"
SKIN, SKIN_DK = "#C9A07E", "#A87F60"
SILVER = "#C7CCD6"

LOOK = Look(bloom=0.24, bloom_threshold=0.86, halation=0.26, shadow_tint=(0.07, 0.035, 0.02), highlight_tint=(1.05, 0.98, 0.88),
            contrast=1.14, saturation=1.04, vignette=0.75, grain=0.035)

# Shot boundaries: every shot is shorter than the last, until course seven stops the clock.
EST, I, II, III, IV, V, VI, CLUE, VII, FORK, AFTER, TITLE = 0.0, 2.0, 4.4, 6.5, 8.1, 9.55, 10.6, 11.3, 11.8, 17.2, 18.5, 22.2
DURATION = 24.8
LAST_WORD_AT = 16.75  # she's cut off mid-word, and the pen skids

# (words, voice, speed, starts at, caption tag)
HER = "bf_isabella"
LINES = [
    ("Maison Lune. Seven courses.", HER, 1.0, 0.12, "CELESTE HART · FOOD CRITIC"),
    ("Course one. Oysters. Competent.", HER, 1.0, 2.2, None),
    ("Two. A soup with ambitions.", HER, 1.03, 4.55, None),
    ("Three. I have had worse.", HER, 1.06, 6.6, None),
    ("Four. The fish is brave.", HER, 1.22, 8.17, None),
    ("Five. Fine.", HER, 1.15, 9.6, None),
    ("Six.", HER, 1.35, 10.72, None),
    ("Course seven. Chocolate, salt and smoke. Finally, a reason to live.", HER, 0.98, 13.0, None),
    ("Not in my kitchen! Not tonight!", "bf_lily", 1.05, 19.75, "AMELIE DURET · HEAD CHEF"),
]
LINE_LENGTHS = [2.04, 2.21, 1.74, 1.32, 1.37, 1.0, 0.58, 4.02, 2.03]  # measured by `voices`

STAFF = [  # all four in the doorway, the same size and the same light
    ("triangle", 330, "AMELIE DURET", "Head chef"),
    ("square", 20, "BERTRAND CARRE", "Owner"),
    ("circle", 250, "OLU BELLO", "Sommelier"),
    ("rectangle", 110, "RUTH VALE", "Pastry chef"),
]

_rng = np.random.default_rng(31)
ICE = [(a, r, s, q, v) for a, r, s, q, v in zip(_rng.uniform(0, math.tau, 340), np.sqrt(_rng.uniform(0, 1, 340)) * 450, _rng.uniform(18, 46, 340), _rng.uniform(0, 90, 340), _rng.uniform(0, 1, 340))]
EMBERS = [(x, sp, ph, sz) for x, sp, ph, sz in zip(_rng.uniform(120, 960, 70), _rng.uniform(280, 760, 70), _rng.uniform(0, 1, 70), _rng.uniform(2, 6, 70))]
FLAKES = [(x, y, sp, r) for x, y, sp, r in zip(_rng.uniform(40, 1040, 50), _rng.uniform(0, 1920, 50), _rng.uniform(50, 140, 50), _rng.uniform(0, 360, 50))]


# ---------------------------------------------------------------------------
# Shared pieces

def tablecloth(c, x0, y0, x1, y1, colour=LINEN):
    """Linen with a weave and a couple of soft fold lines."""
    p = box(x0, y0, x1, y1)
    c.drawPath(p, fill(colour))
    weave(c, p, "linen", 1.5)
    for x in (x0 + (x1 - x0) * 0.31, x0 + (x1 - x0) * 0.69):
        c.drawRect(skia.Rect.MakeLTRB(x - 3, y0, x + 3, y1), fill("#000000", 0.05))
        c.drawRect(skia.Rect.MakeLTRB(x + 3, y0, x + 12, y1), fill("#FFFFFF", 0.035))


def warm_room(c, t, seed=0.0):
    """A dining room out of focus: panelled walls, candles and lamps melting into discs."""
    c.drawRect(skia.Rect.MakeLTRB(-700, -700, 1800, 2700), linear((0, -100), (0, 2000), [(0, "#1E100B", 1), (0.6, "#2E1912", 1), (1, "#150B08", 1)]))
    for x in range(-500, 1700, 300):
        c.drawPath(rrect(x, 40, x + 250, 1000, 8), stroke("#4A2C1E", 12))
    lights = ((160, 240, 110, GOLD), (420, 130, 70, FLAME), (700, 300, 130, GOLD), (960, 170, 80, CORAL), (70, 620, 80, FLAME), (1010, 560, 70, GOLD),
              (520, 520, 50, FLAME), (240, 1500, 90, GOLD), (860, 1600, 110, FLAME), (540, 1800, 70, CORAL))
    for i, (x, y, r, col) in enumerate(lights):
        flick = 0.75 + 0.25 * noise1(t * 3.1, i * 1.9 + seed)
        c.drawCircle(x, y, r, fill(col, 0.42 * flick, blend=skia.BlendMode.kPlus))


def numeral(c, t, start, n, label):
    """The menu card's Roman numeral, landing as the shot begins."""
    k = ease_out(span(t, start, start + 0.22), 3)
    a = smooth(span(t, start, start + 0.12))
    glow(c, (W / 2, 290), 240, "#000000", 0.5 * a, blend=skia.BlendMode.kSrcOver)
    text(c, n, W / 2, 300 + (1 - k) * 34, font("serif", 150), fill(GOLD, a), align="center")
    if label:
        text(c, label, W / 2, 372, font("serif", 46), fill(CREAM, 0.85 * a), align="center", tracking=2)
        c.drawLine(W / 2 - 120 * k, 394, W / 2 + 120 * k, 394, stroke(GOLD, 2.5, 0.7 * a))


def plate(c, x, y, r):
    """A white plate from above: a soft shadow, a raised rim and a gold line."""
    disc = skia.Path()
    disc.addCircle(x, y, r)
    soft_shadow(c, disc, r * 0.03, r * 0.06, 22, 0.55)
    c.drawPath(disc, linear((x - r, y - r), (x + r, y + r), [(0, "#EFE6D4", 1), (1, "#C9BEA9", 1)]))
    c.drawCircle(x, y, r * 0.72, fill("#D6CBB6"))
    c.drawCircle(x, y, r * 0.73, stroke("#BDB19B", 3))
    c.drawCircle(x, y, r * 0.96, stroke(GOLD, max(3, r * 0.012), 0.85))


def dessert(c, x, y, r, gold=True, bite=0.0, smudge=False, t=0.0):
    """Course seven at a three-quarter angle: a glossy dome with salt, crumbs and a smear of sauce."""
    rim = skia.Path()
    rim.addOval(skia.Rect.MakeLTRB(x - r * 1.9, y - r * 0.42, x + r * 1.9, y + r * 0.46))
    soft_shadow(c, rim, 0, r * 0.1, r * 0.12, 0.6)
    c.drawPath(rim, linear((x - r * 1.9, 0), (x + r * 1.9, 0), [(0, "#EFE6D4", 1), (1, "#BDB19B", 1)]))
    c.drawOval(skia.Rect.MakeLTRB(x - r * 1.82, y - r * 0.37, x + r * 1.82, y + r * 0.4), stroke(GOLD, max(2, r * 0.018), 0.85))
    c.drawOval(skia.Rect.MakeLTRB(x - r * 1.3, y - r * 0.24, x + r * 1.3, y + r * 0.3), fill("#CBBFA9"))
    # A swipe of sauce and a line of crumbs across the plate.
    swipe = skia.Path()
    swipe.moveTo(x - r * 1.4, y + r * 0.2)
    swipe.quadTo(x, y + r * 0.42, x + r * 1.2, y + r * 0.14)
    c.drawPath(swipe, stroke("#4A2415", r * 0.1, 0.9))
    for k in range(9):
        c.drawCircle(x - r * 1.1 + k * r * 0.2, y + r * 0.3 - abs(k - 4) * r * 0.025, r * (0.018 + (k % 3) * 0.01), fill("#6B4326"))
    if smudge:
        c.drawOval(skia.Rect.MakeLTRB(x + r * 1.28, y + r * 0.1, x + r * 1.66, y + r * 0.26), fill(CHOCOLATE, 0.92))
    shape = skia.Path()
    shape.addOval(skia.Rect.MakeLTRB(x - r, y - r * 1.02, x + r, y + r * 0.2))
    c.drawPath(shape, linear((x - r, y - r), (x + r, y + r * 0.2), [(0, "#6E4629", 1), (0.45, CHOCOLATE, 1), (1, "#1C0F08", 1)]))
    c.save()
    c.clipPath(shape, doAntiAlias=True)
    # The gloss: a big soft window of light, and a sharp one inside it.
    c.drawOval(skia.Rect.MakeLTRB(x - r * 0.76, y - r * 0.94, x - r * 0.04, y - r * 0.46), fill("#A9754C", 0.5))
    c.drawOval(skia.Rect.MakeLTRB(x - r * 0.6, y - r * 0.86, x - r * 0.26, y - r * 0.68), fill("#F6DDB8", 0.55))
    c.drawOval(skia.Rect.MakeLTRB(x - r, y - r * 0.1, x + r, y + r * 0.4), fill("#000000", 0.28))
    if bite > 0:  # the mousse inside, where the fork has been
        c.drawCircle(x + r * 0.78, y - r * 0.32, r * 0.72 * bite, fill("#7A4A2C"))
        c.drawCircle(x + r * 0.92, y - r * 0.26, r * 0.5 * bite, fill("#A06C45"))
    c.restore()
    for k in range(7):  # salt flakes
        a = k * 2.4
        c.drawRect(skia.Rect.MakeXYWH(x + math.cos(a) * r * 0.55 - 2, y - r * 0.5 + math.sin(a) * r * 0.26, max(2, r * 0.03), max(2, r * 0.03)), fill("#FFF8EA", 0.85))
    if gold:
        c.drawPath(poly([(x - r * 0.3, y - r * 0.94), (x - r * 0.02, y - r * 1.1), (x + r * 0.2, y - r * 0.92), (x - r * 0.04, y - r * 0.78)]), fill(GOLD_LEAF))
        c.drawLine(x - r * 0.18, y - r * 0.93, x + r * 0.08, y - r * 0.95, stroke("#FFF3C4", max(1.5, r * 0.018)))


def oyster(c, x, y, r, seed):
    """A half shell: a rough, bumpy edge, mother-of-pearl, and the oyster lying off-centre in it."""
    edge = skia.Path()
    for i in range(44):
        a = i / 44 * math.tau
        bump = 1 + 0.08 * math.sin(a * 7 + seed) + 0.05 * math.sin(a * 13 + seed * 2) + 0.02 * math.sin(a * 29)
        px, py = x + math.cos(a) * r * bump, y + math.sin(a) * r * 1.3 * bump
        edge.moveTo(px, py) if i == 0 else edge.lineTo(px, py)
    edge.close()
    soft_shadow(c, edge, 6, 10, 8, 0.5)
    c.drawPath(edge, fill("#5E5A68"))
    c.drawPath(edge, stroke(INK, 6))
    c.save()
    c.translate(x, y)
    c.scale(0.86, 0.88)
    c.translate(-x, -y)
    c.drawPath(edge, linear((x - r, y - r), (x + r, y + r), [(0, "#DDD6E2", 1), (0.5, "#BFCAD8", 1), (1, "#DBC8D0", 1)]))
    c.restore()
    c.drawPath(rrect(x - r * 0.46, y - r * 0.46, x + r * 0.42, y + r * 0.74, r * 0.4), fill("#C9BFA6"))
    c.drawPath(rrect(x - r * 0.24, y - r * 0.2, x + r * 0.2, y + r * 0.44, r * 0.2), fill("#8F8672", 0.6))
    c.drawOval(skia.Rect.MakeLTRB(x - r * 0.34, y - r * 0.4, x - r * 0.02, y - r * 0.18), fill("#FFFFFF", 0.4))


def fork_shape(c, x, y, angle, scale=1.0):
    c.save()
    c.translate(x, y)
    c.rotate(angle)
    c.scale(scale, scale)
    head = skia.Path()
    head.addRRect(skia.RRect.MakeRectXY(skia.Rect.MakeLTRB(-64, -30, 64, 96), 26, 26))
    c.drawPath(rrect(-16, 80, 16, 520, 14), linear((-16, 0), (16, 0), [(0, "#E9EDF4", 1), (0.5, "#9EA3B0", 1), (1, "#D4D8E1", 1)]))
    c.drawPath(head, linear((-64, 0), (64, 0), [(0, "#E9EDF4", 1), (0.5, "#9EA3B0", 1), (1, "#D4D8E1", 1)]))
    for k in range(4):
        c.drawPath(rrect(-62 + k * 42, -180, -40 + k * 42, -10, 10), fill(SILVER))
    c.drawLine(-8, 110, -8, 500, stroke("#FFFFFF", 5, 0.75))
    c.drawCircle(0, 470, 9, stroke(GOLD, 3, 0.7))
    c.restore()


def wine_glass(c, x, y, s=1.0):
    """Her glass of Pinot, barely touched."""
    c.save()
    c.translate(x, y)
    c.scale(s, s)
    c.drawOval(skia.Rect.MakeLTRB(-70, -14, 70, 16), fill("#FFFFFF", 0.14))
    c.drawLine(0, 0, 0, -170, stroke("#FFFFFF", 7, 0.35))
    bowl = skia.Path()
    bowl.moveTo(-92, -350)
    bowl.cubicTo(-104, -240, -54, -180, 0, -176)
    bowl.cubicTo(54, -180, 104, -240, 92, -350)
    wine = skia.Path()
    wine.moveTo(-98, -280)
    wine.cubicTo(-92, -220, -50, -184, 0, -182)
    wine.cubicTo(50, -184, 92, -220, 98, -280)
    wine.close()
    c.drawPath(wine, fill("#6E1F2C", 0.85))
    c.drawOval(skia.Rect.MakeLTRB(-98, -292, 98, -268), fill("#9A3244", 0.8))
    c.drawPath(bowl, stroke("#FFFFFF", 4, 0.5))
    c.drawLine(-62, -326, -74, -240, stroke("#FFFFFF", 7, 0.3))
    c.restore()


def fountain_pen(c, tipx, tipy, tilt=0.0):
    """Her fountain pen, the only part of her in the film. The nib sits at (tipx, tipy)."""
    c.save()
    c.translate(tipx, tipy)
    c.rotate(tilt)
    # Its shadow on the page.
    shade = stroke("#000000", 26, 0.28)
    shade.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 9))
    c.drawLine(34, 6, 290, -350, shade)
    # The barrel: black lacquer with a long highlight, two gold bands and a gold clip.
    c.drawLine(12, -20, 270, -420, stroke("#14141C", 30))
    c.drawLine(18, -30, 270, -416, stroke("#6A6C80", 5, 0.7))
    c.drawLine(62, -98, 80, -126, stroke(GOLD, 32))
    c.drawLine(162, -254, 170, -266, stroke(GOLD, 32))
    c.drawLine(204, -292, 246, -358, stroke(GOLD_LEAF, 6))
    # The gold nib, with its slit.
    c.drawPath(poly([(0, 0), (-8, -48), (34, -24)]), fill(GOLD_LEAF))
    c.drawLine(2, -4, 12, -28, stroke("#7A5A1E", 2.5))
    c.restore()


# ---------------------------------------------------------------------------
# The opening: Maison Lune from across the street

def moon(c, x, y, r, colour):
    p = skia.Path()
    p.addCircle(x, y, r)
    cut = skia.Path()
    cut.addCircle(x + r * 0.42, y - r * 0.14, r * 0.86)
    c.drawPath(skia.Op(p, cut, skia.PathOp.kDifference_PathOp), fill(colour))


def shopfront(c, u):
    c.drawRect(skia.Rect.MakeLTRB(-700, -700, 1800, 2800), fill("#0A0D10"))
    # Stone above, painted panelling around the window.
    c.drawRect(skia.Rect.MakeLTRB(-700, -700, 1800, 380), surface("marble", 1.6))
    c.drawRect(skia.Rect.MakeLTRB(-700, -700, 1800, 380), fill("#0A0D10", 0.55))
    c.drawRect(skia.Rect.MakeLTRB(-700, 380, 1800, 1640), fill(GREEN))
    weave(c, box(-700, 380, 1800, 1640), "paper", 2)
    for x in (-40, 1040):
        c.drawPath(rrect(x - 44, 400, x + 44, 1620, 6), linear((x - 44, 0), (x + 44, 0), [(0, "#1E3A30", 1), (1, "#0C1A15", 1)]))
    # The fascia: gold letters and a crescent.
    c.drawPath(rrect(70, 420, 1010, 640, 8), fill("#0E1C17"))
    c.drawPath(rrect(70, 420, 1010, 640, 8), stroke(GOLD, 6))
    c.drawPath(rrect(84, 434, 996, 626, 4), stroke(GOLD, 2, 0.6))
    moon(c, 190, 530, 64, GOLD_LEAF)
    sign = font("serif", 118)
    sign.setEmbolden(True)
    text(c, "Maison Lune", 610, 572, sign, fill(GOLD_LEAF), align="center")
    glow(c, (540, 520), 620, GOLD, 0.14)
    # The window: a warm room, people at tables, candles.
    room = skia.Rect.MakeLTRB(110, 760, 970, 1500)
    c.drawRect(room, linear((0, 760), (0, 1500), [(0, "#D98E46", 1), (0.6, "#B2652E", 1), (1, "#6E3A1E", 1)]))
    c.save()
    c.clipRect(room)
    for x, r in ((260, 44), (540, 54), (820, 44)):
        c.drawLine(x, 760, x, 880, stroke("#2A1610", 6))
        c.drawCircle(x, 900, r, fill("#FFE7B0", 0.95))
        glow(c, (x, 900), r * 5, "#FFE7B0", 0.4)
    for x, y, s, hat in ((230, 1290, 1.0, 0), (420, 1300, 0.9, 1), (660, 1290, 1.0, 0), (860, 1300, 0.9, 1)):
        c.drawCircle(x, y - 150 * s, 52 * s, fill("#2A130C"))
        c.drawPath(rrect(x - 84 * s, y - 104 * s, x + 84 * s, y + 200, 50 * s), fill("#2A130C"))
    for x in (325, 760):
        c.drawPath(rrect(x - 130, 1270, x + 130, 1500, 8), fill("#F2E4C8", 0.92))
        c.drawLine(x, 1270, x, 1218, stroke("#FFF6DC", 7))
        c.drawOval(skia.Rect.MakeLTRB(x - 8, 1190 + 3 * math.sin(u * 14 + x), x + 8, 1222), fill("#FFF0B8"))
        glow(c, (x, 1200), 130, FLAME, 0.5)
    c.restore()
    # The cafe curtain, the glazing bars and gold lettering on the glass.
    c.drawRect(skia.Rect.MakeLTRB(room.left(), 1240, room.right(), 1500), fill("#F2E4C8", 0.26))
    c.drawLine(room.left(), 1240, room.right(), 1240, stroke(GOLD, 8))
    for x in (396, 684):
        c.drawLine(x, room.top(), x, room.bottom(), stroke("#0C1A15", 18))
    c.drawPath(rrect(room.left(), room.top(), room.right(), room.bottom(), 4), stroke("#0C1A15", 22))
    text(c, "Cuisine  ·  Vins", 540, 1090, font("serif", 58), fill(GOLD_LEAF, 0.85), align="center", tracking=3)
    # A striped awning over the window.
    for i in range(14):
        x0 = 60 + i * 69
        c.drawPath(poly([(x0, 650), (x0 + 69, 650), (x0 + 77, 740), (x0 - 8, 740)]), fill(WINE if i % 2 else "#D9CCB2"))
        arc = skia.Path()
        arc.addArc(skia.Rect.MakeLTRB(x0 - 8, 712, x0 + 77, 768), 0, 180)
        c.drawPath(arc, fill(WINE if i % 2 else "#D9CCB2"))
    c.drawRect(skia.Rect.MakeLTRB(60, 650, 1030, 664), fill("#000000", 0.4))
    # The pavement: wet stone, with the window's light lying in it.
    c.drawRect(skia.Rect.MakeLTRB(-700, 1640, 1800, 2800), surface("marble", 1.3))
    c.drawRect(skia.Rect.MakeLTRB(-700, 1640, 1800, 2800), fill("#0A0D10", 0.65))
    c.drawRect(skia.Rect.MakeLTRB(110, 1640, 970, 2100), linear((0, 1640), (0, 2100), [(0, "#D98E46", 0.4), (1, "#D98E46", 0)]))
    # A menu board on the pavement.
    c.drawPath(poly([(1040, 1740), (1230, 1740), (1260, 1950), (1010, 1950)]), fill("#1B1411"))
    c.drawPath(poly([(1040, 1740), (1230, 1740), (1260, 1950), (1010, 1950)]), stroke("#6B4326", 8))
    text(c, "VII", 1135, 1830, font("serif", 72), fill(CREAM, 0.85), align="center")


def shot_est(c, u):
    push = ease_in_out(span(u, 0, I - EST))
    cam = Camera(x=540, y=lerp(1020, 1060, push), zoom=lerp(0.86, 1.6, push ** 1.6), focus=1.0, aperture=10)
    with layer(c, cam, 1.0) as lc:
        shopfront(lc, u)
    # Through the glass: the warmth of the room takes over the frame.
    c.drawRect(skia.Rect.MakeWH(W, H), fill("#FFD79A", smooth(span(u, 1.62, 2.0))))
    a = smooth(span(u, 0.55, 0.9)) * (1 - smooth(span(u, 1.5, 1.75)))
    card = font("serif", 44)
    text(c, "The most feared critic in the country.", W / 2, H - 170, card, fill(CREAM, 0.85 * a), align="center")
    text(c, "8:00 PM", 72, 150, font("type", 46), fill(CREAM, smooth(span(u, 0.3, 0.6)) * (1 - smooth(span(u, 1.4, 1.7)))), tracking=3)


# ---------------------------------------------------------------------------
# I: a turntable, from above

def shot_i(c, u):
    d = II - I
    cam = Camera(x=540, y=1000, zoom=1.0 + u * 0.03, focus=1.0, aperture=14)
    with layer(c, cam, 1.0) as lc:
        tablecloth(lc, -300, -300, 1400, 2300)
        # Her place setting, still while the plate turns.
        lc.drawPath(rrect(26, 720, 58, 1500, 14), fill("#000000", 0.2))
        for x in (20, 1040):
            lc.drawPath(rrect(x - 14, 720, x + 14, 1500, 12), linear((x - 14, 0), (x + 14, 0), [(0, "#E9EDF4", 1), (1, "#8E93A0", 1)]))
        glow(lc, (910, 240), 460, FLAME, 0.3)
        tray = skia.Path()
        tray.addCircle(540, 1060, 478)
        soft_shadow(lc, tray, 12, 22, 28, 0.6)
        lc.drawPath(tray, surface("steel", 1.0))
        lc.drawCircle(540, 1060, 470, stroke("#E6E8EE", 8, 0.8))
        lc.drawCircle(540, 1060, 446, fill("#A9BDCC"))
        lc.save()
        lc.rotate(u * 16, 540, 1060)
        # Crushed ice, shard by shard.
        for a, r, s, q, v in ICE:
            x, y = 540 + math.cos(a) * r, 1060 + math.sin(a) * r
            lc.save()
            lc.rotate(q, x, y)
            lc.drawPath(poly([(x - s, y - s * 0.5), (x + s * 0.3, y - s), (x + s, y + s * 0.3), (x - s * 0.2, y + s * 0.8)]), fill("#BCCDDB" if v > 0.5 else "#D3E0EA", 0.8))
            lc.drawLine(x - s * 0.5, y - s * 0.3, x + s * 0.4, y - s * 0.6, stroke("#FFFFFF", 2.5, 0.55))
            lc.restore()
        for k in range(5):
            lc.save()
            lc.rotate(k * 72, 540, 1060)
            oyster(lc, 540, 790, 112, k * 2.3)
            # Sprigs of samphire between the shells.
            lc.drawLine(738, 806, 776, 716, stroke("#4E6E30", 9))
            lc.drawLine(758, 760, 802, 742, stroke("#4E6E30", 7))
            lc.drawLine(748, 784, 716, 748, stroke("#4E6E30", 7))
            lc.restore()
        lc.drawCircle(540, 1060, 118, fill("#EFD24E"))
        lc.drawCircle(540, 1060, 96, fill("#F7EFAE"))
        for k in range(9):
            a = k * math.tau / 9
            lc.drawLine(540, 1060, 540 + math.cos(a) * 96, 1060 + math.sin(a) * 96, stroke("#EFD24E", 5))
        lc.drawCircle(540, 1060, 118, stroke(INK, 6))
        lc.restore()
    darkness(c, (540, 1060), 1020, amount=0.72)
    if u < 0.3:
        c.drawRect(skia.Rect.MakeWH(W, H), fill("#FFD79A", 1 - u / 0.3))
    numeral(c, u, 0.2, "I", "Oysters")


# ---------------------------------------------------------------------------
# II: a pour, side on

def shot_ii(c, u):
    d = III - II
    cam = Camera(x=540, y=lerp(1060, 1000, ease_in_out(span(u, 0, d))), zoom=lerp(1.0, 1.1, u / d), focus=1.0, aperture=14)
    with layer(c, cam, 0.5, extra_blur=30) as lc:
        warm_room(lc, u, 3.1)
    with layer(c, cam, 1.0) as lc:
        tablecloth(lc, -300, 1520, 1400, 2400)
        lc.drawRect(skia.Rect.MakeLTRB(-300, 1520, 1400, 1534), fill("#FFFFFF", 0.1))
        # The stream from the copper ladle, wobbling, with a crown where it lands.
        wob = 8 * math.sin(u * 7)
        stream = skia.Path()
        stream.moveTo(526, 690)
        stream.cubicTo(526 + wob, 860, 514 - wob, 1040, 526, 1270)
        stream.lineTo(554, 1270)
        stream.cubicTo(566 - wob, 1040, 550 + wob, 860, 554, 690)
        stream.close()
        lc.drawPath(stream, linear((0, 690), (0, 1270), [(0, "#EDAA52", 1), (1, "#C96F2D", 1)]))
        lc.drawLine(530, 700, 526, 1260, stroke("#FFE1AA", 4, 0.6))
        ladle = poly([(380, 600), (620, 600), (660, 690), (420, 705)])
        lc.drawPath(ladle, linear((380, 0), (660, 0), [(0, "#D98A52", 1), (0.5, "#F2BB86", 1), (1, "#8C4E2A", 1)]))
        lc.drawLine(380, 610, -120, 510, stroke("#B9713F", 26))
        lc.drawLine(380, 604, -120, 504, stroke("#F2BB86", 6, 0.7))
        lc.drawPath(ladle, stroke(INK, 8))
        # The underplate, the bowl, the soup with a swirl of herb oil and cream.
        lc.drawOval(skia.Rect.MakeLTRB(60, 1560, 1020, 1720), fill("#000000", 0.35))
        lc.drawOval(skia.Rect.MakeLTRB(70, 1540, 1010, 1700), fill(PORCELAIN))
        lc.drawOval(skia.Rect.MakeLTRB(84, 1548, 996, 1690), stroke(GOLD, 4, 0.8))
        lc.drawPath(rrect(170, 1250, 910, 1640, 170), linear((170, 0), (910, 0), [(0, "#CFC4B0", 1), (0.4, PORCELAIN, 1), (1, "#A89D8A", 1)]))
        lc.drawOval(skia.Rect.MakeLTRB(170, 1190, 910, 1350), fill(PORCELAIN))
        soup = skia.Rect.MakeLTRB(206, 1212, 874, 1330)
        lc.drawOval(soup, linear((206, 0), (874, 0), [(0, "#E19A44", 1), (1, "#B86528", 1)]))
        lc.save()
        path = skia.Path()
        path.addOval(soup)
        lc.clipPath(path, doAntiAlias=True)
        swirl = skia.Path()
        for i in range(46):
            a = i * 0.3 + u * 1.2
            r = 30 + i * 6.2
            x, y = 540 + math.cos(a) * r, 1270 + math.sin(a) * r * 0.2
            swirl.moveTo(x, y) if i == 0 else swirl.lineTo(x, y)
        lc.drawPath(swirl, stroke("#FBE8C4", 6, 0.6))
        for k in range(14):
            a = k * 2.399
            r = 60 + k * 19
            lc.drawCircle(540 + math.cos(a + u) * r, 1270 + math.sin(a + u) * r * 0.2, 7, fill("#5E8A3A", 0.9))
        for k in range(3):
            r = ((u * 0.9 + k * 0.33) % 1.0)
            lc.drawOval(skia.Rect.MakeLTRB(540 - 280 * r, 1270 - 44 * r, 540 + 280 * r, 1270 + 44 * r), stroke("#F6C27C", 5, 0.7 * (1 - r)))
        for x, y in ((360, 1254), (690, 1290), (440, 1302)):  # croutons
            lc.drawPath(rrect(x - 22, y - 13, x + 22, y + 13, 5), fill("#C98F4E"))
            lc.drawPath(rrect(x - 22, y - 13, x + 22, y + 13, 5), stroke("#7A4A22", 3))
        lc.restore()
        lc.drawPath(rrect(170, 1250, 910, 1640, 170), stroke(INK, 9))
        lc.drawOval(skia.Rect.MakeLTRB(170, 1190, 910, 1350), stroke(INK, 9))
        lc.drawOval(skia.Rect.MakeLTRB(180, 1198, 900, 1342), stroke(GOLD, 4, 0.8))
        lc.drawPath(rrect(236, 1370, 290, 1570, 26), fill("#FFFFFF", 0.3))
        # Steam.
        for k in range(6):
            x = 300 + k * 96
            p = skia.Path()
            y0 = 1190 - ((u * 110 + k * 73) % 240)
            p.moveTo(x, y0)
            p.cubicTo(x + 40, y0 - 90, x - 40, y0 - 170, x + 10, y0 - 260)
            paint = stroke("#FFF3DE", 16, 0.14)
            paint.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 7))
            lc.drawPath(p, paint)
    darkness(c, (540, 1140), 1100, amount=0.62)
    numeral(c, u, 0.15, "II", "A soup")


# ---------------------------------------------------------------------------
# III: a whip along the ticket rail, the kitchen rushing past behind it

TICKETS = [("TABLE 4", "COURSE 3", "2 x TASTING"), ("TABLE 7", "COURSE 3", "4 x TASTING"), ("TABLE 2", "COURSE 2", "2 x TASTING"), ("TABLE 9", "OWNER", "1 x TASTING"),
           ("TABLE 6", "COURSE 4", "3 x TASTING"), ("TABLE 3", "COURSE 3", "2 x TASTING"), ("TABLE 1", "CRITIC", "1 x TASTING")]


def kitchen_back(c, x):
    c.drawRect(skia.Rect.MakeLTRB(-200, -200, 3400, 2200), surface("tile", 1.3))
    c.drawRect(skia.Rect.MakeLTRB(-200, -200, 3400, 2200), fill("#2A1408", 0.72))
    c.drawRect(skia.Rect.MakeLTRB(-200, 150, 3400, 176), fill("#8D9099"))
    for i in range(16):
        px = 40 + i * 210
        r = 58 + (i * 37) % 44
        c.drawLine(px, 176, px, 240, stroke("#3A3A42", 7))
        c.drawCircle(px, 240 + r, r, fill("#A85F36"))
        c.drawCircle(px - r * 0.3, 240 + r * 0.7, r * 0.34, fill("#F2BB86", 0.45))
        c.drawCircle(px, 240 + r, r, stroke("#4A2A18", 6))
    for i in range(7):  # cooks crossing behind the rail
        px = 180 + i * 460
        c.drawCircle(px, 1320, 86, fill("#160A05", 0.86))
        c.drawPath(rrect(px - 130, 1404, px + 130, 2200, 70), fill("#160A05", 0.86))
        c.drawPath(rrect(px - 66, 1170, px + 66, 1270, 30), fill("#2A1A12", 0.86))
    glow(c, (900, 900), 1000, FLAME, 0.3, blend=skia.BlendMode.kSrcOver)


def shot_iii(c, u):
    # Two hard moves and a landing: no drift at all.
    k = ease_in_out(span(u, 0.05, 0.75))
    k2 = ease_in_out(span(u, 0.8, 1.25))
    x = lerp(0, 1400, k) + lerp(0, 700, k2)
    speed = max(math.sin(math.pi * span(u, 0.05, 0.75)), math.sin(math.pi * span(u, 0.8, 1.25)))
    cam = Camera(x=540, y=960, zoom=1.0, focus=1.0, aperture=0)
    with layer(c, cam, 1.0, extra_blur=14 + 20 * speed) as lc:
        lc.translate(-x * 0.35, 0)
        kitchen_back(lc, x)
    c.save()
    c.translate(-x, 0)
    # The rail and the tickets on it, each with handwriting and a thumbprint of grease.
    c.drawRect(skia.Rect.MakeLTRB(-400, 516, 4400, 566), surface("steel", 0.9))
    c.drawLine(-400, 516, 4400, 516, stroke("#E6E8EE", 4))
    c.drawLine(-400, 566, 4400, 566, stroke("#000000", 5, 0.6))
    for i, (table, what, cover) in enumerate(TICKETS):
        tx = 60 + i * 400
        c.save()
        c.rotate(-1.5 + (i * 37 % 5) * 0.8, tx + 180, 540)
        ticket = rrect(tx, 530, tx + 360, 1210, 6)
        soft_shadow(c, ticket, 8, 14, 12, 0.55)
        c.drawPath(ticket, fill("#E6DCC6"))
        weave(c, ticket, "paper", 1.2)
        c.drawPath(ticket, stroke(INK, 5))
        text(c, "MAISON LUNE", tx + 180, 620, font("type", 34), fill(INK, 0.6), align="center")
        c.drawLine(tx + 30, 650, tx + 330, 650, stroke(INK, 3, 0.5))
        text(c, table, tx + 180, 760, font("display", 72), fill(INK), align="center")
        text(c, what, tx + 180, 850, font("display", 58), fill("#C03A3A" if what == "CRITIC" else INK), align="center")
        c.drawLine(tx + 30, 880, tx + 330, 880, stroke(INK, 3, 0.5))
        text(c, cover, tx + 180, 940, font("type", 32), fill(INK, 0.8), align="center")
        text(c, f"FIRED 8:{31 + i * 3}", tx + 180, 992, font("type", 30), fill(INK, 0.7), align="center")
        text(c, "Amelie" if i % 2 else "A.D.", tx + 190, 1090, font("serif", 52), fill("#20305E", 0.8), align="center")
        c.drawCircle(tx + 96 + (i * 57) % 170, 1150, 26, fill("#7A4A22", 0.13))
        c.restore()
    c.restore()
    if speed > 0.1:
        for i in range(26):
            y = 540 + i * 26
            c.drawLine(0, y, W, y, stroke("#FFF3DE", 2.5, 0.09 * speed))
    numeral(c, u, 1.2, "III", None)


# ---------------------------------------------------------------------------
# IV: a flambe on the range, and a fish in mid-air

def fish(c, y, angle):
    c.save()
    c.translate(540, y)
    c.rotate(angle)
    body = skia.Path()
    body.moveTo(-200, 0)
    body.cubicTo(-130, -96, 70, -96, 160, -8)
    body.lineTo(160, 8)
    body.cubicTo(70, 96, -130, 96, -200, 0)
    body.close()
    c.drawPath(poly([(150, 0), (262, -84), (240, 0), (262, 84)]), fill("#B9975F"))
    c.drawPath(poly([(150, 0), (262, -84), (240, 0), (262, 84)]), stroke(INK, 7))
    c.drawPath(poly([(-30, -74), (40, -124), (80, -62)]), fill("#B9975F"))
    c.drawPath(body, linear((0, -90), (0, 90), [(0, "#C9A063", 1), (0.55, "#E5D2AC", 1), (1, "#F2E6CE", 1)]))
    c.save()
    c.clipPath(body, doAntiAlias=True)
    for r_ in range(-5, 6):
        for k in range(14):
            cx, cy = -180 + k * 26 + (r_ % 2) * 13, r_ * 17
            arc = skia.Path()
            arc.addArc(skia.Rect.MakeLTRB(cx - 13, cy - 11, cx + 13, cy + 11), 270, 180)
            c.drawPath(arc, stroke("#8A6A3A", 2.5, 0.5))
    for i in range(5):
        c.drawLine(-110 + i * 56, -70, -80 + i * 56, 70, stroke("#5A3216", 12, 0.8))
    c.restore()
    c.drawPath(body, stroke(INK, 7))
    c.drawCircle(-140, -18, 15, fill("#F3EADB"))
    c.drawCircle(-140, -18, 8, fill(INK))
    arc = skia.Path()
    arc.addArc(skia.Rect.MakeLTRB(-136, -46, -84, 46), 120, 120)
    c.drawPath(arc, stroke(INK, 5))
    c.restore()


def shot_iv(c, u):
    burst = max(0.0, 1 - abs(u - 0.32) * 2.2)
    shake = burst * 16
    c.drawRect(skia.Rect.MakeWH(W, H), surface("tile", 1.1))
    c.drawRect(skia.Rect.MakeWH(W, H), fill("#180A05", 0.82 - 0.34 * burst))
    c.save()
    c.translate(math.sin(u * 77) * shake, math.cos(u * 69) * shake)
    # The range: steel, knobs and a ring of blue gas under the pan.
    c.drawRect(skia.Rect.MakeLTRB(-40, 1530, 1120, 2000), surface("steel", 1.1))
    c.drawRect(skia.Rect.MakeLTRB(-40, 1530, 1120, 2000), fill("#120806", 0.45))
    c.drawLine(-40, 1530, 1120, 1530, stroke("#E6E8EE", 5, 0.7))
    for k in range(5):
        x = 170 + k * 185
        c.drawCircle(x, 1800, 42, fill("#1A1A20"))
        c.drawCircle(x, 1800, 42, stroke("#8D9099", 6))
        c.drawLine(x, 1800, x + 22, 1770, stroke("#E6E8EE", 7))
    for k in range(22):
        x = 170 + k * 34
        c.drawPath(poly([(x - 10, 1530), (x + 10, 1530), (x + 2 * math.sin(u * 30 + k), 1490 - 8 * math.sin(u * 40 + k))]), fill("#4A8BFF", 0.85))
    glow(c, (540, 1180), 1050, FLAME, 0.3 + 0.55 * burst, blend=skia.BlendMode.kPlus)
    # Flames: layered tongues, redrawn every frame.
    for k in range(9):
        x = 180 + k * 90
        h = (260 + 90 * math.sin(u * 23 + k * 2.1)) * (0.45 + 1.2 * burst)
        tongue = skia.Path()
        tongue.moveTo(x - 72, 1430)
        tongue.cubicTo(x - 80, 1430 - h * 0.5, x + 26 * math.sin(u * 19 + k), 1430 - h * 0.7, x + 18 * math.sin(u * 14 + k * 3), 1430 - h)
        tongue.cubicTo(x + 70, 1430 - h * 0.6, x + 82, 1430 - h * 0.3, x + 72, 1430)
        tongue.close()
        c.drawPath(tongue, fill(FLAME if k % 2 else "#FF8A3C", 0.9))
        c.drawPath(tongue, fill("#FFF0B8", 0.25))
    for x, sp, ph, sz in EMBERS:  # sparks climbing off the pan
        p = (u * 1.5 + ph) % 1.0
        c.drawCircle(x + 30 * math.sin(p * 9 + ph * 20), 1430 - p * sp * (1 + burst), sz * (1 - p * 0.6), fill("#FFE29A", (1 - p) * 0.9))
    # The pan, copper outside and steel within, with lemon on the rim.
    c.drawOval(skia.Rect.MakeLTRB(100, 1392, 980, 1466), fill("#2A2D36"))
    pan = rrect(100, 1428, 980, 1512, 36)
    c.drawPath(pan, linear((100, 0), (980, 0), [(0, "#A85F36", 1), (0.5, "#E2A06E", 1), (1, "#7A4226", 1)]))
    c.drawPath(pan, stroke(INK, 9))
    c.drawLine(960, 1460, 1500, 1570, stroke("#3A3A42", 40))
    c.drawLine(960, 1450, 1500, 1560, stroke("#8D9099", 7, 0.7))
    fish(c, 1250 - math.sin(span(u, 0, 1.4) * math.pi) * 520, u * 340)
    c.restore()
    numeral(c, u, 0.3, "IV", None)


# ---------------------------------------------------------------------------
# V: a plate fired across the pass

def pass_top(c):
    """The pass: brushed steel, warmed by the heat lamps."""
    c.drawRect(skia.Rect.MakeWH(W, H), surface("steel", 1.4))
    c.drawRect(skia.Rect.MakeWH(W, H), fill("#2A1A12", 0.62))
    glow(c, (540, 1040), 900, FLAME, 0.26)
    c.drawLine(0, 470, W, 470, stroke("#000000", 8, 0.5))
    c.drawLine(0, 476, W, 476, stroke("#FFFFFF", 3, 0.15))


def main_course(c, x, y):
    """Course five: duck, fanned, with a sauce and a little garden."""
    swipe = skia.Path()
    swipe.moveTo(x - 200, y + 110)
    swipe.quadTo(x, y + 190, x + 200, y + 70)
    c.drawPath(swipe, stroke("#5A1626", 30))
    for k in range(5):  # five slices, pink in the middle
        c.save()
        c.rotate(-34 + k * 15, x - 40, y + 190)
        c.drawPath(rrect(x - 66, y - 130, x + 6, y + 70, 26), fill("#6A3020"))
        c.drawPath(rrect(x - 56, y - 118, x - 6, y + 58, 20), fill("#C96E6E"))
        c.restore()
    c.drawPath(rrect(x + 70, y - 70, x + 206, y + 30, 24), fill("#E3B868"))
    c.drawOval(skia.Rect.MakeLTRB(x + 70, y - 88, x + 206, y - 40), fill("#F4D88C"))
    for k in range(8):
        a = k * 2.4
        px, py = x - 170 + (k * 53) % 150, y - 170 + (k * 37) % 70
        c.drawLine(px, py, px + math.cos(a) * 34, py + math.sin(a) * 34, stroke("#6E9A3E", 7))
    for k in range(6):
        c.drawCircle(x + 90 + k * 30, y + 110 - k * 12, 6 + (k % 2) * 3, fill("#F2C14E"))


def shot_v(c, u):
    pass_top(c)
    # The service bell, brass, shaking on the strike, with the plate's reflection under it.
    ring = max(0.0, 1 - u * 3)
    c.save()
    c.translate(840 + math.sin(u * 90) * 12 * ring, 620)
    c.drawOval(skia.Rect.MakeLTRB(-130, 66, 130, 112), fill("#000000", 0.45))
    bell = poly([(-96, 66), (96, 66), (70, -30), (34, -66), (-34, -66), (-70, -30)])
    c.drawPath(bell, linear((-96, 0), (96, 0), [(0, "#8C6226", 1), (0.35, "#FFE29A", 1), (0.6, GOLD, 1), (1, "#6E4A18", 1)]))
    c.drawCircle(0, -76, 18, fill(GOLD))
    c.drawPath(rrect(-116, 58, 116, 84, 10), fill("#3B2416"))
    c.restore()
    x = lerp(-420, 540, ease_out(span(u, 0.03, 0.42), 3))
    streak = 1 - span(u, 0.03, 0.42)
    for k in range(6):
        c.drawCircle(x - k * 90, 1040, 330, fill(PORCELAIN, 0.12 * streak * (1 - k / 6)))
    plate(c, x, 1040, 330)
    main_course(c, x - 10, 1020)
    numeral(c, u, 0.05, "V", None)


# ---------------------------------------------------------------------------
# VI: her notebook

HISTORY = ["I.   Oysters. Competent.", "II.  A soup with ambitions.", "III. I have had worse.", "IV.  The fish is brave."]


def notebook(c, x0, y0, x1, y1, lines, first_y, step, size=54):
    """The open page: ruled lines, a margin, a ribbon, the ghost of a wine glass, and everything so far."""
    page = box(x0, y0, x1, y1)
    soft_shadow(c, page, 10, 16, 16, 0.6)
    c.drawPath(page, fill(LINEN))
    weave(c, page, "paper", 1.4)
    y = first_y + step + 14
    while y < y1 - 20:
        c.drawLine(x0 + 20, y - step + 14 - step, x1 - 20, y - step + 14 - step, stroke("#8FA6BE", 2.5, 0.5))
        y += step
    c.drawLine(x0 + 78, y0, x0 + 78, y1, stroke("#C25050", 3, 0.6))
    c.drawCircle(x1 - 150, y0 + 170, 92, stroke("#6E1F2C", 8, 0.2))
    c.drawCircle(x1 - 150, y0 + 170, 84, stroke("#6E1F2C", 3, 0.14))
    c.drawRect(skia.Rect.MakeLTRB(x1 - 90, y0 - 30, x1 - 62, y0 + 110), fill(WINE))
    f = font("serif", size)
    f.setEmbolden(True)
    for i, row in enumerate(lines):
        text(c, row, x0 + 104, first_y + i * step, f, fill("#20242E", 0.9))
    return f


def shot_vi(c, u):
    c.drawRect(skia.Rect.MakeWH(W, H), surface("wood", 1.4))
    c.drawRect(skia.Rect.MakeWH(W, H), fill("#120806", 0.45))
    glow(c, (540, 960), 900, FLAME, 0.2)
    c.save()
    c.rotate(-4, 540, 960)
    f = notebook(c, 70, 440, 1010, 1560, HISTORY, 590, 100)
    fine_y = 590 + 4 * 100
    text(c, "V.   Fine.", 174, fine_y, f, fill("#20242E", 0.9))
    x0 = 174 + f.measureText("V.   ")
    x1 = x0 + f.measureText("Fine.")
    k = ease_out(span(u, 0.25, 0.5), 2)
    if k:
        c.drawLine(x0 - 10, fine_y - 16, lerp(x0, x1 + 14, k), fine_y - 22, stroke("#C03A3A", 9))
    tip = (lerp(x0, x1 + 14, k), fine_y - 22)
    fountain_pen(c, tip[0], tip[1])
    c.restore()
    numeral(c, u, 0.02, "VI", None)


# ---------------------------------------------------------------------------
# The clue: half a second under the heat lamps

def shot_clue(c, u):
    """Two desserts side on. Nothing says whose is whose."""
    pass_top(c)
    c.drawRect(skia.Rect.MakeLTRB(0, 0, W, 880), linear((0, 0), (0, 880), [(0, "#120A08", 1), (1, "#241814", 1)]))
    for k in range(4):
        c.drawLine(0, 300 + k * 150, W, 300 + k * 150, stroke("#FFE7C4", 2, 0.03))
    c.drawLine(0, 880, W, 880, stroke("#8A7A66", 5))
    for x, smudged in ((290, False), (790, True)):
        glow(c, (x, 1000), 420, FLAME, 0.34)
        dessert(c, x, 1060, 134, gold=not smudged, smudge=smudged)
        c.drawLine(x, 240, x, 480, stroke("#6C6A7A", 16))
        lamp = poly([(x - 130, 590), (x + 130, 590), (x + 70, 480), (x - 70, 480)])
        c.drawPath(lamp, linear((x - 130, 0), (x + 130, 0), [(0, "#3A3D48", 1), (0.4, "#6A6D78", 1), (1, "#1E2028", 1)]))
        c.drawRect(skia.Rect.MakeLTRB(x - 104, 586, x + 104, 606), fill("#FFD79A"))


# ---------------------------------------------------------------------------
# VII: the only slow shot. A dome, a fork and a sentence that doesn't finish.

WRITE_A, WRITE_B, WRITE_C = "VII. Chocolate, salt", "and smoke. Finally,", "a reason to"
BOOK_Y = 1150


def handwriting(c, u):
    """Her sentence, written at the pace she reads it. Returns where the nib is."""
    f = font("serif", 66)
    f.setEmbolden(True)
    d = LAST_WORD_AT - VII
    total = len(WRITE_A) + len(WRITE_B) + len(WRITE_C)
    written = round(total * span(u, 1.3, d - 0.1))
    y = BOOK_Y + 110
    tip = (150.0, y)
    for row in (WRITE_A, WRITE_B, WRITE_C):
        shown = row[: max(0, written)]
        if shown:
            text(c, shown, 140, y, f, fill("#20242E", 0.92))
            tip = (140 + f.measureText(shown) + 6, y - 4)
        written -= len(row)
        y += 92
    k = ease_out(span(u, d - 0.02, d + 0.42), 2)
    if k:
        scrawl = skia.Path()
        x0, y0 = 140 + f.measureText(WRITE_C) + 8, BOOK_Y + 110 + 92 * 2 - 18
        scrawl.moveTo(x0, y0)
        qx, qy = x0, y0
        for i in range(1, 16):
            q = i / 15 * k
            qx, qy = x0 + q * 640, y0 + q * q * 500 + math.sin(q * 26) * 18 * (1 - q * 0.5)
            scrawl.lineTo(qx, qy)
        c.drawPath(scrawl, stroke("#20242E", 6))
        tip = (qx, qy)
    return tip


def smoke_curl(c, x, y, u, height=420, a=0.1):
    for k in range(2):
        p = skia.Path()
        p.moveTo(x, y)
        for i in range(1, 9):
            p.lineTo(x + math.sin(i * 0.8 + u * 1.6 + k * 1.3) * (10 + i * 11), y - i * height / 8)
        paint = stroke("#F4F0EA", 16 - k * 5, a)
        paint.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 14))
        c.drawPath(p, paint)


def shot_vii(c, u):
    d = LAST_WORD_AT - VII
    cam = Camera(x=540 + noise1(u * 0.5, 2) * 5, y=lerp(760, 1040, ease_in_out(span(u, 0.2, d))), zoom=lerp(1.2, 1.0, ease_in_out(span(u, 0.2, d))), focus=1.0, aperture=14)
    with layer(c, cam, 0.5, extra_blur=30) as lc:
        warm_room(lc, u, 6.7)
    with layer(c, cam, 0.8) as lc:
        wine_glass(lc, 930, 640, 1.0)
        # The candle, just out of focus.
        lc.drawPath(rrect(60, 240, 110, 620, 14), linear((60, 0), (110, 0), [(0, "#E6D9BC", 1), (1, "#B2A488", 1)]))
        flick = 1 + 0.18 * math.sin(u * 17)
        lc.drawOval(skia.Rect.MakeLTRB(68, 156 - 12 * flick, 102, 232), fill("#FFE29A"))
        glow(lc, (85, 200), 420, FLAME, 0.5)
    with layer(c, cam, 1.0) as lc:
        cloth = box(-600, 240, 1700, 2800)
        lc.drawPath(cloth, fill(WINE))
        weave(lc, cloth, "linen", 1.5)
        lc.drawLine(-600, 240, 1700, 240, stroke("#7A3442", 6))
        glow(lc, (500, 640), 840, FLAME, 0.3)
        bite = smooth(span(u, 1.55, 1.75)) * 0.55 + smooth(span(u, 2.75, 2.95)) * 0.45
        dessert(lc, 500, 760, 190, bite=bite, t=u)
        smoke_curl(lc, 500, 590, u)
        lc.save()
        lc.rotate(-2, 540, 1400)
        notebook(lc, 60, BOOK_Y, 1020, 2100, [], BOOK_Y + 110, 92)
        tip = handwriting(lc, u)
        # The pen, following the words, then rolling away after the skid.
        drop = smooth(span(u, d + 0.2, d + 0.6))
        fountain_pen(lc, tip[0] + drop * 60, tip[1] + drop * 170, tilt=drop * 34)
        lc.restore()
        # The fork comes in for a bite, twice, and leaves.
        for start in (1.2, 2.4):
            k = math.sin(math.pi * span(u, start, start + 0.9))
            if k > 0:
                fork_shape(lc, lerp(1160, 690, k), lerp(330, 640, k), -38, 0.9)
    # The candle flickers harder as she runs out of sentence.
    c.drawRect(skia.Rect.MakeWH(W, H), fill("#000000", 0.08 * (1 + math.sin(u * 17)) * span(u, 3.0, d)))
    if u < 0.1:
        c.drawRect(skia.Rect.MakeWH(W, H), fill("#000000", 1 - u * 10))


# ---------------------------------------------------------------------------
# The fork falls, past the tablecloth, to the floor

FLOOR_Y = 1560


def shot_fork(c, u):
    d = AFTER - FORK
    land = 0.92  # slow motion, then it lands
    fall = span(u, 0, land) ** 1.6
    bounce = math.sin(span(u, land, d) * math.pi) * 90 * (1 - span(u, land, d))
    y = lerp(-340, FLOOR_Y + 70, fall) - bounce
    angle = lerp(30, 442, ease_out(fall, 2)) if u < land else 442 - 7 * math.sin((u - land) * 16) * (1 - span(u, land, d))
    c.drawRect(skia.Rect.MakeWH(W, H), linear((0, 0), (0, H), [(0, "#120A08", 1), (0.75, "#1F110C", 1), (1, "#0B0605", 1)]))
    c.drawRect(skia.Rect.MakeLTRB(0, 0, W, FLOOR_Y), linear((0, 0), (0, FLOOR_Y), [(0, FLAME, 0.2), (1, FLAME, 0.03)]))
    # Under the table: its legs, a chair, her shoe, the boards.
    floor = box(0, FLOOR_Y, W, H)
    c.drawPath(floor, surface("wood", 1.6))
    c.drawPath(floor, linear((0, FLOOR_Y), (0, H), [(0, "#000000", 0.25), (1, "#000000", 0.7)]))
    c.drawPath(rrect(120, 200, 196, FLOOR_Y + 30, 12), surface("wood", 0.6))
    c.drawPath(rrect(120, 200, 196, FLOOR_Y + 30, 12), fill("#000000", 0.55))
    c.drawPath(rrect(930, 700, 972, FLOOR_Y + 60, 10), fill("#1E110B"))
    c.drawPath(rrect(790, 900, 826, FLOOR_Y + 22, 10), fill("#150C07"))
    c.drawRect(skia.Rect.MakeLTRB(780, 860, 990, 910), fill("#2A1810"))
    shoe = poly([(300, FLOOR_Y + 8), (470, FLOOR_Y + 8), (470, FLOOR_Y - 26), (420, FLOOR_Y - 60), (372, FLOOR_Y - 30), (320, FLOOR_Y - 98), (304, FLOOR_Y - 96)])
    c.drawPath(shoe, fill("#3A1420"))
    c.drawPath(shoe, stroke("#000000", 5))
    # The hanging edge of the tablecloth.
    hem = poly([(-40, 0), (1120, 0), (1120, 240), (760, 300), (420, 250), (-40, 320)])
    c.drawPath(hem, fill(WINE))
    weave(c, hem, "linen", 1.5)
    for x in (200, 470, 760):
        c.drawLine(x, 0, x + 14, 300, stroke("#000000", 16, 0.18))
    # Her napkin, slipping down after the fork, slower.
    ny = lerp(-260, FLOOR_Y - 40, span(u, 0.2, d) ** 1.4)
    c.save()
    c.rotate(u * 40, 300, ny)
    nap = skia.Path()
    nap.moveTo(120, ny - 40)
    nap.cubicTo(200, ny - 120, 300, ny - 60, 400, ny - 110)
    nap.cubicTo(470, ny - 40, 430, ny + 60, 470, ny + 130)
    nap.cubicTo(360, ny + 90, 260, ny + 150, 150, ny + 110)
    nap.cubicTo(180, ny + 40, 100, ny + 10, 120, ny - 40)
    nap.close()
    c.drawPath(nap, fill(LINEN))
    weave(c, nap, "linen", 1.2)
    c.drawLine(190, ny - 60, 300, ny + 110, stroke("#000000", 10, 0.14))
    c.drawLine(330, ny - 80, 390, ny + 90, stroke("#000000", 8, 0.12))
    c.restore()
    fork_shape(c, 790, y, angle, 1.05)
    glow(c, (800, y), 90, "#FFFFFF", 0.3)
    if land <= u:
        hit = max(0.0, 1 - (u - land) * 4)
        c.drawRect(skia.Rect.MakeWH(W, H), fill("#FFF3DE", 0.14 * hit))


# ---------------------------------------------------------------------------
# After: the empty place, the blue lights, all four staff

def staff_tag(c, x, y, name, role, a):
    if a <= 0:
        return
    w = 196
    c.drawPath(rrect(x - w / 2, y, x + w / 2, y + 62, 8), fill(CREAM, 0.93 * a))
    c.drawPath(rrect(x - w / 2, y, x + w / 2, y + 62, 8), stroke(INK, 4, a))
    text(c, name, x, y + 27, font("display", 20), fill(INK, a), align="center")
    text(c, role, x, y + 52, font("body", 19), fill(INK, 0.7 * a), align="center")


def shot_after(c, u):
    d = TITLE - AFTER
    focus = lerp(1.0, 0.68, smooth(span(u, 0.6, 1.2)))
    cam = Camera(x=540, y=lerp(1120, 1010, ease_in_out(span(u, 0, d))), zoom=lerp(1.12, 1.0, ease_in_out(span(u, 0, d))), focus=focus, aperture=22)
    out = smooth(span(u, d - 0.5, d - 0.15))  # the candle goes out
    with layer(c, cam, 0.68) as lc:
        wall = box(-700, -500, 1800, 2400)
        lc.drawPath(wall, linear((0, 0), (0, 1500), [(0, "#20110C", 1), (1, "#2C1812", 1)]))
        for x in range(-500, 1700, 300):
            lc.drawPath(rrect(x, 330, x + 250, 1500, 8), stroke("#4A2C1E", 12))
        # The kitchen doorway, the light behind it, and everyone frozen in it.
        lc.drawPath(rrect(100, 590, 980, 1490, 12), linear((0, 590), (0, 1490), [(0, "#E8BE82", 0.92), (1, "#B98A52", 0.92)]))
        lc.drawLine(100, 1000, 980, 1000, stroke("#8D9099", 8, 0.5))
        for i in range(7):
            px = 180 + i * 120
            lc.drawLine(px, 590, px, 640, stroke("#6A4A2C", 5))
            lc.drawCircle(px, 640 + 34, 34, fill("#8A5A34"))
        lc.drawPath(rrect(100, 590, 980, 1490, 12), stroke(INK, 14))
        for i, (art, tint, name, role) in enumerate(STAFF):
            x = 228 + i * 208
            suspect(lc, art, tint, (x, 1380), 0.92, mood="shocked")
            staff_tag(lc, x, 1400, name, role, smooth(span(u, 1.0 + i * 0.14, 1.3 + i * 0.14)))
        # The other diners on their feet, in the dark either side.
        for x in (-20, 1090):
            lc.drawCircle(x, 1010, 66, fill("#120A08"))
            lc.drawPath(rrect(x - 110, 1080, x + 110, 1600, 60), fill("#120A08"))
    with layer(c, cam, 1.0) as lc:
        cloth = box(-700, 1530, 1800, 2700)
        lc.drawPath(cloth, fill(WINE))
        weave(lc, cloth, "linen", 1.5)
        lc.drawLine(-700, 1530, 1800, 1530, stroke("#7A3442", 6))
        # Her place: the half-eaten dessert, the glass she barely touched, the notebook, the candle.
        dessert(lc, 440, 1660, 84, bite=1.0)
        lc.save()
        lc.rotate(5, 880, 1650)
        notebook(lc, 720, 1590, 1040, 1800, [], 1640, 40, 20)
        lc.restore()
        wine_glass(lc, 680, 1640, 0.62)
        lc.drawPath(rrect(130, 1290, 170, 1590, 12), linear((130, 0), (170, 0), [(0, "#E6D9BC", 1), (1, "#B2A488", 1)]))
        lc.drawLine(150, 1290, 150, 1264, stroke(INK, 4))
        if out < 1:
            flicker = 1 + 0.2 * math.sin(u * 19)
            lc.drawOval(skia.Rect.MakeLTRB(132, 1206 - 10 * flicker, 168, 1270), fill("#FFE29A", 1 - out))
            glow(lc, (150, 1246), 520 * (1 - out * 0.7), FLAME, 0.4 * (1 - out))
    # The ambulance outside: blue light sweeping the room.
    k = u * 2.4
    if int(k) % 2 == 0:
        glow(c, (lerp(-200, 1280, k % 1.0), 760), 760, "#4A7BFF", 0.5 * (1 - out * 0.5), blend=skia.BlendMode.kPlus)
    c.drawRect(skia.Rect.MakeWH(W, H), fill("#000000", out * 0.88))
    # What happened, typed over it.
    a = smooth(span(u, 0.1, 0.4)) * (1 - out)
    text(c, "9:52 PM", 72, 150, font("type", 58), fill(CREAM, a), tracking=4)
    b = smooth(span(u, 0.3, 0.7)) * (1 - out)
    note = font("serif", 44)
    text(c, "Celeste Hart collapses at Table 1.", 72, 216, note, fill(CREAM, 0.9 * b))
    text(c, "She will recover.", 72, 274, note, fill(GOLD, 0.95 * smooth(span(u, 1.2, 1.7)) * (1 - out)))


# ---------------------------------------------------------------------------
# The title

def shot_title(c, u):
    c.drawRect(skia.Rect.MakeWH(W, H), fill("#070404"))
    # A thread of smoke from the candle that just went out.
    smoke_curl(c, 540, 1760, u, height=1500, a=0.14)
    # Flakes of gold leaf, drifting down.
    for x, y0, sp, r in FLAKES:
        y = (y0 + u * sp) % 1920
        c.save()
        c.rotate(r + u * 50, x, y)
        c.drawRect(skia.Rect.MakeXYWH(x - 5, y - 3, 10, 6), fill(GOLD_LEAF, 0.5 * smooth(span(u, 0.1, 0.7))))
        c.restore()
    a = smooth(span(u, 0.1, 0.6))
    big = font("serif", 172)
    big.setEmbolden(True)
    text(c, "CASE 003", W / 2, 640, font("type", 44), fill(GOLD, a), align="center", tracking=10)
    k = ease_out(span(u, 0.0, 0.7), 3)
    text(c, "The Last", W / 2, 880 - (1 - k) * 26, big, fill(CREAM, a), align="center")
    text(c, "Course", W / 2, 1060 - (1 - k) * 26, big, fill(GOLD, a), align="center")
    b = smooth(span(u, 0.8, 1.4))
    tag = font("serif", 50)
    text(c, "Seven courses.", W / 2, 1220, tag, fill(CREAM, 0.9 * b), align="center")
    text(c, "Four people touched that dinner.", W / 2, 1290, tag, fill(CREAM, 0.9 * b), align="center")


# ---------------------------------------------------------------------------
# The cut

SHOTS = ((EST, shot_est), (I, shot_i), (II, shot_ii), (III, shot_iii), (IV, shot_iv), (V, shot_v), (VI, shot_vi), (CLUE, shot_clue), (VII, shot_vii), (FORK, shot_fork), (AFTER, shot_after), (TITLE, shot_title))


def film_draw(c, t):
    for start, shot in reversed(SHOTS):
        if t >= start:
            shot(c, t - start)
            break
    for i, (words, _, _, at, tag) in enumerate(LINES):
        if i == 7:  # no caption: her handwriting is on screen, word for word
            continue
        until = CLUE - 0.03 if i == 6 else (LINES[i + 1][3] - 0.05 if i + 1 < len(LINES) else None)
        y = 470 if tag and "AMELIE" in tag else None  # clear of the table, the name tags and the note at the top
        caption(c, t, words, at, at + LINE_LENGTHS[i] - 0.1, tag, until, y=y)


def exposure(t):
    return smooth(span(t, 0, 0.3)) * (1 - smooth(span(t, DURATION - 0.5, DURATION)))


def film_frame(i: int) -> np.ndarray:
    t = i / FPS
    out = finish(render_frame(film_draw, t), i, LOOK, exposure=exposure(t))
    return (out * 255 + 0.5).astype(np.uint8)


# ---------------------------------------------------------------------------
# The sound

def score():
    mix = sound.Mix(DURATION, seed=21)
    rng = mix.rng
    # Outside: the street, with the room and its waltz muffled behind the glass.
    mix.add(sound.street(I + 0.1, rng), 0, gain=0.45)
    muffled = sound.lowpass(sound.murmur(I, rng), 500)
    mix.add(muffled, 0, gain=0.32)
    mix.add(sound.door_chime(rng), I - 0.3, gain=0.5, reverb=0.3)

    # The room: a murmur of diners that thins out as the film closes in on one table.
    murmur = sound.murmur(FORK - I, rng)
    level = np.interp(np.arange(len(murmur)) / sound.SR, [0, VII - I, FORK - I - 0.4, FORK - I], [0.55, 0.5, 0.18, 0.1])
    mix.add(murmur * level[:, None], I, reverb=0.2)

    # The waltz: two bars a shot, each shot shorter, so the tempo climbs on every cut.
    chords = (("D3", "F3", "A3"), ("G3", "A#3", "D4"), ("A3", "C#4", "E4"), ("D3", "F3", "A3"))
    bars = 0
    starts = (EST, I, II, III, IV, V, VI, CLUE, VII)
    for s0, s1 in zip(starts, starts[1:]):
        length = (s1 - s0) / 2
        for b in range(2):
            wave = sound.waltz_bar(length, chords[bars % 4], rng, lift=s0 / VII)
            mix.add(sound.lowpass(wave, 700) if s0 < I else wave, s0 + b * length, gain=0.3 if s0 < I else 0.5, reverb=0.25)
            bars += 1
    for s in (II, III, IV, V, VI, CLUE, VII):
        mix.add(sound.ceramic(rng), s, gain=0.5, reverb=0.25)

    mix.add(sound.pour(III - II + 0.1, rng), II + 0.1, gain=0.34, reverb=0.2)
    mix.add(sound.printer(1.3, rng), III + 0.05, gain=0.42, pan=0.1)
    mix.add(sound.kitchen(IV - III, rng), III, gain=0.5)
    mix.add(sound.whoosh(rng, 0.7), III + 0.05, gain=0.7)
    mix.add(sound.whoosh(rng, 0.45), III + 0.8, gain=0.6)
    mix.add(sound.flame(rng), IV + 0.1, gain=1.1, reverb=0.3)
    mix.add(sound.service_bell(rng), V + 0.02, gain=0.7, pan=0.4, reverb=0.4)
    mix.add(sound.whoosh(rng, 0.8), V + 0.05, gain=0.7)
    mix.add(sound.pen(0.3, rng), VI + 0.24, gain=0.7)

    # Course seven: the waltz has stopped. One held chord, a pen, and a fork on a plate.
    mix.add(sound.sustained(("D3", "A3", "D4", "F4"), FORK - VII + 0.6, rng), VII, gain=0.34, reverb=0.5)
    mix.add(sound.pen(LAST_WORD_AT - VII - 1.4, rng, soft=True), VII + 1.3, gain=0.3)
    for at in (VII + 1.45, VII + 2.65):
        mix.add(sound.ceramic(rng), at, gain=0.3, reverb=0.25)
    mix.add(sound.pen(0.42, rng), LAST_WORD_AT, gain=0.95)  # the skid

    # The fork: the world drops out, then the ring on the floor, and nothing.
    mix.add(sound.fork_ring(rng), FORK + 0.92, gain=1.0, reverb=0.8)

    # After: a gasp, a chair going over, the siren, a room that's stopped.
    mix.add(sound.gasp(rng), FORK + 1.15, gain=0.5, reverb=0.5)
    mix.add(sound.scrape(rng), AFTER + 0.05, gain=0.6, pan=-0.3, reverb=0.4)
    mix.add(sound.siren(TITLE - AFTER + 1.4, rng), AFTER + 0.1, gain=0.26, reverb=0.5)
    for k in range(4):
        mix.add(sound.heartbeat(rng, 0.8), AFTER + 0.2 + k * 0.95, gain=0.72 - k * 0.04)
    mix.add(sound.candle_out(rng), TITLE - 0.45, gain=0.7)

    # The title: the waltz's first notes again, alone, on a piano.
    for name, at in (("D4", 0.15), ("F4", 0.6), ("A4", 1.05), ("D5", 1.5)):
        mix.add(sound.piano(sound.note(name), 2.4, 0.8), TITLE + at, gain=0.5, reverb=0.7)
    mix.add(sound.impact(rng, root=36.7), TITLE, gain=0.7, reverb=0.7)

    for i, (words, voice, speed, at, tag) in enumerate(LINES):
        v = line(words, voice=voice, speed=speed)
        if i == 7:
            # Cut off mid-word: not a fade, a stop.
            v = v[: sound.seconds(LAST_WORD_AT - at)]
        mix.add(v, at, gain=1.0 if tag and "AMELIE" in tag else 1.25, reverb=0.45 if tag and "AMELIE" in tag else 0.08)
    return mix.master(target_rms_db=-18.0, ceiling_db=-1.0)


def voices():
    for words, voice, speed, _, _ in LINES:
        print(f"{len(line(words, voice=voice, speed=speed)) / sound.SR:.2f}s  {voice}  {words}", flush=True)


CUTS = (I, II, III, IV, V, VI, CLUE, VII, FORK, AFTER, TITLE)


def stills():
    moments = risky_moments([(at, n) for (_, _, _, at, _), n in zip(LINES, LINE_LENGTHS)], CUTS,
                            extra=(0.9, 1.5, 3.2, 5.6, 7.6, 8.5, 10.1, 11.55, 13.8, 15.5, 16.95, 17.7, 18.15, 19.6, 20.6, 23.6))
    print(contact_sheet(film_frame, moments, "case003-film-stills.png", cols=10))


def render(scale):
    render_video("case003-film", "omc_cinema.case003_film:film_frame", DURATION, score(), sound.SR, scale)


if __name__ == "__main__":
    {"film": lambda: render(GAME), "draft": lambda: render(DRAFT), "master": lambda: render(MASTER), "stills": stills, "voices": voices}[sys.argv[1] if len(sys.argv) > 1 else "film"]()
