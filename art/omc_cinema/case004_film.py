"""Case 004, Snowed In: the opening film.

    python -m omc_cinema.case004_film voices     # record the cast and the room, print how long each line runs
    python -m omc_cinema.case004_film stills     # the risky moments, as a contact sheet
    python -m omc_cinema.case004_film draft      # quick low-res film, to check timing
    python -m omc_cinema.case004_film            # the game copy (720 x 1280)
    python -m omc_cinema.case004_film master     # full size, for trailers

A countdown. A closed road, Lily's phone going round the room, then ten numbers
on a metronome, each a different picture, while one sparkler on the cake burns
down like a fuse. On "Happy New Y-" the picture dies mid-word and the film carries
on in sound alone, with only Lily's phone still recording. A music box winds down
in the dark. Then the lights, and the shot of the necklace again, without it.

The film has to agree with the case, so:
  - No snow falls: it stopped at 11:30, which is how the footprints work.
  - One sparkler, not a room of them. A blackout among lit sparklers isn't dark.
  - Otto appears at 23:58 and never in the count: by "ten" he has left the room.
    Most numbers are objects, so nobody's absence stands out.
What it must not show: the breaker, anyone doing anything in the dark, the snowman,
tracks, Otto's cane. Hidden clue: a faint tap beside every other footstep.
"""
from __future__ import annotations

import math
import sys

import numpy as np
import skia
from omc_art.palette import CREAM, INK

from . import sound
from .film import (DRAFT, FPS, GAME, MASTER, Camera, ease_in_out, ease_out, fill, font, glow, layer, lerp, linear, noise1, poly, radial, render_frame,
                   render_video, rrect, smooth, span, stroke, text, W, H)
from .kit import box, caption, contact_sheet, risky_moments, soft_shadow, suspect
from .look import Look, finish
from .textures import surface, weave
from .voice import line, record

ICE = "#9FD8FF"
SNOW = "#E4EEFB"
SNOW_DK = "#7E97C4"
NIGHT = "#070C22"
WARM = "#FFC27A"
AMBER = "#FF9B3D"
HOT = "#FFF3D2"
BRASS = "#C99A4A"
BRASS_LT = "#F2D38E"
LOG_DK = "#2E1A10"
PINE = "#0C2530"
RED = "#C23A3A"
VELVET = "#121C44"
STEEL = "#C7CCD6"
GREEN_GLASS = "#12301F"
BIG = skia.Rect.MakeLTRB(-1000, -1000, 5000, 3200)

LOOK = Look(bloom=0.3, bloom_threshold=0.8, halation=0.22, shadow_tint=(0.015, 0.03, 0.075), highlight_tint=(1.03, 0.99, 0.94),
            contrast=1.14, saturation=1.02, vignette=0.55, grain=0.035)

# One number every 0.85 seconds, on a metronome: a room counting down always rushes a little.
BEAT = 0.85
EST, PHONE, COUNT = 0.0, 3.3, 5.9
NUMBER = [COUNT + i * BEAT for i in range(10)]
YEAR = COUNT + 10 * BEAT
DARK = YEAR + 0.7  # the picture dies just after "Year" begins (measured from the takes)
LIGHTS = DARK + 4.4
TITLE = LIGHTS + 3.2
DURATION = TITLE + 3.4

NARRATOR = "bm_george"
GRETA = "bf_emma"
AGATHA = "bf_isabella"
# (words, voice, speed, starts at, caption tag)
LINES = [
    ("The road closed at six. Nobody in. Nobody out.", NARRATOR, 1.12, 0.15, None),
    ("Four people. One diamond necklace.", NARRATOR, 1.05, 3.4, None),
    ("Nobody move!", "bm_lewis", 1.1, DARK + 0.85, "SIR REGINALD PIKE"),
    ("Nobody leaves this room. Not that any of you can.", AGATHA, 1.0, LIGHTS + 0.15, "DAME AGATHA ASHFORD"),
    ("It's still in this lodge. So is the person who took it.", NARRATOR, 1.02, TITLE + 0.1, None),
]
LINE_LENGTHS = [3.15, 2.34, 0.95, 3.02, 3.2]  # measured by `voices`

NUMBERS = ("Ten!", "Nine!", "Eight!", "Seven!", "Six!", "Five!", "Four!", "Three!", "Two!", "One!")
HAPPY = "Happy New Year!"
CROWD = ("af_heart", "am_puck", "bf_alice", "bf_emma", "bf_isabella", "bf_lily", "bm_george", "bm_lewis")

_rng = np.random.default_rng(404)
STARS = [(x, y, r, p) for x, y, r, p in zip(_rng.uniform(-400, 1500, 240), _rng.uniform(-300, 1000, 240), _rng.uniform(1.2, 3.6, 240), _rng.uniform(0, 6.3, 240))]
TWINKLES = [(x, y, p) for x, y, p in zip(_rng.uniform(-300, 1400, 130), _rng.uniform(1380, 2000, 130), _rng.uniform(0, 6.3, 130))]
FAR_PINES = [(x, _rng.uniform(1120, 1190), _rng.uniform(170, 300), int(_rng.integers(0, 5))) for x in np.arange(-620, 1760, 58.0)]
MID_PINES = [(x, _rng.uniform(1300, 1350), _rng.uniform(420, 640), int(_rng.integers(0, 5))) for x in (-470, -330, -190, -90, 1170, 1270, 1400, 1520)]
FAIRY = [(x, y, r, c, p) for x, y, r, c, p in zip(_rng.uniform(-300, 1400, 34), _rng.uniform(-100, 1900, 34), _rng.uniform(30, 92, 34), _rng.choice([WARM, AMBER, HOT, ICE, WARM], 34), _rng.uniform(0, 6.3, 34))]
SPARKS = [(a, s, l, p, f) for a, s, l, p, f in zip(_rng.uniform(0, math.tau, 110), _rng.uniform(160, 560, 110), _rng.uniform(0.45, 1.0, 110), _rng.uniform(0, 1, 110), _rng.uniform(0, 1, 110))]
CONFETTI = [(x, y, s, r, c, z) for x, y, s, r, c, z in zip(_rng.uniform(-40, 1120, 170), _rng.uniform(0, 2000, 170), _rng.uniform(190, 460, 170), _rng.uniform(0, 360, 170),
                                                           _rng.choice([ICE, SNOW, "#F2D38E", "#E86A8A", "#7CE0B8"], 170), _rng.uniform(9, 24, 170))]
HEADS = [(x, r, h, p) for x, r, h, p in zip(np.arange(-40, 1180, 150.0) + _rng.uniform(-30, 30, 9), _rng.uniform(66, 92, 9), _rng.uniform(0, 1, 9), _rng.uniform(0, 6.3, 9))]
STONES = [(x, y, w, h, c) for x, y, w, h, c in zip(_rng.uniform(0, 1, 90), _rng.uniform(0, 1, 90), _rng.uniform(70, 130, 90), _rng.uniform(44, 74, 90), _rng.choice(["#5C5A5E", "#6E6A68", "#4C4A52", "#7A736C", "#57524F"], 90))]


# ---------------------------------------------------------------------------
# Outside: Pinecrest in the snow

_paths = {}


def ridge(seed, base, rough, steps=7):
    """A mountain line, drawn by repeatedly breaking a straight line in the middle."""
    rng = np.random.default_rng(seed)
    ys = np.array([base + rng.uniform(-rough, 0), base + rng.uniform(-rough, 0)])
    for i in range(steps):
        mid = (ys[:-1] + ys[1:]) / 2 + rng.uniform(-rough, rough, len(ys) - 1) * 0.58 ** i
        joined = np.zeros(len(ys) + len(mid))
        joined[::2], joined[1::2] = ys, mid
        ys = joined
    return list(zip(np.linspace(-700, 1800, len(ys)), ys))


def mountains(c, seed, base, rough, top, bottom):
    pts = ridge(seed, base, rough)
    c.drawPath(poly(pts + [(1800, 2200), (-700, 2200)]), linear((0, base - rough), (0, base + 520), [(0, top, 1), (0.5, bottom, 1), (1, NIGHT, 1)]))
    # The face of every peak turned away from the moon, falling in broken steps from its summit.
    rng = np.random.default_rng(seed + 1)
    for i in range(10, len(pts) - 10, 2):
        x, y = pts[i]
        if y > min(p[1] for p in pts[i - 8:i + 9]) + 1:
            continue
        down = rng.uniform(170, 300)
        steps = [(x, y)]
        for k in range(1, 6):
            steps.append((x - k * 12 + rng.uniform(-18, 18), y + down * k / 5))
        steps.append((x - down * 0.95, y + down))
        steps.append((x - down * 0.46, y + down * 0.34))
        c.drawPath(poly(steps), fill("#16244E", 0.42))
        c.drawLine(x, y, steps[2][0], steps[2][1], stroke("#FFFFFF", 3, 0.3))


def pine_paths(variant):
    """A snow-loaded tree one unit tall, standing on (0, 0), as two paths: the boughs and the snow on them."""
    if variant not in _paths:
        rng = np.random.default_rng(90 + variant)
        dark, snow = skia.Path(), skia.Path()
        tiers = 7
        for i in range(tiers):
            k = (i + 1) / tiers
            top = -1 + i / tiers * 0.9
            w = 0.05 + 0.27 * k
            h = 0.17 + 0.1 * k
            lean = rng.uniform(-0.012, 0.012)
            left, right = -w * rng.uniform(0.9, 1.08), w * rng.uniform(0.9, 1.08)
            edge = [(lerp(right, left, j / 6), top + h + (0.022 if j % 2 else -0.02)) for j in range(7)]
            dark.addPath(poly([(lean, top)] + edge))
            lower = [(lerp(right * 0.8, left * 0.8, j / 6), top + h * 0.56 + (0.03 if j % 2 else -0.02)) for j in range(7)]
            snow.addPath(poly([(lean, top - 0.012)] + lower))
        dark.addRect(skia.Rect.MakeLTRB(-0.018, -0.1, 0.018, 0))
        _paths[variant] = (dark, snow)
    return _paths[variant]


def pine(c, x, y, h, variant, white=SNOW, dark=PINE):
    d, s = pine_paths(variant)
    c.save()
    c.translate(x, y)
    c.scale(h, h)
    c.drawPath(d, fill(dark))
    c.drawPath(s, fill(white))
    c.restore()


def aurora_lights(c, u, a=1.0):
    """The northern lights, in the sky over a necklace named after them."""
    for i, x in enumerate(range(-420, 1520, 16)):
        base = 600 + 130 * math.sin(x * 0.0044 + u * 0.32) + 44 * math.sin(x * 0.013 - u * 0.5)
        tall = 300 + 150 * math.sin(x * 0.0071 + u * 0.4 + 1.3) + 60 * math.sin(x * 0.03 + u)
        c.drawRect(skia.Rect.MakeLTRB(x, base - tall, x + 17, base),
                   linear((0, base - tall), (0, base), [(0, "#6A58FF", 0), (0.55, "#3BB8C9", 0.2 * a), (1, "#4DFFB0", 0.44 * a)], blend=skia.BlendMode.kPlus))


def sky(c, u):
    c.drawRect(BIG, linear((0, -300), (0, 1400), [(0, "#040818", 1), (0.5, "#0B1A44", 1), (0.82, "#1F3A78", 1), (1, "#3D5C9C", 1)]))
    for x, y, r, p in STARS:
        c.drawCircle(x, y, r, fill("#FFFFFF", (0.45 + 0.4 * math.sin(u * 2.6 + p)) * (1 - span(y, 500, 1000) * 0.7)))
    # The moon: small, high and cold.
    glow(c, (850, 250), 420, ICE, 0.42)
    c.drawCircle(850, 250, 70, fill("#F3F7FF"))
    for x, y, r in ((826, 232, 15), (872, 268, 20), (838, 288, 9)):
        c.drawCircle(x, y, r, fill("#C3D0E4", 0.7))


def logs(c, shape):
    """Stacked logs filling a shape: wood grain, a dark seam and a catch of light under each one."""
    bounds = shape.getBounds()
    c.drawPath(shape, surface("wood", 1.0))
    c.drawPath(shape, fill("#2A1508", 0.52))
    c.save()
    c.clipPath(shape, doAntiAlias=True)
    y = bounds.top()
    while y < bounds.bottom():
        c.drawLine(bounds.left(), y, bounds.right(), y, stroke("#0F0705", 6, 0.9))
        c.drawLine(bounds.left(), y + 7, bounds.right(), y + 7, stroke("#B5803F", 3, 0.3))
        y += 40
    c.restore()


def window(c, x0, y0, x1, y1, people=()):
    r = skia.Rect.MakeLTRB(x0, y0, x1, y1)
    c.drawRect(r, linear((0, y0), (0, y1), [(0, "#FFDD9A", 1), (1, "#FF9F4A", 1)]))
    c.save()
    c.clipRect(r)
    for px, s in people:
        c.drawCircle(px, y1 - 62 * s, 25 * s, fill("#6A3218"))
        c.drawPath(rrect(px - 38 * s, y1 - 40 * s, px + 38 * s, y1 + 40, 20 * s), fill("#6A3218"))
    c.restore()
    c.drawLine((x0 + x1) / 2, y0, (x0 + x1) / 2, y1, stroke("#23110A", 9))
    c.drawLine(x0, (y0 + y1) / 2 - 12, x1, (y0 + y1) / 2 - 12, stroke("#23110A", 7))
    c.drawRect(r, stroke("#1A0C07", 13))
    c.drawPath(rrect(x0 - 16, y1 - 6, x1 + 16, y1 + 18, 9), fill(SNOW))
    glow(c, ((x0 + x1) / 2, (y0 + y1) / 2), (x1 - x0) * 1.5, WARM, 0.36)


def lumpy(a, b, height, seed, drop=26):
    """A band of settled snow from a to b: rounded on top, hanging in soft lobes along the bottom."""
    (ax, ay), (bx, by) = a, b
    rng = np.random.default_rng(seed)
    n = 16
    top = [(lerp(ax, bx, i / n), lerp(ay, by, i / n) - height * (0.9 + 0.2 * math.sin(i * 1.7 + seed)) * (1 - 0.15 * abs(i / n - 0.5))) for i in range(n + 1)]
    p = skia.Path()
    p.moveTo(*top[0])
    for q0, q1 in zip(top, top[1:]):
        p.quadTo(q0[0], q0[1] - 6, (q0[0] + q1[0]) / 2, (q0[1] + q1[1]) / 2)
    p.lineTo(*top[-1])
    p.lineTo(bx, by)
    for i in range(n - 1, -1, -1):
        x, y = lerp(ax, bx, (i + 0.5) / n), lerp(ay, by, (i + 0.5) / n)
        nx, ny = lerp(ax, bx, i / n), lerp(ay, by, i / n)
        p.quadTo(x, y + rng.uniform(4, drop), nx, ny)
    p.close()
    return p


def icicles(c, a, b, seed, count=16):
    (ax, ay), (bx, by) = a, b
    rng = np.random.default_rng(seed)
    for i in range(count):
        k = (i + 0.5) / count + rng.uniform(-0.02, 0.02)
        x, y = lerp(ax, bx, k), lerp(ay, by, k)
        n = rng.uniform(16, 58)
        c.drawPath(poly([(x - 6, y), (x + 6, y), (x + rng.uniform(-1.5, 1.5), y + n)]), fill("#CFE6FA", 0.9))
        c.drawLine(x - 2, y + 2, x, y + n * 0.7, stroke("#FFFFFF", 1.5, 0.7))


def fairy_string(c, pts, u, spacing=46, r=6):
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        c.drawLine(x0, y0, x1, y1, stroke("#1A0C07", 3, 0.8))
        n = int(math.hypot(x1 - x0, y1 - y0) / spacing)
        for i in range(n):
            x, y = lerp(x0, x1, i / n), lerp(y0, y1, i / n) + 8
            on = 0.72 + 0.28 * math.sin(u * 3 + i * 1.3 + x * 0.02)
            c.drawCircle(x, y, r, fill(HOT, on))
            glow(c, (x, y), r * 7, WARM, 0.5 * on)


def lodge(c, u):
    # The chimney, its stone, and its smoke going straight up: not a breath of wind tonight.
    for k in range(3):
        paint = stroke("#C9D6EC", 34 + k * 22, 0.05)
        paint.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 22))
        p = skia.Path()
        p.moveTo(820, 560)
        for i in range(1, 8):
            p.lineTo(820 + 22 * math.sin(i * 0.8 + u * 0.7 + k) + i * 3, 560 - i * 96)
        c.drawPath(p, paint)
    stack = box(756, 556, 884, 800)
    c.drawPath(stack, fill("#3A3638"))
    weave(c, stack, "paper", 1.6)
    for j in range(9):
        for i in range(4):
            c.drawPath(rrect(760 + i * 31 + (j % 2) * 14, 566 + j * 26, 786 + i * 31 + (j % 2) * 14, 588 + j * 26, 5), stroke("#17151A", 3, 0.8))
    c.drawPath(lumpy((744, 556), (896, 556), 34, 3, 12), fill(SNOW))
    # The gable: logs, and a wall of glass under the ridge with the party going on behind it.
    logs(c, poly([(-20, 1046), (540, 596), (1100, 1046)]))
    glass = poly([(280, 1010), (540, 716), (800, 1010)])
    c.drawPath(glass, linear((0, 716), (0, 1010), [(0, "#FFE5AC", 1), (1, "#FFA95A", 1)]))
    c.save()
    c.clipPath(glass)
    for px, py, s in ((420, 1010, 1.0), (500, 1010, 1.1), (600, 1010, 0.95), (672, 1010, 1.05)):
        c.drawCircle(px, py - 76 * s, 26 * s, fill("#7A3C1C"))
        c.drawPath(rrect(px - 40 * s, py - 52 * s, px + 40 * s, py + 30, 22 * s), fill("#7A3C1C"))
    c.restore()
    for x in (397, 540, 683):
        c.drawLine(x, 1012, x, 1010 - (800 - abs(540 - x) - 397) * 0.0 - (1 - abs(x - 540) / 260) * 294, stroke("#1A0C07", 9))
    c.drawLine(300, 900, 780, 900, stroke("#1A0C07", 7))
    c.drawPath(glass, stroke("#1A0C07", 13))
    glow(c, (540, 880), 420, WARM, 0.4)
    # The lower floor.
    logs(c, box(10, 1046, 1070, 1380))
    for x0, x1, people in ((60, 240, ((150, 1.0),)), (292, 412, ()), (668, 788, ((730, 0.9),)), (840, 1020, ((900, 1.0), (975, 0.9)))):
        window(c, x0, 1150, x1, 1300, people)
    # The door, under a lantern, with a wreath.
    c.drawPath(rrect(462, 1130, 618, 1380, 8), surface("wood", 0.7))
    c.drawPath(rrect(462, 1130, 618, 1380, 8), fill("#1E0E08", 0.55))
    c.drawPath(rrect(462, 1130, 618, 1380, 8), stroke("#110805", 10))
    c.drawCircle(540, 1216, 40, stroke("#16402C", 18))
    c.drawCircle(540, 1216, 40, stroke("#2F6E4E", 5, 0.8))
    c.drawCircle(540, 1186, 7, fill(RED))
    c.drawPath(rrect(524, 1090, 556, 1128, 6), fill("#FFD892"))
    c.drawPath(rrect(524, 1090, 556, 1128, 6), stroke("#1A0C07", 5))
    glow(c, (540, 1110), 180, WARM, 0.55)
    # The balcony and the sign along it.
    c.drawRect(skia.Rect.MakeLTRB(-10, 1020, 1090, 1060), fill("#1E0F08"))
    for x in range(10, 1080, 38):
        c.drawPath(rrect(x, 962, x + 15, 1024, 5), fill("#3A2214"))
    c.drawRect(skia.Rect.MakeLTRB(-10, 952, 1090, 970), fill("#3A2214"))
    c.drawPath(lumpy((-16, 952), (1096, 952), 20, 8, 10), fill(SNOW))
    c.drawPath(rrect(246, 1066, 834, 1124, 8), fill("#1A0C07"))
    c.drawPath(rrect(246, 1066, 834, 1124, 8), stroke(BRASS, 3.5, 0.8))
    sign = font("frost", 50)
    text(c, "Pinecrest Lodge", 540, 1112, sign, fill(BRASS_LT), align="center", tracking=2)
    # The roof, under half a metre of snow.
    for side in (-1, 1):
        peak, eave = (540, 556), (540 + side * 650, 1080)
        c.drawPath(poly([peak, eave, (eave[0], eave[1] + 34), (540, 600)]), fill("#180C06"))
        band = lumpy(eave if side < 0 else peak, peak if side < 0 else eave, 84, 12 + side, 22)
        soft_shadow(c, band, 0, 14, 16, 0.5)
        c.drawPath(band, linear((0, 470), (0, 1080), [(0, "#F4F8FF", 1), (0.7, SNOW, 1), (1, "#A9BFE2", 1)]))
        icicles(c, (eave[0] - side * 2, eave[1] + 4), (540 + side * 90, 638), 30 + side, 20)
    fairy_string(c, [(-110, 1092), (540, 572), (1190, 1092)], u, spacing=44, r=5)
    # Snow banked against the walls.
    c.drawPath(lumpy((-300, 1420), (1400, 1420), 62, 21, 4), fill("#C9DAF2"))


def snowfield(c, u):
    field = box(-1000, 1370, 2200, 2800)
    c.drawPath(field, linear((0, 1370), (0, 2200), [(0, "#CBDCF4", 1), (0.5, "#8DA6D2", 1), (1, "#4E659B", 1)]))
    # The windows' light lying on the snow.
    for x0, x1 in ((60, 240), (292, 412), (462, 618), (668, 788), (840, 1020)):
        c.drawPath(poly([(x0, 1392), (x1, 1392), (x1 + (x1 - 540) * 0.8, 1760), (x0 + (x0 - 540) * 0.8, 1760)]),
                   linear((0, 1392), (0, 1760), [(0, AMBER, 0.42), (1, AMBER, 0)]))
    # Long soft drifts. Not one mark on them.
    for i, (x, y, w, h) in enumerate(((-140, 1510, 760, 44), (720, 1590, 880, 56), (150, 1730, 980, 70), (-300, 1900, 1100, 90))):
        c.drawOval(skia.Rect.MakeLTRB(x, y, x + w, y + h), fill("#FFFFFF", 0.16))
        c.drawOval(skia.Rect.MakeLTRB(x + 30, y + h * 0.56, x + w - 10, y + h * 1.5), fill("#2C4478", 0.14))
    for x, y, p in TWINKLES:
        on = max(0.0, math.sin(u * 4.1 + p * 7))
        if on > 0.4:
            c.drawCircle(x, y, 2.6, fill("#FFFFFF", on))


def exterior(c, cam, u, aurora=1.0):
    """Everything from the sky to the near trees. Sharp all the way back: it's a clear, still night."""
    with layer(c, cam, 0.05) as lc:
        sky(lc, u)
    with layer(c, cam, 0.05, extra_blur=16) as lc:
        aurora_lights(lc, u, aurora)
    with layer(c, cam, 0.14) as lc:
        mountains(lc, 7, 700, 300, "#D3E0F4", "#3C5488")
    with layer(c, cam, 0.26) as lc:
        mountains(lc, 19, 900, 170, "#A9BEDF", "#253A6A")
        for x, y, h, v in FAR_PINES[::2]:
            pine(lc, x, y, h * 0.8, v, white="#6E88B6", dark="#0D2036")
    with layer(c, cam, 0.5) as lc:
        for x, y, h, v in FAR_PINES:
            pine(lc, x, y + 120, h, v, white="#A5BADC", dark="#0B1F30")
    with layer(c, cam, 0.8) as lc:
        for x, y, h, v in MID_PINES:
            pine(lc, x, y, h, v, white="#CFDDF2")
        lc.drawRect(skia.Rect.MakeLTRB(-1000, 1340, 2200, 1400), linear((0, 1340), (0, 1400), [(0, "#CBDCF4", 0), (1, "#CBDCF4", 1)]))
    with layer(c, cam, 1.0) as lc:
        lodge(lc, u)
        snowfield(lc, u)


def road_closed(c):
    """The barrier at the bottom of the track, going under."""
    for x in (190, 890):
        c.drawPath(rrect(x - 22, 1150, x + 22, 1900, 8), surface("steel", 0.9))
        c.drawPath(rrect(x - 22, 1150, x + 22, 1900, 8), fill("#0A1020", 0.4))
    plate = rrect(120, 1100, 960, 1400, 16)
    soft_shadow(c, plate, 10, 16, 14, 0.6)
    c.drawPath(plate, fill("#F0E9D8"))
    weave(c, plate, "paper", 1.4)
    c.drawPath(rrect(140, 1120, 940, 1380, 8), stroke(RED, 14))
    big = font("display", 118)
    text(c, "ROAD CLOSED", 540, 1290, big, fill(RED), align="center", tracking=2)
    # Rust running down from the bolts.
    for x in (160, 920):
        c.drawCircle(x, 1140, 10, fill("#6A5A48"))
        c.drawLine(x, 1148, x + 3, 1230, stroke("#7A4A22", 7, 0.4))
    board = rrect(70, 1452, 1010, 1556, 10)
    c.save()
    c.clipPath(board, doAntiAlias=True)
    c.drawPath(board, fill("#EDE7DA"))
    for i in range(-2, 16):
        x = 60 + i * 110
        c.drawPath(poly([(x, 1452), (x + 55, 1452), (x + 5, 1556), (x - 50, 1556)]), fill(RED))
    c.restore()
    c.drawPath(board, stroke(INK, 7, 0.8))
    c.drawPath(lumpy((90, 1100), (990, 1100), 58, 31, 12), fill(SNOW))
    c.drawPath(lumpy((50, 1452), (1030, 1452), 36, 33, 14), fill(SNOW))
    icicles(c, (160, 1404), (920, 1404), 41, 14)
    # The drift swallowing the legs.
    drift = lumpy((-500, 1640), (1600, 1640), 110, 43, 4)
    drift.addRect(skia.Rect.MakeLTRB(-500, 1640, 1600, 2800))
    c.drawPath(drift, linear((0, 1520), (0, 2200), [(0, "#D9E6F8", 1), (0.3, "#8DA6D2", 1), (1, "#33497E", 1)]))


def shot_est(c, u):
    d = PHONE - EST
    k = ease_in_out(span(u, 0.15, d))
    rack = smooth(span(u, 0.9, 1.5))
    cam = Camera(x=540, y=lerp(1000, 820, k ** 1.3), zoom=lerp(0.6, 1.5, k ** 1.6), focus=1.0, aperture=0)
    exterior(c, cam, u)
    # The sign starts sharp and the lodge soft, then the focus crosses over and the sign drops away.
    near = Camera(x=540, y=lerp(1000, 160, k), zoom=lerp(1.0, 1.7, k), focus=1.0, aperture=0)
    with layer(c, near, 1.0, extra_blur=lerp(0.0, 22.0, rack)) as lc:
        road_closed(lc)
    a = smooth(span(u, 0.3, 0.6)) * (1 - smooth(span(u, d - 0.5, d - 0.2)))
    text(c, "NEW YEAR'S EVE", 72, 150, font("type", 46), fill(CREAM, a), tracking=3)
    text(c, "11:58 PM", 72, 212, font("type", 46), fill(ICE, a), tracking=3)


# ---------------------------------------------------------------------------
# Inside: the lounge, as Lily's phone sees it

def fire(c, x, y, w, h, t):
    """A log fire: each tongue a red-orange body round a yellow one round a pale heart, redrawn every frame."""
    glow(c, (x, y - h * 0.4), w * 2.2, AMBER, 0.5 + 0.12 * math.sin(t * 9))

    def tongue(px, tall, width, sway):
        p = skia.Path()
        p.moveTo(px - width, y)
        p.cubicTo(px - width * 1.3, y - tall * 0.42, px - width * 0.2 + sway * 0.5, y - tall * 0.62, px + sway, y - tall)
        p.cubicTo(px + width * 0.5 + sway * 0.4, y - tall * 0.66, px + width * 1.3, y - tall * 0.36, px + width, y)
        p.close()
        return p

    layers = ((1.0, 1.0, "#D8481C", 0.9), (0.74, 0.72, AMBER, 0.95), (0.46, 0.46, "#FFD76E", 0.95), (0.22, 0.26, "#FFF3D2", 1.0))
    for grow, thin, col, a in layers:
        for k in range(6):
            px = x - w * 0.42 + k * w * 0.168
            tall = h * grow * (0.66 + 0.34 * math.sin(t * (7.3 + k) + k * 2.1)) * (1 - abs(k - 2.5) * 0.11)
            c.drawPath(tongue(px, tall, w * 0.11 * thin, 22 * math.sin(t * 6.1 + k * 3)), fill(col, a))
    for k in range(9):  # sparks going up the flue
        q = (t * 1.3 + k * 0.17) % 1.0
        c.drawCircle(x - w * 0.3 + (k * 37) % int(w * 0.6) + math.sin(q * 9 + k) * 16, y - q * h * 1.3, 4 * (1 - q) + 1, fill("#FFD76E", 1 - q))
    for i, (dx, angle) in enumerate(((-0.24, 6), (0.2, -8), (0.0, 2))):
        c.save()
        c.rotate(angle, x + dx * w, y)
        c.drawPath(rrect(x + dx * w - w * 0.28, y - 26, x + dx * w + w * 0.28, y + 24, 22), surface("wood", 0.5))
        c.drawPath(rrect(x + dx * w - w * 0.28, y - 26, x + dx * w + w * 0.28, y + 24, 22), fill("#120704", 0.55))
        c.drawPath(rrect(x + dx * w - w * 0.27, y - 26, x + dx * w + w * 0.27, y - 12, 7), fill(AMBER, 0.5))
        c.restore()


def wall_clock(c, cx, cy, r, seconds, hour=11.97, minute=59.0):
    """A brass-rimmed station clock. `seconds` is where the red hand is."""
    disc = skia.Path()
    disc.addCircle(cx, cy, r)
    soft_shadow(c, disc, r * 0.03, r * 0.05, r * 0.06, 0.65)
    c.drawPath(disc, linear((cx - r, cy - r), (cx + r, cy + r), [(0, BRASS_LT, 1), (0.5, BRASS, 1), (1, "#6E4A18", 1)]))
    c.drawCircle(cx, cy, r * 0.91, fill("#EFE6D2"))
    c.drawCircle(cx, cy, r * 0.91, stroke("#5A3C14", r * 0.012))
    numerals = ("XII", "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X", "XI")
    f = font("serif", r * 0.17)
    f.setEmbolden(True)
    for i, n in enumerate(numerals):
        a = i * math.tau / 12 - math.pi / 2
        text(c, n, cx + math.cos(a) * r * 0.72, cy + math.sin(a) * r * 0.72 + r * 0.06, f, fill("#20180E"), align="center")
    for i in range(60):
        a = i * math.tau / 60
        long = i % 5 == 0
        c.drawLine(cx + math.cos(a) * r * (0.81 if long else 0.84), cy + math.sin(a) * r * (0.81 if long else 0.84), cx + math.cos(a) * r * 0.88, cy + math.sin(a) * r * 0.88,
                   stroke("#20180E", r * (0.012 if long else 0.005)))
    text(c, "PINECREST", cx, cy + r * 0.3, font("type", r * 0.08), fill("#20180E", 0.7), align="center", tracking=r * 0.012)

    def hand(angle, length, width, colour, tail=0.14):
        a = angle - math.pi / 2
        c.drawLine(cx - math.cos(a) * r * tail, cy - math.sin(a) * r * tail, cx + math.cos(a) * r * length, cy + math.sin(a) * r * length, stroke(colour, r * width))

    hand(hour / 12 * math.tau, 0.48, 0.03, "#14100A")
    hand(minute / 60 * math.tau, 0.72, 0.02, "#14100A")
    hand(seconds / 60 * math.tau, 0.8, 0.008, RED, 0.2)
    c.drawCircle(cx, cy, r * 0.03, fill(BRASS_LT))
    c.drawCircle(cx, cy, r * 0.03, stroke("#14100A", r * 0.006))
    # The dome of glass over it.
    c.drawOval(skia.Rect.MakeLTRB(cx - r * 0.74, cy - r * 0.78, cx + r * 0.1, cy - r * 0.2), fill("#FFFFFF", 0.06))


def mini_aurora(c, x, y, s, t):
    """The necklace as seen from across the room: a loop of hard white points."""
    for i in range(17):
        p = i / 16 * 2 - 1
        px, py = x + 62 * s * p, y + 118 * s * (1 - abs(p) ** 1.8)
        c.drawCircle(px, py, (5 + 3 * (1 - abs(p))) * s, fill("#F2F8FF"))
        if math.sin(t * 7 + i * 2.3) > 0.7:
            glow(c, (px, py), 42 * s, "#FFFFFF", 0.8)
    c.drawPath(poly([(x, y + 126 * s), (x + 14 * s, y + 156 * s), (x, y + 186 * s), (x - 14 * s, y + 156 * s)]), fill("#FFFFFF"))
    glow(c, (x, y + 150 * s), 80 * s, ICE, 0.7)


def display_case(c, x, floor, t):
    """Plinth, brass and glass, with a lamp in the lid."""
    plinth = rrect(x - 150, floor - 520, x + 150, floor, 6)
    c.drawPath(plinth, surface("wood", 0.8))
    c.drawPath(plinth, fill("#1A0A06", 0.5))
    c.drawPath(plinth, stroke(BRASS, 4, 0.7))
    c.drawPath(rrect(x - 96, floor - 300, x + 96, floor - 236, 4), linear((0, floor - 300), (0, floor - 236), [(0, BRASS_LT, 1), (1, BRASS, 1)]))
    text(c, "THE AURORA", x, floor - 258, font("type", 26), fill("#20180E"), align="center", tracking=2)
    pane = skia.Rect.MakeLTRB(x - 170, floor - 960, x + 170, floor - 520)
    c.drawRect(pane, linear((0, pane.top()), (0, pane.bottom()), [(0, "#26315E", 1), (1, VELVET, 1)]))
    c.drawPath(poly([(x - 96, floor - 520), (x - 60, floor - 830), (x + 60, floor - 830), (x + 96, floor - 520)]), fill("#0C1330"))
    mini_aurora(c, x, floor - 800, 1.2, t)
    glow(c, (x, floor - 900), 330, ICE, 0.3)
    c.drawPath(poly([(x - 150, floor - 960), (x - 60, floor - 960), (x - 160, floor - 520), (x - 170, floor - 520)]), fill("#FFFFFF", 0.09))
    c.drawRect(pane, stroke(BRASS, 9))
    c.drawPath(rrect(x - 186, floor - 990, x + 186, floor - 952, 6), linear((0, floor - 990), (0, floor - 952), [(0, BRASS_LT, 1), (1, "#7A5A24", 1)]))


def garland(c, x0, x1, y, u, droop=78):
    """Pine boughs swagged along the wall, with fairy lights in them."""
    pts = []
    for i in range(int((x1 - x0) / 300)):
        a = x0 + i * 300
        for k in range(9):
            q = k / 8
            pts.append((a + q * 300, y + droop * 4 * q * (1 - q)))
    for j, (x, yy) in enumerate(pts):
        for k in range(6):
            n = (j * 7 + k * 13) % 11
            c.drawLine(x, yy, x + math.cos(k * 1.05 + j) * 38, yy + math.sin(k * 1.05 + j) * 28 + 8, stroke("#16402C" if n % 2 else "#0F2E20", 11))
    fairy_string(c, pts, u, spacing=34, r=5)


def stone_chimney(c, x0, y0, x1, y1):
    c.drawPath(box(x0, y0, x1, y1), fill("#3A3638"))
    w, h = x1 - x0, y1 - y0
    for sx, sy, sw, sh, col in STONES:
        px, py = x0 + sx * (w - 60), y0 + sy * (h - 40)
        c.drawPath(rrect(px, py, px + sw, py + sh, 12), fill(col))
        c.drawPath(rrect(px, py, px + sw, py + sh, 12), stroke("#1C1A20", 4, 0.7))
        c.drawLine(px + 10, py + 6, px + sw - 12, py + 6, stroke("#FFFFFF", 3, 0.09))


def armchair_back(c, x, floor):
    back = rrect(x - 190, floor - 660, x + 190, floor - 40, 70)
    c.drawPath(back, linear((x - 190, 0), (x + 190, 0), [(0, "#3A1A14", 1), (0.6, "#6E2F22", 1), (1, "#451E17", 1)]))
    weave(c, back, "linen", 1.3)
    for i in range(3):
        for j in range(4):
            c.drawCircle(x - 100 + i * 100, floor - 560 + j * 130, 8, fill("#1E0C08", 0.8))


def armchair_front(c, x, floor):
    seat = rrect(x - 200, floor - 230, x + 200, floor - 20, 34)
    c.drawPath(seat, linear((0, floor - 230), (0, floor - 20), [(0, "#7A382A", 1), (1, "#3A1A14", 1)]))
    for side in (-1, 1):
        arm = rrect(x + side * 214 - 62, floor - 330, x + side * 214 + 62, floor - 10, 46)
        c.drawPath(arm, linear((x + side * 214 - 62, 0), (x + side * 214 + 62, 0), [(0, "#55261C", 1), (1, "#88412F", 1)]))
        c.drawPath(arm, stroke("#1E0C08", 5, 0.8))
    c.drawPath(seat, stroke("#1E0C08", 5, 0.8))


def skis(c, x, y):
    for angle in (-16, 16):
        c.save()
        c.rotate(angle, x, y + 240)
        c.drawPath(rrect(x - 19, y - 170, x + 19, y + 560, 19), linear((x - 19, 0), (x + 19, 0), [(0, "#7A2424", 1), (1, "#C24A3A", 1)]))
        c.drawPath(rrect(x - 19, y - 170, x + 19, y + 560, 19), stroke("#1A0C07", 5))
        c.drawRect(skia.Rect.MakeLTRB(x - 24, y + 230, x + 24, y + 268), fill("#1A1A20"))
        c.restore()


def moon_window(c, x0, y0, x1, y1):
    """A window on the still, moonlit snow, with frost feathering in from the corners."""
    r = skia.Rect.MakeLTRB(x0, y0, x1, y1)
    c.drawRect(r, linear((0, y0), (0, y1), [(0, "#0B1A44", 1), (0.7, "#2B4A8A", 1), (1, "#A8BEE0", 1)]))
    c.save()
    c.clipRect(r)
    for x, h in ((x0 + 30, 270), (x0 + 120, 340), (x1 - 60, 300)):
        pine(c, x, y1 - 10, h, int(x) % 5, white="#CFDDF2")
    c.drawCircle(x1 - 90, y0 + 110, 34, fill("#F3F7FF"))
    glow(c, (x1 - 90, y0 + 110), 150, ICE, 0.4)
    glow(c, (x0, y0), 220, "#DCEEFF", 0.34, blend=skia.BlendMode.kSrcOver)
    glow(c, (x1, y1), 200, "#DCEEFF", 0.34, blend=skia.BlendMode.kSrcOver)
    c.restore()
    c.drawLine((x0 + x1) / 2, y0, (x0 + x1) / 2, y1, stroke("#23110A", 14))
    c.drawLine(x0, (y0 + y1) / 2, x1, (y0 + y1) / 2, stroke("#23110A", 11))
    c.drawRect(r, stroke("#1A0C07", 20))


FLOOR = 1500


def lounge(c, t):
    """The whole long room: case, window, Greta's mic, skis, Sir Reginald's table, Otto's fire."""
    wall = box(-500, -400, 4400, FLOOR)
    logs(c, wall)
    c.drawPath(wall, linear((0, -100), (0, FLOOR), [(0, "#180C06", 0.72), (0.5, "#4A2410", 0.05), (1, "#120804", 0.5)]))
    # Warm pools of lamplight down the wall.
    for x in (540, 1480, 2400, 3380):
        glow(c, (x, 780), 720, WARM, 0.24)
    for x in range(-300, 4400, 760):
        c.drawPath(rrect(x, -40, x + 92, FLOOR, 6), surface("wood", 0.7))
        c.drawPath(rrect(x, -40, x + 92, FLOOR, 6), fill("#150A05", 0.68))
    c.drawRect(skia.Rect.MakeLTRB(-500, -40, 4400, 170), fill("#120804"))
    c.drawRect(skia.Rect.MakeLTRB(-500, 160, 4400, 182), fill("#3A2214"))
    garland(c, -300, 4400, 210, t)
    # The banner over the mic.
    for i, ch in enumerate("HAPPY NEW YEAR"):
        x = 1120 + i * 56
        drop = 28 * math.sin(i / 13 * math.pi)
        if ch == " ":
            continue
        c.drawPath(poly([(x - 25, 386 + drop), (x + 25, 386 + drop), (x, 470 + drop)]), fill(ICE if i % 2 else SNOW))
        text(c, ch, x, 428 + drop, font("display", 34), fill("#14204A"), align="center")
    moon_window(c, 860, 520, 1180, 1120)
    skis(c, 1960, 560)
    # The floor, with the room's lights lying in it.
    ground = box(-500, FLOOR, 4400, 2300)
    c.drawPath(ground, surface("wood", 1.5))
    c.drawPath(ground, linear((0, FLOOR), (0, 2100), [(0, "#1A0C06", 0.45), (1, "#050303", 0.85)]))
    c.drawPath(rrect(1180, FLOOR + 40, 2000, FLOOR + 240, 12), fill("#5A1F2B", 0.9))
    c.drawPath(rrect(1200, FLOOR + 52, 1980, FLOOR + 228, 8), stroke(BRASS, 4, 0.6))
    display_case(c, 540, FLOOR + 30, t)
    # Greta, with the mic.
    c.drawPath(rrect(1270, FLOOR - 24, 1730, FLOOR + 60, 8), surface("wood", 0.8))
    c.drawPath(rrect(1270, FLOOR - 24, 1730, FLOOR + 60, 8), fill("#150A05", 0.3))
    suspect(c, "rectangle", 140, (1480, FLOOR - 12), 1.25)
    c.drawLine(1660, FLOOR - 16, 1660, 1010, stroke("#14141C", 13))
    c.drawLine(1660, 1010, 1572, 960, stroke("#14141C", 10))
    c.drawPath(rrect(1540, 910, 1600, 980, 26), linear((1540, 0), (1600, 0), [(0, STEEL, 1), (1, "#5A5E6A", 1)]))
    # Sir Reginald and the champagne table.
    suspect(c, "square", 40, (2400, FLOOR + 10), 1.25)
    table = rrect(2570, 1210, 2850, 1236, 10)
    c.drawLine(2710, 1236, 2710, FLOOR + 10, stroke("#1E0F08", 22))
    c.drawPath(table, fill("#E6DCC6"))
    c.drawPath(table, stroke("#1E0F08", 4))
    c.drawPath(rrect(2590, 1236, 2830, 1300, 12), fill("#D9CCB2"))
    c.drawPath(rrect(2660, 1080, 2760, 1210, 12), linear((2660, 0), (2760, 0), [(0, "#D4D8E1", 1), (0.5, "#878C9A", 1), (1, "#C4C8D1", 1)]))
    c.drawPath(rrect(2690, 930, 2732, 1100, 12), fill(GREEN_GLASS))
    # The hearth.
    stone_chimney(c, 3120, 180, 3880, FLOOR)
    opening = rrect(3280, 1080, 3730, FLOOR, 24)
    c.drawPath(opening, fill("#0A0504"))
    fire(c, 3505, FLOOR - 50, 330, 300, t)
    mantel = rrect(3180, 1020, 3830, 1082, 8)
    c.drawPath(mantel, surface("wood", 0.8))
    c.drawPath(mantel, fill("#120804", 0.35))
    c.drawPath(mantel, stroke("#120804", 5))
    wall_clock(c, 3505, 880, 132, 18, hour=11.97, minute=58.0)
    armchair_back(c, 2990, FLOOR + 20)
    suspect(c, "circle", 200, (2990, FLOOR - 40), 1.2)
    armchair_front(c, 2990, FLOOR + 20)
    glow(c, (3240, 1300), 620, AMBER, 0.26)


def phone_ui(c, t, label="23:58"):
    """What's on Lily's screen around the picture."""
    mark = stroke("#FFFFFF", 5, 0.7)
    for x, y, dx, dy in ((70, 110, 1, 1), (W - 70, 110, -1, 1), (70, H - 150, 1, -1), (W - 70, H - 150, -1, -1)):
        c.drawLine(x, y, x + dx * 76, y, mark)
        c.drawLine(x, y, x, y + dy * 76, mark)
    if int(t * 2.4) % 2 == 0:
        c.drawCircle(122, 172, 15, fill("#FF3B3B"))
    text(c, "REC", 150, 186, font("body", 42), fill("#FFFFFF", 0.92))
    text(c, label, W - 112, 186, font("body", 42), fill("#FFFFFF", 0.92), align="right")


def name_tag(c, name, role, a, y=300):
    if a <= 0:
        return
    f = font("display", 58)
    g = font("body", 38)
    g.setEmbolden(True)
    w = max(f.measureText(name), g.measureText(role)) + 76
    c.drawPath(rrect(112, y, 112 + w, y + 142, 26), fill("#0A0E22", 0.74 * a))
    text(c, name, 150, y + 64, f, fill("#FFFFFF", a))
    text(c, role, 150, y + 114, g, fill(ICE, a))


EYES = {"circle": 230, "triangle": 230, "square": 254, "rectangle": 311}


def lit_face(c, art, tint, x, y, s, key, cold=0.3, mood="idle"):
    """A suspect close up, with their eyes at (x, y), toned down and then lit from one side."""
    c.saveLayer(None, None)
    suspect(c, art, tint, (x, y + EYES[art] * s), s, mood=mood)
    c.drawRect(BIG, fill("#0A1034", cold, blend=skia.BlendMode.kSrcATop))
    (kx, ky, kr, col, a) = key
    c.drawRect(BIG, radial((kx, ky), kr, [(0, col, a), (1, col, 0)], blend=skia.BlendMode.kSrcATop))
    c.restore()


def party_back(c, t, seed=0.0, dim=1.0):
    """The lounge out of focus: dark logs, and every fairy light melted into a disc."""
    c.drawRect(BIG, linear((0, -100), (0, 2000), [(0, "#2C1A12", 1), (0.5, "#4E2E1C", 1), (1, "#1E120C", 1)]))
    for y in range(-60, 2000, 86):
        c.drawLine(-400, y, 1500, y, stroke("#140A06", 13, 0.42))
    for i, (x, y, r, col, p) in enumerate(FAIRY):
        on = 0.72 + 0.28 * math.sin(t * 3.1 + p + seed)
        px, py = (x + seed * 170) % 1500 - 200, (y + seed * 90) % 2000 - 60
        c.drawCircle(px, py, r, fill(col, 0.2 * on * dim, blend=skia.BlendMode.kPlus))
        c.drawCircle(px, py, r, stroke(col, 2.5, 0.2 * on * dim))


def front_crowd(c, t, y=1720, a=1.0):
    """Heads and shoulders right up against the lens, dark and out of focus."""
    for i, (x, r, h, p) in enumerate(HEADS):
        bounce = abs(math.sin(t * 2.9 + p)) * 26
        top = y + h * 80 - bounce
        c.drawCircle(x, top, r, fill("#120C0A", a))
        c.drawPath(rrect(x - r * 1.9, top + r * 0.8, x + r * 1.9, top + 900, r), fill("#120C0A", a))


def shot_phone(c, u):
    d = COUNT - PHONE
    # Selfie first, then the flip, then round the room from the fire to the case.
    flip = 0.5
    shake = (noise1(u * 5.1, 1) * 9, noise1(u * 4.3, 4) * 9)
    if u < flip:
        cam = Camera(x=540 + shake[0], y=960 + shake[1], zoom=1.02, focus=1.0, aperture=0)
        with layer(c, cam, 0.5, extra_blur=7) as lc:
            party_back(lc, u, 2.0)
        with layer(c, cam, 1.0) as lc:
            lit_face(lc, "triangle", 300, 540, 800, 4.4, (280, 700, 1000, HOT, 0.3), cold=0.14)
        with layer(c, cam, 1.3, extra_blur=14) as lc:
            front_crowd(lc, u, y=1570)
        phone_ui(c, u)
        name_tag(c, "LILY ASHFORD", "Dame Agatha's niece", smooth(span(u, 0.04, 0.18)) * (1 - smooth(span(u, flip - 0.12, flip))))
    else:
        # Four stops on the way along the room, with a quick swing between them.
        stops = (3150.0, 2470.0, 1480.0, 560.0)
        times = (flip, flip + 0.62, flip + 1.16, flip + 1.7)
        x = stops[0]
        for i in range(1, 4):
            x = lerp(x, stops[i], ease_in_out(span(u, times[i] - 0.3, times[i])))
        moving = max(math.sin(math.pi * span(u, times[i] - 0.3, times[i])) for i in range(1, 4))
        zoom = 1.16
        lens = Camera(x=x - shake[0] / zoom, y=1100 - (shake[1] + 20) / zoom, zoom=zoom, focus=1.0, aperture=0)
        with layer(c, lens, 1.0, extra_blur=max(0.0, moving - 0.2) * 34) as lc:
            lounge(lc, u)
        if moving > 0.25:
            for i in range(30):
                y = 80 + i * 62
                c.drawLine(0, y, W, y, stroke("#FFE7C4", 2.2, 0.05 * moving))
        with layer(c, Camera(x=540, y=960, focus=1.0, aperture=0), 1.0, extra_blur=20) as lc:
            lc.translate(-(x * 0.34) % 1500, 0)
            front_crowd(lc, u, y=1800)
            lc.translate(1500, 0)
            front_crowd(lc, u, y=1800)
        phone_ui(c, u)
        tags = (("OTTO BRENNAN", "Lodge owner", 0), ("SIR REGINALD PIKE", "Auctioneer", 1), ("GRETA HOLM", "Mountain guide", 2), ("THE AURORA", "£180,000", 3))
        for name, role, i in tags:
            start = times[i] + (0.02 if i == 0 else -0.04)
            end = times[i + 1] - 0.3 if i < 3 else d + 1
            name_tag(c, name, role, smooth(span(u, start, start + 0.1)) * (1 - smooth(span(u, end - 0.08, end))))
        # The flip: the picture swings past.
        c.drawRect(skia.Rect.MakeWH(W, H), fill("#FFFFFF", 0.7 * (1 - smooth(span(u, flip, flip + 0.1)))))


# ---------------------------------------------------------------------------
# The count: ten seconds, ten pictures

def number(c, u, n, x, y, size=560):
    """The count, landing on the beat."""
    k = ease_out(span(u, 0, 0.13), 3)
    s = lerp(1.4, 1.0, k)
    a = smooth(span(u, 0, 0.05))
    f = font("frost", size)
    c.save()
    c.translate(x, y)
    c.scale(s, s)
    glow(c, (0, -size * 0.3), size * 0.95, "#000000", 0.6 * a, blend=skia.BlendMode.kSrcOver)
    glow(c, (0, -size * 0.3), size * 0.9, ICE, 0.4 * a)
    text(c, str(n), 0, 0, f, fill("#F6FCFF", a), align="center")
    text(c, str(n), 0, 0, f, stroke("#5FA8E0", 5, a), align="center")
    c.restore()


def sparkler(c, x, y, t, power=1.0):
    """A white-hot bead throwing sparks that fly out, fork and die."""
    glow(c, (x, y), 640 * power, AMBER, 0.46 * power)
    glow(c, (x, y), 300 * power, WARM, 0.7 * power)
    for a, s, life, p, f in SPARKS:
        q = ((t * 2.3 + p) % 1.0) / life
        if q > 1 or f > 0.35 + 0.65 * power:
            continue
        r = s * q * (0.45 + 0.55 * power)
        ca, sa = math.cos(a), math.sin(a)
        x1, y1 = x + ca * r, y + sa * r + q * q * 50
        c.drawLine(x + ca * r * 0.62, y + sa * r * 0.62 + q * q * 30, x1, y1, stroke("#FFE9B0", 4.5 * (1 - q) + 1, 1 - q * 0.8))
        if f < 0.4 and q > 0.5:  # the fork at the end of a spark's life
            for da in (-0.6, 0.6):
                c.drawLine(x1, y1, x1 + math.cos(a + da) * 46 * q, y1 + math.sin(a + da) * 46 * q, stroke("#FFF3D2", 2.4, 1 - q))
    glow(c, (x, y), 110 * power, "#FFFFFF", 1.0)
    c.drawCircle(x, y, 13 * power + 4, fill("#FFFFFF"))


def stick(c, x, top, burn, bottom):
    """The wire: ash above the burning point, grey sparkler coating below it."""
    if burn > top:
        c.drawLine(x, top, x, burn, stroke("#2C2622", 5))
    c.drawLine(x, burn, x, bottom, stroke("#8A8780", 15))
    c.drawLine(x - 4, burn, x - 4, bottom, stroke("#C4C1B8", 3, 0.6))


def cake(c, x, y):
    """The New Year cake on its glass stand: white icing running down, sugared cranberries, pine."""
    c.drawPath(rrect(x - 26, y + 300, x + 26, y + 560, 8), fill("#D8E6F4", 0.28))
    c.drawOval(skia.Rect.MakeLTRB(x - 420, y + 250, x + 420, y + 340), fill("#D8E6F4", 0.4))
    c.drawOval(skia.Rect.MakeLTRB(x - 420, y + 250, x + 420, y + 340), stroke("#FFFFFF", 3, 0.5))
    body = rrect(x - 330, y - 70, x + 330, y + 300, 40)
    c.drawPath(body, linear((x - 330, 0), (x + 330, 0), [(0, "#C4CFE0", 1), (0.42, "#F6F9FF", 1), (1, "#9CA9C4", 1)]))
    c.drawOval(skia.Rect.MakeLTRB(x - 330, y - 142, x + 330, y + 2), fill("#FBFDFF"))
    # Icing running over the edge, each drip its own length.
    drip = skia.Path()
    drip.moveTo(x - 330, y - 70)
    for i in range(13):
        x0 = x - 330 + i * 55
        n = 40 + ((i * 37) % 7) * 18
        drip.lineTo(x0, y + n - 30)
        drip.quadTo(x0 + 27, y + n + 16, x0 + 55, y + n - 30)
    drip.lineTo(x + 330, y - 70)
    drip.close()
    c.drawPath(drip, fill("#FFFFFF"))
    c.drawPath(drip, stroke("#AFBCD4", 2.5, 0.8))
    for i in range(16):
        a = i * math.tau / 16
        px, py = x + math.cos(a) * 270, y - 70 + math.sin(a) * 56
        for k in range(5):
            c.drawLine(px, py, px + math.cos(k * 1.3 + i) * 44, py + math.sin(k * 1.3 + i) * 18 - 6, stroke("#16402C", 8))
        c.drawCircle(px + 12, py - 8, 15, fill("#A81E2C"))
        c.drawCircle(px + 8, py - 12, 5, fill("#FFD6DA", 0.8))


def shot_ten(c, u):
    """The clock over the fire. The second hand arrives at fifty."""
    cam = Camera(x=540, y=960, zoom=lerp(1.04, 1.0, u / BEAT), focus=1.0, aperture=0)
    with layer(c, cam, 0.5, extra_blur=7) as lc:
        party_back(lc, u, 0.3)
    tick = 50 - (1 - ease_out(span(u, 0.0, 0.1), 4)) * (1 - 0.3 * math.sin(u * 60))
    with layer(c, cam, 1.0) as lc:
        wall_clock(lc, 540, 800, 470, tick, hour=11.99, minute=59.83)
        glow(lc, (240, 500), 620, WARM, 0.2)
    number(c, u, 10, 540, 1690, 480)


def shot_nine(c, u):
    """The sparkler on the cake catches."""
    lit = smooth(span(u, 0.06, 0.2))
    cam = Camera(x=540, y=lerp(1000, 960, u / BEAT), zoom=1.02, focus=1.0, aperture=0)
    with layer(c, cam, 0.5, extra_blur=7) as lc:
        party_back(lc, u, 1.4, dim=0.8)
    with layer(c, cam, 1.0) as lc:
        cake(lc, 540, 1230)
        lc.drawRect(BIG, fill("#120E26", 0.14, blend=skia.BlendMode.kSrcATop))
        lc.drawRect(BIG, radial((540, 620), 1100, [(0, WARM, 0.5 * lit), (1, WARM, 0.08 * lit)], blend=skia.BlendMode.kSrcATop))
        stick(lc, 540, 240, 250, 1120)
        lc.drawRect(BIG, fill("#000000", 0.34 * (1 - lit)))
        if lit:
            sparkler(lc, 540, 250, u + NUMBER[1], lit)
    number(c, u, 9, 250, 880, 460)


def shot_eight(c, u):
    """Lily, in the light of her own phone."""
    cam = Camera(x=540, y=960, zoom=lerp(1.0, 1.05, u / BEAT), focus=1.0, aperture=0)
    with layer(c, cam, 0.5, extra_blur=7) as lc:
        party_back(lc, u, 2.6)
    with layer(c, cam, 1.0) as lc:
        lit_face(lc, "triangle", 300, 620, 720, 3.6, (620, 1180, 1000, "#DCEEFF", 0.34))
    with layer(c, cam, 1.2, extra_blur=12) as lc:
        front_crowd(lc, u + 2.0, y=1420)
    with layer(c, cam, 1.3, extra_blur=4) as lc:
        # The back of the phone, the bottom of the frame cutting it off.
        ph = rrect(90, 1240, 520, 2200, 56)
        soft_shadow(lc, ph, 8, -8, 20, 0.6)
        lc.drawPath(ph, linear((90, 1240), (520, 2000), [(0, "#3A3D48", 1), (0.5, "#1C1E26", 1), (1, "#0E0F14", 1)]))
        lc.drawPath(rrect(130, 1280, 300, 1540, 40), fill("#14151C"))
        lc.drawPath(rrect(130, 1280, 300, 1540, 40), stroke("#565A66", 3))
        for y in (1350, 1470):
            lc.drawCircle(215, y, 42, fill("#07080C"))
            lc.drawCircle(215, y, 42, stroke("#6A6E7A", 5))
            lc.drawCircle(200, y - 14, 10, fill("#8FA8D8", 0.7))
        lc.drawCircle(360, 1340, 13, fill("#FFF6DA"))
        glow(lc, (360, 1340), 90, HOT, 0.7)
    number(c, u, 8, 840, 1530, 480)


FACETS = ("#FFFFFF", "#DCEBFA", "#A8CBEC", "#6E9BCB", "#EAF4FF", "#4F7CB0", "#F6FBFF", "#FFE0EE", "#D8FFEA", "#88B4E0")


def stone(c, x, y, r, t, seed, sides=8):
    """A brilliant cut. As the light moves over it, each facet catches or lets go."""
    angles = [i / sides * math.tau + math.pi / sides for i in range(sides)]
    outer = [(x + math.cos(a) * r, y + math.sin(a) * r) for a in angles]
    inner = [(x + math.cos(a) * r * 0.56, y + math.sin(a) * r * 0.56) for a in angles]
    c.drawPath(poly(outer), fill("#6E9BCB"))
    for k in range(sides):
        pick = FACETS[int(k * 3.7 + seed * 5 + t * (6 + seed % 3)) % len(FACETS)]
        c.drawPath(poly([outer[k], outer[(k + 1) % sides], inner[(k + 1) % sides], inner[k]]), fill(pick))
    c.drawPath(poly(inner), fill(FACETS[int(seed * 3 + t * 5) % len(FACETS)]))
    c.drawPath(poly(outer), stroke("#E6EDF6", max(1.5, r * 0.07)))
    spark = math.sin(t * 6.5 + seed * 9)
    if spark > 0.62:
        k = (spark - 0.62) / 0.38
        glow(c, (x, y), r * 3.2, "#FFFFFF", 0.8 * k)
        c.drawLine(x - r * 3.4 * k, y, x + r * 3.4 * k, y, stroke("#FFFFFF", 2.5, 0.9 * k))
        c.drawLine(x, y - r * 3.4 * k, x, y + r * 3.4 * k, stroke("#FFFFFF", 2.5, 0.9 * k))


def pendant(c, x, y, r, t):
    """The great pear-shaped stone at the bottom of the Aurora."""
    tip = (x, y - r * 1.5)
    edge = [(x + math.cos(a) * r, y + math.sin(a) * r * 1.05) for a in np.linspace(-0.5, math.pi + 0.5, 13)]
    pts = [tip] + edge
    c.drawPath(poly(pts), fill("#6E9BCB"))
    for k, (p, q) in enumerate(zip(pts, pts[1:] + pts[:1])):
        c.drawPath(poly([p, q, (x, y)]), fill(FACETS[int(k * 2.3 + t * 7) % len(FACETS)]))
    c.drawPath(poly([(x + (px - x) * 0.5, y + (py - y) * 0.5) for px, py in pts]), fill(FACETS[int(t * 5 + 2) % len(FACETS)]))
    c.drawPath(poly(pts), stroke("#E6EDF6", 4))
    glow(c, (x, y), r * 2.6, ICE, 0.22)
    k = max(0.0, math.sin(t * 4.3))
    c.drawLine(x - r * 5 * k, y, x + r * 5 * k, y, stroke("#FFFFFF", 3, 0.9 * k))
    c.drawLine(x, y - r * 5 * k, x, y + r * 5 * k, stroke("#FFFFFF", 3, 0.9 * k))
    glow(c, (x + r * 0.3, y - r * 0.3), r * 1.1, "#FFFFFF", 0.5 * k)


def velvet_form(c, t, lit=1.0):
    """The dark velvet shape the necklace sits on, cut off by the frame so it's never a person."""
    c.drawRect(BIG, linear((0, 0), (0, H), [(0, "#0E1022", 1), (1, "#07081A", 1)]))
    form = skia.Path()
    form.moveTo(310, -60)
    form.cubicTo(320, 240, 110, 330, -120, 480)
    form.lineTo(-120, 2100)
    form.lineTo(1200, 2100)
    form.lineTo(1200, 480)
    form.cubicTo(970, 330, 760, 240, 770, -60)
    form.close()
    c.drawPath(form, linear((0, 0), (W, 1400), [(0, "#2B3A78", 1), (0.5, VELVET, 1), (1, "#080C24", 1)]))
    weave(c, form, "linen", 0.8)
    c.drawPath(form, stroke("#46558E", 3, 0.5))
    glow(c, (540, 780), 760, "#5F7BD0", 0.28 * lit)


def glass_front(c, t, ajar=0.0):
    """The case itself: reflections sliding across the glass, the brass edge and its tiny lock."""
    for x, w, a in ((120, 120, 0.05), (290, 44, 0.04), (760, 190, 0.035)):
        c.drawPath(poly([(x + 300, -40), (x + 300 + w, -40), (x - 120 + w, 1960), (x - 120, 1960)]), fill("#FFFFFF", a))
    x = 1010 - ajar * 70
    if ajar:
        # The door swung out towards us: a hard bright edge and a dark gap where it left the frame.
        c.drawRect(skia.Rect.MakeLTRB(x + 40, -40, 1120, 1960), fill("#000000", 0.32))
    post = rrect(x, -60, x + 64, 1980, 6)
    c.drawPath(post, linear((x, 0), (x + 64, 0), [(0, "#6E4A18", 1), (0.4, BRASS_LT, 1), (1, "#7A5A24", 1)]))
    c.drawPath(post, stroke("#3A2510", 4))
    c.drawCircle(x + 32, 1160, 24, fill(BRASS))
    c.drawCircle(x + 32, 1160, 24, stroke("#3A2510", 4))
    c.drawCircle(x + 32, 1153, 7, fill("#0A0604"))
    c.drawPath(poly([(x + 28, 1156), (x + 36, 1156), (x + 39, 1174), (x + 25, 1174)]), fill("#0A0604"))
    # The plaque.
    c.drawPath(rrect(300, 1560, 780, 1690, 8), linear((0, 1560), (0, 1690), [(0, BRASS_LT, 1), (1, BRASS, 1)]))
    c.drawPath(rrect(300, 1560, 780, 1690, 8), stroke("#3A2510", 4))
    text(c, "THE AURORA", 540, 1622, font("type", 50), fill("#20180E"), align="center", tracking=4)
    text(c, "Lot 1", 540, 1668, font("serif", 32), fill("#20180E", 0.85), align="center")


def necklace(c, t):
    links = []
    for i in range(25):
        p = i / 24 * 2 - 1
        x, y = 540 + 400 * p, -60 + 1160 * (1 - abs(p) ** 2.3)
        links.append((x, y, 19 + 25 * (1 - abs(p)) ** 1.3, i))
    for (x0, y0, _, _), (x1, y1, _, _) in zip(links, links[1:]):
        c.drawLine(x0, y0, x1, y1, stroke("#C7D2E2", 5))
    for x, y, r, i in links:
        soft_shadow_dot(c, x + 6, y + 9, r)
        stone(c, x, y, r, t, i * 1.37)
    c.drawLine(540, 1140, 540, 1190, stroke("#C7D2E2", 7))
    stone(c, 540, 1160, 25, t, 40.0)
    soft_shadow_dot(c, 550, 1300, 90)
    pendant(c, 540, 1290, 76, t)


def soft_shadow_dot(c, x, y, r):
    glow(c, (x, y), r * 1.5, "#000000", 0.5, blend=skia.BlendMode.kSrcOver, falloff=((0, 1.0), (0.6, 0.6), (1, 0.0)))


def shot_seven(c, u):
    """The Aurora. Everything else in the film is what happens to this picture."""
    cam = Camera(x=540, y=lerp(1010, 960, u / BEAT), zoom=lerp(1.0, 1.06, u / BEAT), focus=1.0, aperture=0)
    with layer(c, cam, 1.0) as lc:
        velvet_form(lc, u)
        necklace(lc, NUMBER[3] + u * 1.5)
    glow(c, (120, 300), 500, WARM, 0.12)
    glass_front(c, u)
    number(c, u, 7, 540, 640, 400)


def shot_six(c, u):
    """Sir Reginald, already spending his commission."""
    cam = Camera(x=540, y=960, zoom=lerp(1.05, 1.0, u / BEAT), roll=-1.2, focus=1.0, aperture=0)
    with layer(c, cam, 0.5, extra_blur=7) as lc:
        party_back(lc, u, 3.9)
    with layer(c, cam, 1.0) as lc:
        lit_face(lc, "square", 40, 420, 800, 3.3, (120, 620, 1000, WARM, 0.32))
    with layer(c, cam, 1.3, extra_blur=12) as lc:
        front_crowd(lc, u + 1.3, y=1430)
    number(c, u, 6, 860, 500, 440)


def microphone(c, x, y, s, tilt):
    c.save()
    c.translate(x, y)
    c.rotate(tilt)
    c.scale(s, s)
    c.drawPath(rrect(-46, 150, 46, 900, 18), linear((-46, 0), (46, 0), [(0, "#2A2C34", 1), (0.35, "#6A6E7A", 1), (1, "#14151A", 1)]))
    c.drawPath(rrect(-70, 120, 70, 190, 12), linear((-70, 0), (70, 0), [(0, "#6A6E7A", 1), (0.4, "#E6E9F0", 1), (1, "#3A3D48", 1)]))
    head = skia.Path()
    head.addRRect(skia.RRect.MakeRectXY(skia.Rect.MakeLTRB(-130, -160, 130, 130), 120, 120))
    c.drawPath(head, linear((-130, 0), (130, 0), [(0, "#4A4D58", 1), (0.35, "#D6D9E2", 1), (1, "#25262E", 1)]))
    c.save()
    c.clipPath(head, doAntiAlias=True)
    for i in range(-16, 17):
        c.drawLine(-200, i * 22, 200, i * 22 + 200, stroke("#14151A", 3.5, 0.75))
        c.drawLine(-200, i * 22 + 200, 200, i * 22, stroke("#14151A", 3.5, 0.75))
    c.drawOval(skia.Rect.MakeLTRB(-96, -130, -6, -30), fill("#FFFFFF", 0.28))
    c.restore()
    c.drawPath(head, stroke("#14151A", 7))
    c.drawPath(rrect(-136, -28, 136, 8, 10), linear((-136, 0), (136, 0), [(0, "#6A6E7A", 1), (0.4, "#F2F4F8", 1), (1, "#3A3D48", 1)]))
    c.restore()


def shot_five(c, u):
    """Greta takes the count, and the mic takes the room."""
    cam = Camera(x=540, y=960, zoom=lerp(1.0, 1.05, u / BEAT), focus=1.0, aperture=0)
    with layer(c, cam, 0.5, extra_blur=7) as lc:
        party_back(lc, u, 4.7)
    with layer(c, cam, 1.0) as lc:
        lit_face(lc, "rectangle", 140, 640, 640, 2.5, (900, 500, 900, WARM, 0.26), cold=0.16)
    with layer(c, cam, 1.15, extra_blur=12) as lc:
        front_crowd(lc, u + 3.1, y=1440)
    with layer(c, cam, 1.25) as lc:
        microphone(lc, 320, 1180, 1.25, 12)
    number(c, u, 5, 830, 1560, 440)


def bottle(c, u):
    """The champagne, on the slant in its bucket, the moment it goes."""
    c.save()
    c.rotate(18, 540, 1500)
    glass = skia.Path()
    glass.moveTo(452, 2000)
    glass.lineTo(452, 1130)
    glass.cubicTo(452, 1020, 496, 980, 500, 880)
    glass.lineTo(500, 620)
    glass.lineTo(580, 620)
    glass.lineTo(580, 880)
    glass.cubicTo(584, 980, 628, 1020, 628, 1130)
    glass.lineTo(628, 2000)
    glass.close()
    c.drawPath(glass, linear((452, 0), (628, 0), [(0, "#0A1A10", 1), (0.28, "#2C6A44", 1), (0.5, GREEN_GLASS, 1), (1, "#06100A", 1)]))
    c.drawPath(glass, stroke("#050B07", 5))
    c.drawLine(476, 1130, 476, 1950, stroke("#9FE0BC", 7, 0.5))
    foil = poly([(494, 628), (586, 628), (590, 850), (492, 850)])
    c.drawPath(foil, linear((494, 0), (586, 0), [(0, "#7A5A24", 1), (0.4, BRASS_LT, 1), (1, "#6E4A18", 1)]))
    label = rrect(446, 1200, 634, 1460, 8)
    c.drawPath(label, fill("#EFE6D2"))
    c.drawPath(label, stroke(BRASS, 5))
    text(c, "PINECREST", 540, 1310, font("type", 26), fill("#20180E"), align="center")
    text(c, "R\u00e9serve", 540, 1370, font("serif", 46), fill("#7A2A2A"), align="center")
    c.restore()


def flying_cork(c, x, y, s, angle):
    """Side on and turning over: the mushroom head, the pinched stem, the burnt mark on its side."""
    c.save()
    c.translate(x, y)
    c.rotate(angle)
    c.scale(s, s)
    stem = rrect(-46, 34, 46, 136, 12)
    head = rrect(-66, -72, 66, 62, 34)
    grain = linear((-66, 0), (66, 0), [(0, "#8A6A3A", 1), (0.42, "#E2BE88", 1), (1, "#6E4E2A", 1)])
    c.drawPath(stem, grain)
    c.drawPath(head, grain)
    weave(c, head, "paper", 0.7)
    c.drawPath(stem, stroke("#3A2510", 4))
    c.drawPath(head, stroke("#3A2510", 4))
    for y0 in (70, 92, 114):
        c.drawLine(-44, y0, 44, y0, stroke("#5A3E1E", 2.5, 0.6))
    c.drawPath(rrect(-30, -30, 30, 18, 8), stroke("#5A3216", 4, 0.7))
    c.restore()


NECK = (818, 650)


def shot_four(c, u):
    """The cork leaves, and the bottle goes up."""
    cam = Camera(x=540, y=960, zoom=lerp(1.0, 1.04, u / BEAT), focus=1.0, aperture=0)
    with layer(c, cam, 0.5, extra_blur=7) as lc:
        party_back(lc, u, 5.6)
    with layer(c, cam, 1.0) as lc:
        bottle(lc, u)
        # The bucket: brushed metal, a rolled rim, and ice packed round the bottle.
        bucket = rrect(150, 1560, 930, 2140, 40)
        lc.drawPath(bucket, linear((150, 0), (930, 0), [(0, "#4C505C", 1), (0.32, "#E6E9F0", 1), (0.6, "#8E93A0", 1), (1, "#30323C", 1)]))
        for y in (1660, 1690):
            lc.drawLine(150, y, 930, y, stroke("#000000", 3, 0.25))
        lc.drawOval(skia.Rect.MakeLTRB(140, 1516, 940, 1614), fill("#7F97AE"))
        for i in range(34):
            x, y = 190 + (i * 311) % 700, 1534 + (i * 97) % 54
            z = 0.7 + ((i * 53) % 10) / 12
            lc.save()
            lc.rotate(i * 47, x, y)
            lc.drawPath(poly([(x - 34 * z, y), (x + 6 * z, y - 22 * z), (x + 38 * z, y + 6 * z), (x - 4 * z, y + 26 * z)]), fill("#E2F0FA" if i % 3 else "#A9C4D8", 0.95))
            lc.drawLine(x - 16 * z, y - 2, x + 10 * z, y - 12 * z, stroke("#FFFFFF", 3, 0.7))
            lc.restore()
        lc.drawOval(skia.Rect.MakeLTRB(140, 1516, 940, 1614), stroke("#E6E9F0", 11))
        # The foam, climbing out of the neck and falling back.
        lift = ease_out(span(u, 0.04, 0.5), 2)
        for i in range(120):
            a = -math.pi / 2 + 0.42 + math.sin(i * 12.9) * 0.3
            q = (u * 1.5 + i * 0.137) % 1.0
            reach = (1050 + 500 * math.sin(i * 7.7)) * q * lift
            x, y = NECK[0] + math.cos(a) * reach, NECK[1] + math.sin(a) * reach + q * q * 620
            lc.drawCircle(x, y, 15 * (1 - q) + 2.5, fill("#EEFBF2" if i % 3 else "#FFE9B0", 0.9 * (1 - q * 0.8)))
        for k in range(5):
            spout = skia.Path()
            spout.moveTo(*NECK)
            spout.quadTo(NECK[0] + 70 + k * 16, NECK[1] - 300 * lift, NECK[0] + 120 + k * 40, NECK[1] - (440 - k * 60) * lift)
            paint = stroke("#F2FFF6", 30 - k * 5, 0.26)
            paint.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 10))
            lc.drawPath(spout, paint)
        glow(lc, NECK, 300, "#EAFBF2", 0.34 * lift)
    # The cork goes past the lens, top right, turning over.
    k = span(u, 0.03, 0.4)
    if k < 1:
        flying_cork(c, lerp(NECK[0], 1240, k), lerp(NECK[1], -240, k), lerp(0.5, 4.2, k ** 1.6), 30 + u * 1300)
    number(c, u, 4, 250, 900, 480)


def shot_three(c, u):
    """The room, backlit: everyone on their feet."""
    cam = Camera(x=540, y=960 + math.sin(u * 15) * 7, zoom=1.03, focus=1.0, aperture=0)
    with layer(c, cam, 0.5, extra_blur=7) as lc:
        party_back(lc, u, 6.3)
        glow(lc, (540, 900), 1300, WARM, 0.6)
        glow(lc, (540, 900), 620, HOT, 0.34)
    # Shafts of light through the party smoke, swinging.
    for i in range(7):
        a = -1.0 + i * 0.33 + 0.09 * math.sin(u * 3.4 + i * 2)
        x0, x1 = 540 + math.sin(a - 0.05) * 2400, 540 + math.sin(a + 0.05) * 2400
        c.drawPath(poly([(540, -160), (x0, 2200), (x1, 2200)]), fill(ICE if i % 2 else WARM, 0.09, blend=skia.BlendMode.kPlus))
    with layer(c, cam, 0.85, extra_blur=6) as lc:
        for i in range(7):
            x = 30 + i * 170
            y = 1390 + abs(math.sin(u * 7 + i * 1.7)) * 44
            lc.drawCircle(x, y, 76, fill("#1A100C"))
            lc.drawPath(rrect(x - 136, y + 60, x + 136, y + 900, 60), fill("#1A100C"))
            arc = skia.Path()
            arc.addArc(skia.Rect.MakeLTRB(x - 76, y - 76, x + 76, y + 76), 200, 140)
            lc.drawPath(arc, stroke(WARM, 7, 0.75))
            lc.drawPath(poly([(x - 56, y - 56), (x + 56, y - 56), (x + 4, y - 232)]), fill("#E86A8A" if i % 2 else "#7CE0B8", 0.92))
            lc.drawCircle(x + 4, y - 236, 16, fill("#FFF6DA"))
    for x, y, sp, r, col, z in CONFETTI[:110]:
        py = (y + u * sp * 2.4) % 2000 - 50
        c.save()
        c.rotate(r + u * 260, x, py)
        c.drawRect(skia.Rect.MakeXYWH(x - z / 2, py - z * 0.3, z, z * 0.6), fill(col, 0.92))
        c.restore()
    with layer(c, cam, 1.3, extra_blur=12) as lc:
        front_crowd(lc, u * 1.6, y=1770)
    number(c, u, 3, 540, 900, 660)


def shot_two(c, u):
    """The sparkler again, and very nearly the end of it."""
    cam = Camera(x=540, y=960, zoom=lerp(1.0, 1.1, u / BEAT), focus=1.0, aperture=0)
    with layer(c, cam, 0.4, extra_blur=7) as lc:
        party_back(lc, u, 7.1, dim=0.5)
        lc.drawRect(BIG, fill("#000000", 0.5))
    with layer(c, cam, 1.0) as lc:
        stick(lc, 620, -200, 960, 1330)
        c0 = 1 - span(u, 0, BEAT) * 0.35
        lc.drawLine(620, 1330, 620, 2100, stroke("#3A3836", 7))
        sparkler(lc, 620, 960, u + NUMBER[8], 0.72 * c0)
    number(c, u, 2, 250, 1130, 560)


def shot_one(c, u):
    """Everyone. Every light in the place. The top of the night."""
    d = DARK - NUMBER[9]
    z = lerp(1.2, 1.3, u / d)
    c.save()
    c.translate(W / 2 + 170 + math.sin(u * 31) * 6, H / 2 + math.cos(u * 27) * 6)
    c.scale(z, z)
    c.translate(-1480, -1110)
    lounge(c, u)
    c.restore()
    # Greta in the room's one spotlight, and every string of bulbs in the lodge at full tilt.
    glow(c, (720, 920), 760, HOT, 0.32)
    glow(c, (540, 480), 1000, WARM, 0.26)
    for y, sag in ((150, 130), (250, 170)):
        pts = [(-60 + i * 30, y + sag * 4 * ((i % 13) / 13) * (1 - (i % 13) / 13)) for i in range(42)]
        fairy_string(c, pts, u * 2, spacing=26, r=9)
    with layer(c, Camera(x=540, y=960, focus=1.0, aperture=0), 1.0, extra_blur=11) as lc:
        front_crowd(lc, u * 1.7, y=1680)
    for x, y, sp, r, col, z2 in CONFETTI:
        py = (y + u * sp * 2.0) % 2000 - 50
        c.save()
        c.rotate(r + u * 240, x, py)
        c.drawRect(skia.Rect.MakeXYWH(x - z2 / 2, py - z2 * 0.3, z2, z2 * 0.6), fill(col, 0.94))
        c.restore()
    c.drawRect(skia.Rect.MakeWH(W, H), fill(HOT, 0.45 * (1 - smooth(span(u, 0, 0.14)))))
    if u < BEAT:
        number(c, u, 1, 290, 1110, 860)
    else:
        a = smooth(span(u, BEAT, BEAT + 0.05))
        k = ease_out(span(u, BEAT, BEAT + 0.13), 3)
        f = font("frost", 200)
        c.save()
        c.translate(W / 2, 300)
        c.scale(lerp(1.2, 1.0, k), lerp(1.2, 1.0, k))
        glow(c, (0, 40), 720, "#000000", 0.6 * a, blend=skia.BlendMode.kSrcOver)
        text(c, "Happy", 0, 0, f, fill("#F6FCFF", a), align="center")
        text(c, "New Y", 0, 210, f, fill("#F6FCFF", a), align="center")
        c.restore()


# ---------------------------------------------------------------------------
# The dark. Sound only, and Lily's phone still recording.

CLOCK_AT = ((0.0, 3), (1.6, 40), (2.05, 50), (3.75, 100), (4.4, 125))


def night_clock(u):
    s = int(np.interp(u, [a for a, _ in CLOCK_AT], [b for _, b in CLOCK_AT]))
    return f"00:{s // 60:02d}:{s % 60:02d}"


NOTES = (("[ screams ]", 0.08, 0.82), ("[ a door ]", 2.05, 2.65), ("[ footsteps, in the snow ]", 2.7, 3.7))


def shot_dark(c, u):
    c.drawRect(skia.Rect.MakeWH(W, H), fill("#000000"))
    # The sparkler's very last ember, wherever the cake is now.
    k = 1 - smooth(span(u, 0.05, 0.7))
    if k:
        c.drawCircle(540, 880, 7, fill("#FF8A3C", k))
        glow(c, (540, 880), 90, AMBER, 0.7 * k)
    a = smooth(span(u, 0.25, 0.5))
    if int((u + DARK) * 2.4) % 2 == 0:
        c.drawCircle(122, 172, 15, fill("#FF3B3B", a))
    text(c, "REC", 150, 186, font("body", 42), fill("#FFFFFF", 0.82 * a))
    text(c, night_clock(u), W - 112, 186, font("body", 42), fill("#FFFFFF", 0.82 * a), align="right")
    for words, start, end in NOTES:
        b = smooth(span(u, start, start + 0.1)) * (1 - smooth(span(u, end - 0.14, end)))
        if b:
            text(c, words, W / 2, 1040, font("type", 52), fill(CREAM, 0.84 * b), align="center", tracking=2)


# ---------------------------------------------------------------------------
# The lights. The same picture as seven, with nothing in it.

FOUR = (("rectangle", 140), ("circle", 200), ("triangle", 300), ("square", 40))


def shot_lights(c, u):
    d = TITLE - LIGHTS
    on = 0.0 if u < 0.05 else 1.0 if u < 0.1 else 0.0 if u < 0.2 else 0.6 if u < 0.25 else 0.0 if u < 0.34 else 1.0
    k = ease_in_out(span(u, 0.5, d))
    cam = Camera(x=540, y=lerp(960, 1010, k), zoom=lerp(1.06, 1.0, k), focus=1.0, aperture=0)
    with layer(c, cam, 1.0) as lc:
        velvet_form(lc, u, lit=1.4)
        # The dent the necklace left in the pile.
        path = skia.Path()
        for i in range(25):
            p = i / 24 * 2 - 1
            x, y = 540 + 400 * p, -60 + 1160 * (1 - abs(p) ** 2.3)
            path.moveTo(x, y) if i == 0 else path.lineTo(x, y)
        lc.drawPath(path, stroke("#060A20", 26, 0.34))
        lc.drawOval(skia.Rect.MakeLTRB(470, 1200, 610, 1390), fill("#060A20", 0.3))
    # Everyone reflected in the glass, looking in. All four, the same.
    r = smooth(span(u, 0.7, 1.5))
    if r:
        paint = skia.Paint()
        paint.setAlphaf(0.34 * r)
        c.saveLayer(None, paint)
        for i, (art, tint) in enumerate(FOUR):
            suspect(c, art, tint, (190 + i * 232, 1240), 0.86, mood="shocked", lit=0.55)
        c.restore()
    glass_front(c, u, ajar=1.0)
    c.drawRect(skia.Rect.MakeWH(W, H), fill("#000000", 1 - on))
    a = smooth(span(u, 0.34, 0.5))
    if int((u + LIGHTS) * 2.4) % 2 == 0:
        c.drawCircle(122, 172, 15, fill("#FF3B3B", a))
    text(c, "REC", 150, 186, font("body", 42), fill("#FFFFFF", 0.82 * a))
    text(c, "00:02:05", 900, 186, font("body", 42), fill("#FFFFFF", 0.82 * a), align="right")


# ---------------------------------------------------------------------------
# The title

def frost_lines():
    """Ice feathering in from the edges of the lens, as a list of paths in the order they grow."""
    if "frost" not in _paths:
        rng = np.random.default_rng(13)
        buckets = [skia.Path() for _ in range(48)]
        roots = [(x, s) for x in np.arange(-20, W + 20, 46.0) for s in (-30, H + 30)] + [(s, y) for y in np.arange(-20, H + 20, 46.0) for s in (-30, W + 30)]

        def grow(x, y, a, size, when, depth):
            for _ in range(4):
                nx, ny = x + math.cos(a) * size, y + math.sin(a) * size
                k = min(47, int(when * 48))
                buckets[k].moveTo(x, y)
                buckets[k].lineTo(nx, ny)
                x, y = nx, ny
                when += 0.03
                a += rng.uniform(-0.18, 0.18)
                if depth < 4 and rng.uniform() < 0.62:
                    grow(x, y, a + rng.choice((-1, 1)) * rng.uniform(0.6, 1.0), size * 0.62, when, depth + 1)

        for x, y in roots:
            a = math.atan2(960 - y, 540 - x) + rng.uniform(-0.5, 0.5)
            grow(x, y, a, rng.uniform(14, 40), rng.uniform(0, 0.3), 0)
        _paths["frost"] = buckets
    return _paths["frost"]


def shot_title(c, u):
    d = DURATION - TITLE
    k = ease_out(span(u, 0, d), 2)
    cam = Camera(x=540, y=lerp(520, 400, k), zoom=lerp(0.82, 0.68, k), focus=1.0, aperture=0)
    exterior(c, cam, u + 6, aurora=0.8)
    c.drawRect(skia.Rect.MakeWH(W, H), linear((0, 200), (0, 1000), [(0, "#040818", 0.2), (0.5, "#040818", 0.42), (1, "#040818", 0)]))
    # Ice closing in around the picture.
    grown = smooth(span(u, 0.0, 2.6))
    c.drawRect(skia.Rect.MakeLTRB(0, 0, W, 260), linear((0, 0), (0, 260), [(0, "#CFE6FA", 0.34 * grown), (1, "#CFE6FA", 0)]))
    c.drawRect(skia.Rect.MakeLTRB(0, H - 260, W, H), linear((0, H - 260), (0, H), [(0, "#CFE6FA", 0), (1, "#CFE6FA", 0.34 * grown)]))
    c.drawRect(skia.Rect.MakeLTRB(0, 0, 220, H), linear((0, 0), (220, 0), [(0, "#CFE6FA", 0.3 * grown), (1, "#CFE6FA", 0)]))
    c.drawRect(skia.Rect.MakeLTRB(W - 220, 0, W, H), linear((W - 220, 0), (W, 0), [(0, "#CFE6FA", 0), (1, "#CFE6FA", 0.3 * grown)]))
    paint = stroke("#EAF6FF", 2.4, 0.46)
    for i, p in enumerate(frost_lines()):
        if i / 48 < grown:
            c.drawPath(p, paint)
    a = smooth(span(u, 0.1, 0.6))
    big = font("frost", 236)
    drift = (1 - ease_out(span(u, 0.0, 0.7), 3)) * 26
    text(c, "CASE 004", W / 2, 400, font("type", 44), fill(ICE, a), align="center", tracking=10)
    glow(c, (W / 2, 540), 720, ICE, 0.2 * a)
    text(c, "Snowed In", W / 2, 640 - drift, big, fill("#F6FCFF", a), align="center")


# ---------------------------------------------------------------------------
# The cut

SHOTS = ((EST, shot_est), (PHONE, shot_phone), (NUMBER[0], shot_ten), (NUMBER[1], shot_nine), (NUMBER[2], shot_eight), (NUMBER[3], shot_seven), (NUMBER[4], shot_six), (NUMBER[5], shot_five),
         (NUMBER[6], shot_four), (NUMBER[7], shot_three), (NUMBER[8], shot_two), (NUMBER[9], shot_one), (DARK, shot_dark), (LIGHTS, shot_lights), (TITLE, shot_title))


def film_draw(c, t):
    for start, shot in reversed(SHOTS):
        if t >= start:
            shot(c, t - start)
            break
    for i, (words, _, _, at, tag) in enumerate(LINES):
        until = LINES[i + 1][3] - 0.05 if i + 1 < len(LINES) else None
        if i == 0:
            until = PHONE - 0.03
        if i == 1:
            until = COUNT - 0.04
        if i == 2:
            until = at + 1.1
        caption(c, t, words, at, at + LINE_LENGTHS[i] - 0.1, tag, until, y={0: 1810, 2: 720, 3: 420, 4: 1810}.get(i))


def exposure(t):
    return smooth(span(t, 0, 0.3)) * (1 - smooth(span(t, DURATION - 0.5, DURATION)))


def film_frame(i: int) -> np.ndarray:
    t = i / FPS
    out = finish(render_frame(film_draw, t), i, LOOK, exposure=exposure(t))
    return (out * 255 + 0.5).astype(np.uint8)


# ---------------------------------------------------------------------------
# The sound

TUNE = (("C5", 0), ("F5", 1), ("F5", 2.5), ("F5", 3), ("A5", 4), ("G5", 5), ("F5", 6.5), ("G5", 7), ("A5", 8), ("F5", 9), ("F5", 10.5), ("A5", 11), ("C6", 12), ("D6", 13))
CHORDS = ((1, ("F4", "C5")), (5, ("C4", "G4")), (9, ("F4", "A4")), (13, ("A#3", "F4", "D5")))
WINDING_DOWN = (("D6", 0.4), ("C6", 1.0), ("A5", 1.66), ("A5", 2.44), ("F5", 3.36), ("G5", 4.1))  # slower and slower, and it never resolves


def score():
    mix = sound.Mix(DURATION, seed=44)
    rng = mix.rng
    # Outside: air over snow, and the party a long way off behind glass.
    mix.add(sound.wind(PHONE + 0.3, rng, 0.8), 0, gain=0.7)
    mix.add(sound.lowpass(sound.murmur(PHONE, rng), 420), 0, gain=0.3)

    # Everything that needs power, or people's nerve, goes on here and stops dead at DARK.
    party = sound.Mix(DURATION, seed=45)
    room = sound.murmur(YEAR - PHONE + 1.0, rng)
    level = np.interp(np.arange(len(room)) / sound.SR, [0, COUNT - PHONE, YEAR - PHONE], [0.42, 0.5, 0.82])
    party.add(room * level[:, None], PHONE, reverb=0.25)
    party.add(sound.fireplace(COUNT - PHONE, rng), PHONE, gain=0.22)
    party.add(sound.whoosh(rng, 0.35), PHONE + 0.62, gain=0.5)

    # The count: the room, joining in as it goes, and Greta on the mic from five.
    for i, word in enumerate(NUMBERS):
        at = NUMBER[i]
        people = [line(word, voice=v, speed=1.12) for v in CROWD[: 3 + i]]
        party.add(sound.chant(people * (2 if i > 4 else 1), rng), at - 0.02, gain=0.8 + i * 0.06, reverb=0.5)
        if i >= 5:
            party.add(sound.public_address(line(word, voice=GRETA, speed=1.12)), at - 0.02, gain=0.9, reverb=0.4)
        party.add(sound.clock_tick(rng, tock=i % 2 == 1), at, gain=0.6, reverb=0.2)
        party.add(sound.heartbeat(rng, 0.5 + i * 0.05), at, gain=0.5 + i * 0.05)
    party.add(sound.fizz(1.0, rng), NUMBER[1] + 0.08, gain=0.3)
    party.add(sound.fizz(DARK - NUMBER[2], rng), NUMBER[2], gain=0.05)
    party.add(sound.fizz(1.0, rng), NUMBER[8], gain=0.22)
    party.add(sound.cork(rng), NUMBER[6] + 0.06, gain=1.0, reverb=0.4)
    party.add(sound.riser(YEAR - NUMBER[5], rng), NUMBER[5], gain=0.42)
    happy = [line(HAPPY, voice=v, speed=1.12) for v in CROWD]
    party.add(sound.chant(happy * 2, rng), YEAR - 0.02, gain=1.3, reverb=0.5)
    party.add(sound.public_address(line(HAPPY, voice=GRETA, speed=1.12)), YEAR - 0.02, gain=1.0, reverb=0.4)
    stop = sound.seconds(DARK)
    party.dry[stop:] = 0
    party.wet[stop:] = 0
    party.dry[stop - 120:stop] *= np.linspace(1, 0, 120)[:, None]
    party.wet[stop - 120:stop] *= np.linspace(1, 0, 120)[:, None]
    mix.dry += party.dry * 1.8
    mix.wet += party.wet * 1.8

    # The music box: one phrase of Auld Lang Syne that arrives exactly as the year does.
    first = YEAR - 13 * BEAT
    for name, beat in TUNE:
        mix.add(sound.tine(sound.note(name)), first + beat * BEAT, gain=0.62, reverb=0.5)
    for beat, names in CHORDS:
        for name in names:
            mix.add(sound.tine(sound.note(name), velocity=0.5), first + beat * BEAT, gain=0.5, reverb=0.5)

    # The dark. It isn't electric, so it keeps playing, running down.
    for name, at in WINDING_DOWN:
        mix.add(sound.tine(sound.note(name), velocity=0.9), DARK + at, gain=0.4, reverb=0.7)
    mix.add(sound.power_down(rng), DARK, gain=0.3, reverb=0.3)
    for at, pan in ((0.06, -0.5), (0.16, 0.5), (0.26, 0.0), (0.4, 0.3)):
        mix.add(sound.gasp(rng), DARK + at, gain=0.3, pan=pan, reverb=0.7)
    mix.add(sound.scrape(rng), DARK + 0.5, gain=0.16, pan=0.6, reverb=0.6)
    mix.add(sound.lock_turn(rng), DARK + 1.6, gain=0.26, pan=-0.35, reverb=0.5)
    # Two floors down, a door. The cold comes in.
    mix.add(sound.latch(rng), DARK + 2.05, gain=0.36, pan=0.3, reverb=0.8)
    mix.add(sound.creak(rng), DARK + 2.09, gain=0.26, pan=0.3, reverb=0.6)
    mix.add(sound.wind(1.7, rng, 1.0), DARK + 2.1, gain=0.26, pan=0.2)
    for i in range(5):
        at = DARK + 2.55 + i * 0.28
        fade = 1 - i * 0.13
        mix.add(sound.crunch(rng), at, gain=0.42 * fade, pan=0.2, reverb=0.3)
        if i % 2 == 0:
            mix.add(sound.cane_tap(rng), at - 0.07, gain=0.11 * fade, pan=0.1, reverb=0.3)  # the clue: every other step
    mix.add(sound.latch(rng, heavy=True), DARK + 3.9, gain=0.42, pan=0.3, reverb=0.8)

    # The lights.
    mix.add(sound.breaker(rng), LIGHTS, gain=0.95, reverb=0.3)
    hum = sound.room_hum(TITLE - LIGHTS, rng)
    mix.add(hum, LIGHTS + 0.04, gain=0.34)
    for at in (0.05, 0.2, 0.34):
        mix.add(sound.neon_buzz(), LIGHTS + at, gain=0.3)
    mix.add(sound.gasp(rng), LIGHTS + 0.4, gain=0.34, reverb=0.6)
    mix.add(sound.sustained(("D3", "A3", "D4"), TITLE - LIGHTS + 0.4, rng), LIGHTS + 0.3, gain=0.26, reverb=0.6)

    # The title: the tune finally comes home, a note at a time.
    mix.add(sound.impact(rng, root=36.7), TITLE, gain=0.7, reverb=0.7)
    for name, at in (("F5", 0.5), ("D5", 1.3), ("D5", 1.9), ("C5", 2.4), ("F5", 3.0)):
        mix.add(sound.tine(sound.note(name)), TITLE + at, gain=0.56, reverb=0.8)
    mix.add(sound.tine(sound.note("F4"), velocity=0.7), TITLE + 3.0, gain=0.5, reverb=0.8)
    mix.add(sound.wind(DURATION - TITLE, rng, 0.8), TITLE, gain=0.42)

    for i, (words, voice, speed, at, tag) in enumerate(LINES):
        v = line(words, voice=voice, speed=speed)
        if i == 3:  # older than the voice model: slowed a shade, which also lowers it
            v = np.interp(np.arange(0, len(v) - 1, 0.94), np.arange(len(v)), v)
        mix.add(v, at, gain=1.25 if tag is None else 1.9 if i == 2 else 1.05, pan=-0.25 if i == 2 else 0.0, reverb=0.08 if tag is None else 0.5)
    out = mix.master(target_rms_db=-18.0, ceiling_db=-1.0)
    # The master's compressor closes the gap between a full room and an empty dark, so open it again here.
    drop = np.ones(len(out))
    a, b = sound.seconds(DARK), sound.seconds(LIGHTS)
    drop[a:b] = 0.52
    drop[a:a + 240] = np.linspace(1, 0.52, 240)
    drop[b - 240:b] = np.linspace(0.52, 1, 240)
    return (out * drop[:, None]).astype(np.float32)


def takes():
    """Every line in the film: the cast, and the crowd saying each number."""
    cast = [(words, voice, speed) for words, voice, speed, _, _ in LINES]
    room = [(word, v, 1.12) for word in NUMBERS + (HAPPY,) for v in CROWD]
    mic = [(word, GRETA, 1.12) for word in NUMBERS[5:] + (HAPPY,)]
    return cast + room + mic


def voices():
    record(takes())
    for words, voice, speed, _, _ in LINES:
        print(f"{len(line(words, voice=voice, speed=speed)) / sound.SR:.2f}s  {voice}  {words}", flush=True)
    print(f"{len(line(HAPPY, voice=GRETA, speed=1.12)) / sound.SR:.2f}s  mic  {HAPPY}")


CUTS = (PHONE, COUNT, *NUMBER[1:], DARK, LIGHTS, TITLE)


def stills():
    moments = risky_moments([(at, n) for (_, _, _, at, _), n in zip(LINES, LINE_LENGTHS)], CUTS,
                            extra=(0.5, 1.4, 2.4, 3.6, 4.1, 4.5, 5.0, 5.5, 14.7, 16.0, 18.0, 21.0, 24.0))
    print(contact_sheet(film_frame, moments, "case004-film-stills.png", cols=11))


def render(scale):
    render_video("case004-film", "omc_cinema.case004_film:film_frame", DURATION, score(), sound.SR, scale)


if __name__ == "__main__":
    {"film": lambda: render(GAME), "draft": lambda: render(DRAFT), "master": lambda: render(MASTER), "stills": stills, "voices": voices}[sys.argv[1] if len(sys.argv) > 1 else "film"]()
