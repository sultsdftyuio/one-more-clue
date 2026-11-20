"""Halden Hall at night: the Dollhouse look for One More Clue, painted with the cinema tools.

    python halden.py draft      # quick framing check (OMC_SCALE 0.4)
    python halden.py            # full 1080 x 1920 plate, sprites and overlay positions

Three passes, the way a night shot is lit: albedo (every surface as painted), light (each room lit by its own
lamps, the rest of the house dim), emission (lamps, screens, LEDs, the moon). Final = albedo x light + emission,
then the film finish. Characters, the lift car and everything that moves are left out: the artboard animates them.
"""
from __future__ import annotations

import json
import math
import os
import sys

DRAFT = len(sys.argv) > 1 and sys.argv[1] == "draft"
os.environ["OMC_SCALE"] = "0.4" if DRAFT else "1.0"
sys.path.insert(0, r"C:\Users\sulta\one-more-clue-videos")

import numpy as np  # noqa: E402
import skia  # noqa: E402
from PIL import Image  # noqa: E402

from omc_cinema import dollhouse_film as D  # noqa: E402
from omc_cinema import film  # noqa: E402
from omc_cinema.film import H, W, fill, linear, poly, radial, rrect  # noqa: E402
from omc_cinema.look import Look, finish  # noqa: E402
from omc_cinema.vacuum_film import On  # noqa: E402

OUT = os.path.dirname(os.path.abspath(__file__))
COLS, FLOORS, DEPTH, WT = D.COLS, D.FLOORS, D.DEPTH, D.WT
ATTIC_Z, ROOF_TOP, SLOPE_IN = D.ATTIC_Z, D.ROOF_TOP, D.SLOPE_IN
PLUS = skia.BlendMode.kPlus
MODE = "albedo"


def A():
    return MODE == "albedo"


def glow(c, x, y, r, col, a=1.0):
    c.drawCircle(x, y, r, radial((x, y), r, [(0, col, a), (1, col, 0.0)], blend=PLUS))


def R(x0, y0, x1, y1):
    return skia.Rect.MakeLTRB(x0, y0, x1, y1)


# ---------------------------------------------------------------------------
# Textures for an old university building at night

D.MAKERS.update({
    "office": lambda: D._stripes("#2F4A3F", "#37574A", "#B8954F", 8, 71),
    "seminar": lambda: D._stripes("#2E3A5C", "#35436B", "#7E8AAE", 9, 76),
    "labwall": lambda: D._tiles("#D3DEE2", "#E2EAEC", "#9AA8AE", 8, 72),
    "serverwall": lambda: D._tiles("#2A3138", "#2F383F", "#1A1F24", 4, 73),
    "lobbywall": lambda: D._stripes("#7A3B34", "#86443C", "#C9A45C", 6, 78),
    "commonwall": lambda: D._stripes("#C9A45C", "#D4B067", None, 7, 75),
    "checker": lambda: D._tiles("#E9E1D0", "#2E2A2C", "#8C7A66", 6, 74),
    "labfloor": lambda: D._tiles("#BFCBCF", "#CFD9DC", "#8E9A9E", 6, 79),
    "serverfloor": lambda: D._tiles("#3A424A", "#434C55", "#23292F", 5, 77),
    "darkboards": lambda: D._boards("#9A6A44", "#6A4228", 80),
})

ROOMS = {
    # name: (column, floor, wall, floor texture, floor tile cm)
    "lobby": (0, 0, "lobbywall", "checker", 60.0),
    "liftG": (1, 0, "damask", "darkboards", 120.0),
    "common": (2, 0, "commonwall", "darkboards", 120.0),
    "lab": (0, 1, "labwall", "labfloor", 60.0),
    "lift1": (1, 1, "damask", "darkboards", 120.0),
    "servers": (2, 1, "serverwall", "serverfloor", 70.0),
    "seminar": (0, 2, "seminar", "darkboards", 120.0),
    "lift2": (1, 2, "damask", "darkboards", 120.0),
    "office": (2, 2, "office", "darkboards", 120.0),
}

# light per room: ambient (r, g, b) and lamps (x, y, z, radius cm, (r, g, b))
LIGHTS = {
    "lobby": ((0.40, 0.37, 0.40), [(150, 230, 120, 280, (1.45, 1.20, 0.90)), (40, 200, 120, 170, (0.70, 0.85, 1.15))]),
    "liftG": ((0.42, 0.38, 0.36), [(450, 330, 210, 250, (1.20, 1.02, 0.80)), (560, 290, 110, 130, (1.45, 1.30, 1.05))]),
    "common": ((0.30, 0.32, 0.44), [(700, 260, 110, 260, (0.70, 0.92, 1.40)), (840, 320, 120, 170, (1.30, 1.05, 0.75))]),
    "lab": ((0.40, 0.44, 0.46), [(110, 250, 420, 260, (0.98, 1.02, 1.05)), (230, 340, 460, 170, (0.80, 1.20, 0.98))]),
    "lift1": ((0.38, 0.35, 0.34), [(450, 330, 510, 240, (1.15, 1.00, 0.78))]),
    "servers": ((0.24, 0.30, 0.36), [(700, 280, 400, 250, (0.70, 1.25, 1.35)), (820, 330, 420, 220, (0.55, 1.05, 1.20))]),
    "seminar": ((0.24, 0.26, 0.36), [(190, 340, 760, 220, (0.95, 1.02, 1.22)), (60, 330, 700, 140, (0.55, 0.62, 0.85))]),
    "lift2": ((0.36, 0.33, 0.32), [(450, 330, 810, 240, (1.15, 1.00, 0.78))]),
    "office": ((0.32, 0.29, 0.28), [(820, 290, 690, 250, (1.65, 1.30, 0.85)), (700, 340, 820, 320, (0.90, 0.80, 0.68))]),
}

# ---------------------------------------------------------------------------
# Furniture (cm, base at the origin, up is -y). In "emit" mode a piece draws only what glows.


def bankers_lamp(c):
    if A():
        c.drawOval(R(-9, -3, 9, 1), fill("#B8913F"))
        c.drawLine(0, -2, 0, -24, D.line(2.2, "#B8913F"))
        D.shape(c, poly([(-15, -22), (15, -22), (11, -33), (-11, -33)]), "#2F6B5A", 0.6)
    else:
        glow(c, 0, -18, 46, "#FFD58A", 0.75)
        c.drawRect(R(-12, -23, 12, -21), fill("#FFF3C8"))


def office_desk(c):
    if not A():
        return
    D.shape(c, rrect(-82, -84, 82, -75, 2), "#6E4428")
    D.shape(c, rrect(-78, -75, -32, 0, 2), "#5A361F")
    D.shape(c, rrect(32, -75, 78, 0, 2), "#5A361F")
    for y in (-68, -46, -24):
        for x0 in (-72, 38):
            c.drawRect(R(x0, y, x0 + 34, y + 17), fill("#64402A"))
            c.drawRect(R(x0, y, x0 + 34, y + 17), D.line(0.5))
            c.drawCircle(x0 + 17, y + 8.5, 1.8, fill("#C9A45C"))
    D.shape(c, rrect(-32, -75, 32, -62, 1), "#64402A")
    c.save()
    c.rotate(-6)
    D.shape(c, rrect(-58, -90, -26, -85, 0.5), "#F4EEDD", 0.3)
    c.restore()
    D.shape(c, rrect(-20, -89, 6, -85, 0.5), "#E9D9B0", 0.3)
    D.shape(c, rrect(16, -95, 26, -85, 1.5), "#E9E4DA", 0.4)


def bookcase(c):
    if not A():
        return
    D.shape(c, rrect(-52, -214, 52, 0, 2), "#4A2C1A")
    c.drawRect(R(-46, -208, 46, -6), fill("#2A180E"))
    rng = np.random.default_rng(3)
    cols = ["#8E3446", "#2F5B4F", "#C9A45C", "#5B2440", "#A7C2D5", "#D8A39D", "#3F6FA0", "#E0B05A"]
    for k in range(5):
        y = -208 + k * 40.4
        base = y + 37
        x = -45.0
        while x < 42:
            if rng.random() < 0.1:
                c.drawRect(R(x, base - 7, x + 18, base), fill(cols[int(rng.integers(8))]))
                c.drawRect(R(x + 1, base - 13, x + 16, base - 7), fill(cols[int(rng.integers(8))]))
                x += 20
                continue
            bw, bh = float(rng.uniform(4, 9)), float(rng.uniform(22, 34))
            col = cols[int(rng.integers(8))]
            c.drawRect(R(x, base - bh, min(x + bw, 45), base), fill(col))
            c.drawLine(x + 1, base - bh + 4, min(x + bw, 45) - 1, base - bh + 4, D.line(0.6, "#E9D9B0", 0.55))
            x += bw + 0.6
        c.drawRect(R(-47, base, 47, base + 3.4), fill("#5A361F"))


def safe(c):
    if not A():
        return
    D.shape(c, rrect(-24, -58, 24, 0, 3), "#3A3E44")
    D.shape(c, rrect(-19, -53, 19, -6, 2), "#4A4F57")
    c.drawCircle(4, -31, 7, fill("#8C8F96"))
    c.drawCircle(4, -31, 7, D.line(0.8))
    c.drawLine(-13, -31, -6, -31, D.line(1.8, "#C9A45C"))


def chair(c, col="#6E4428"):
    if not A():
        return
    D.shape(c, rrect(-18, -88, 18, -52, 3), col)
    D.shape(c, rrect(-21, -52, 21, -44, 2), D.shade(col, 1.15))
    for x in (-17, 14):
        c.drawRect(R(x, -44, x + 3, 0), fill(D.shade(col, 0.7)))


def leather_chair(c):
    D.armchair(c, "#6B2E2A") if A() else None


def coat_stand(c):
    if not A():
        return
    c.drawLine(0, 0, 0, -182, D.line(3.2, "#3A2416"))
    for dx in (-15, 15):
        c.drawLine(0, -172, dx, -181, D.line(2.4, "#3A2416"))
    D.shape(c, poly([(-15, -174), (15, -174), (25, -98), (-25, -98)]), "#8C7A5E", 0.5)
    c.drawLine(0, -174, 0, -100, D.line(0.8, "#6A5A42"))
    c.drawLine(-18, -3, 18, -3, D.line(3.4, "#3A2416"))


def long_table(c):
    if A():
        for x in (-92, -32, 28, 88):
            D.shape(c, rrect(x - 13, -104, x + 13, -76, 3), "#4A2C1A", 0.5)
        D.shape(c, rrect(-124, -80, 124, -71, 2), "#5A361F")
        for x in (-116, 112):
            c.drawRect(R(x, -71, x + 5, 0), fill("#3A2416"))
        D.shape(c, rrect(-16, -92, 16, -80, 2), "#3A3E44", 0.5)
        c.drawCircle(-12, -86, 4, fill("#15191D"))
        for x in (-80, 60):
            c.save()
            c.rotate(4 if x > 0 else -5)
            D.shape(c, rrect(x - 10, -85, x + 10, -81, 0.5), "#F4EEDD", 0.3)
            c.restore()
    else:
        glow(c, -12, -86, 10, "#DCEBFF", 0.9)


def lab_bench(c):
    if A():
        D.shape(c, rrect(-92, -90, 92, -81, 1.5), "#E9EEF0")
        D.shape(c, rrect(-88, -81, 88, 0, 2), "#AAB8BF")
        for x in (-58, 0, 58):
            c.drawRect(R(x - 26, -74, x + 26, -8), D.line(0.6, "#7E8C93"))
            c.drawCircle(x + 18, -42, 1.6, fill("#5E6A70"))
        flask = poly([(-4, -90), (4, -90), (4, -104), (11, -116), (-11, -116), (-4, -104)])
        for x, col in ((-66, "#5BE3A1"), (-40, "#62C3FF"), (12, "#F6D36B")):
            c.save()
            c.translate(x, 0)
            D.shape(c, poly([(-10, -90), (10, -90), (6, -108), (3, -128), (-3, -128), (-6, -108)]), "#EAF6FF", 0.45, 0.85)
            c.drawPath(poly([(-9, -91), (9, -91), (6, -104), (-6, -104)]), fill(col, 0.9))
            c.restore()
        del flask
        D.shape(c, rrect(38, -94, 60, -90, 1), "#3A3E44", 0.4)
        c.drawLine(49, -94, 49, -120, D.line(4.0, "#3A3E44"))
        c.drawLine(49, -120, 60, -128, D.line(3.0, "#3A3E44"))
        D.shape(c, rrect(54, -134, 66, -124, 2), "#5E6A70", 0.4)
    else:
        for x, col in ((-66, "#5BE3A1"), (-40, "#62C3FF"), (12, "#F6D36B")):
            glow(c, x, -98, 18, col, 0.55)


def server_rack(c, seed=1):
    if A():
        D.shape(c, rrect(-33, -208, 33, 0, 2), "#1E2328")
        for k in range(15):
            y = -200 + k * 13
            c.drawRect(R(-28, y, 28, y + 11), fill("#2A3036"))
            c.drawRect(R(-28, y, 28, y + 11), D.line(0.4, "#11151A"))
            for j in range(5):
                c.drawRect(R(4 + j * 4.5, y + 3, 6 + j * 4.5, y + 8), fill("#15191D"))
    else:
        rng = np.random.default_rng(seed)
        for k in range(15):
            y = -200 + k * 13
            for j in range(3):
                col = ["#7DFFB0", "#7DFFB0", "#7DFFB0", "#FFCF6B", "#EF5B5B"][int(rng.integers(5))]
                if rng.random() < 0.75:
                    c.drawCircle(-22 + j * 6, y + 5.5, 1.3, fill(col))
                    glow(c, -22 + j * 6, y + 5.5, 4.5, col, 0.55)
        glow(c, 0, -100, 70, "#3FB8AF", 0.1)


def terminal_desk(c):
    if A():
        D.shape(c, rrect(-62, -78, 62, -71, 1.5), "#3A3E44")
        for x in (-58, 54):
            c.drawRect(R(x, -71, x + 4, 0), fill("#2A2E34"))
        D.shape(c, rrect(-30, -128, 30, -88, 2), "#15191D")
        c.drawRect(R(-4, -88, 4, -78), fill("#2A2E34"))
        D.shape(c, rrect(-26, -82, 22, -78, 1), "#2A2E34", 0.4)
        D.shape(c, rrect(32, -90, 44, -78, 1.5), "#E9E4DA", 0.4)
        c.drawRect(R(-27, -125, 27, -91), fill("#0B4A42"))
        rng = np.random.default_rng(9)
        for i in range(7):
            ln = float(rng.uniform(12, 44))
            c.drawLine(-23, -121 + i * 4.6, -23 + ln, -121 + i * 4.6, D.line(1.2, "#9DFFC8", 1.0))
    else:
        glow(c, 0, -108, 80, "#3FB8AF", 0.4)


def porter_desk(c):
    if A():
        D.shape(c, rrect(-92, -98, 92, -89, 2), "#6E4428")
        D.shape(c, rrect(-88, -89, 88, 0, 2), "#5A361F")
        for x in (-80, -20, 40):
            c.drawRect(R(x, -80, x + 40, -10), D.line(0.7, "#3A2416"))
        for x in (-62, -28, 6):
            D.shape(c, rrect(x, -128, x + 30, -102, 2), "#1E2328")
            c.drawRect(R(x + 13, -102, x + 17, -98), fill("#1E2328"))
        D.shape(c, rrect(36, -103, 70, -98, 0.5), "#E9D9B0", 0.3)
        c.drawLine(53, -103, 53, -98, D.line(0.5))
        c.drawCircle(-80, -101, 5, fill("#C9A45C"))
        c.drawLine(78, -98, 78, -120, D.line(1.8, "#3A3E44"))
        D.shape(c, poly([(70, -118), (86, -118), (82, -128), (74, -128)]), "#3A3E44", 0.4)
        for i, x in enumerate((-62, -28, 6)):
            c.drawRect(R(x + 2, -126, x + 28, -104), fill(["#8FA6C8", "#A6B8CC", "#7F98BC"][i]))
            c.drawRect(R(x + 6, -120, x + 14, -110), fill("#5A6E90"))
            for k in range(5):
                c.drawLine(x + 2, -124 + k * 4.4, x + 28, -124 + k * 4.4, D.line(0.5, "#E8F2FF", 0.35))
    else:
        for x in (-62, -28, 6):
            glow(c, x + 15, -115, 30, "#9FC0FF", 0.35)
        glow(c, 78, -116, 46, "#FFD58A", 0.75)


def umbrella_stand(c):
    if not A():
        return
    for x, col, ang in ((-6, "#EF5B5B", -8), (2, "#1B1F3B", 5), (8, "#F2B33D", 12)):
        c.save()
        c.translate(x, -40)
        c.rotate(ang)
        c.drawLine(0, 0, 0, -48, D.line(1.6, "#3A2416"))
        D.shape(c, poly([(-6, -10), (6, -10), (2, -46), (-2, -46)]), col, 0.4)
        c.restore()
    D.shape(c, rrect(-14, -42, 14, 0, 3), "#3A3E44")


def bench(c):
    if not A():
        return
    D.shape(c, rrect(-60, -48, 60, -40, 2), "#7A4B2E")
    D.shape(c, rrect(-60, -80, 60, -70, 2), "#7A4B2E")
    for x in (-54, 50):
        c.drawRect(R(x, -80, x + 4, 0), fill("#3A2416"))


def sofa(c, col="#7A3B46"):
    if not A():
        return
    dk = D.shade(col, 0.78)
    D.shape(c, rrect(-90, -86, 90, -44, 12), col)
    D.shape(c, rrect(-98, -62, -76, -10, 8), dk)
    D.shape(c, rrect(76, -62, 98, -10, 8), dk)
    D.shape(c, rrect(-78, -46, 0, -26, 6), D.shade(col, 1.12))
    D.shape(c, rrect(0, -46, 78, -26, 6), D.shade(col, 1.12))
    D.shape(c, rrect(-86, -26, 86, -10, 4), dk)
    D.shape(c, rrect(-60, -80, -30, -56, 6), "#F2B33D", 0.5)
    for x in (-80, 76):
        c.drawRect(R(x, -10, x + 4, 0), fill("#3A2416"))


def tv_unit(c):
    if A():
        D.shape(c, rrect(-50, -46, 50, 0, 2), "#4A2C1A")
        D.shape(c, rrect(-44, -110, 44, -52, 3), "#15191D")
        c.drawRect(R(-6, -52, 6, -46), fill("#15191D"))
        c.drawRect(R(-40, -106, 40, -56), fill("#8DB6EE"))
        c.drawRect(R(-40, -70, 40, -56), fill("#2F68C0"))
        c.drawRect(R(-34, -100, -6, -76), fill("#DDEBFF"))
        c.drawRect(R(0, -96, 34, -90), fill("#F2B33D"))
        c.drawRect(R(0, -86, 26, -81), fill("#DDEBFF"))
    else:
        glow(c, 0, -80, 110, "#7FB2FF", 0.42)


def counter(c):
    if A():
        D.shape(c, rrect(-70, -92, 70, -84, 1.5), "#C9C2B4")
        D.shape(c, rrect(-66, -84, 66, 0, 2), "#E9E1D0")
        for x in (-44, 0, 44):
            c.drawRect(R(x - 20, -78, x + 20, -8), D.line(0.6, "#B8AE9E"))
        D.shape(c, rrect(-56, -128, -24, -92, 3), "#2A2E34")
        D.shape(c, rrect(-50, -108, -30, -96, 1), "#15191D", 0.3)
        for x in (4, 18):
            D.shape(c, rrect(x, -100, x + 10, -92, 1.5), ["#EF5B5B", "#3FB8AF"][x > 10], 0.4)
        D.shape(c, rrect(36, -112, 58, -92, 4), "#B8BCC4")
    else:
        c.drawCircle(-30, -120, 1.8, fill("#EF5B5B"))
        glow(c, -30, -120, 6, "#EF5B5B", 0.7)


def fridge(c):
    if not A():
        return
    D.shape(c, rrect(-30, -180, 30, 0, 5), "#E6E2D8")
    c.drawLine(-30, -112, 30, -112, D.line(0.8))
    c.drawLine(22, -170, 22, -124, D.line(2.2, "#B8BCC4"))
    c.drawLine(22, -100, 22, -60, D.line(2.2, "#B8BCC4"))
    for k, col in enumerate(("#EF5B5B", "#F2B33D", "#3FB8AF")):
        c.drawRect(R(-20 + k * 10, -160 + k * 6, -12 + k * 10, -150 + k * 6), fill(col))


def vending(c):
    if A():
        D.shape(c, rrect(-36, -190, 36, 0, 4), "#8E2F3A")
        D.shape(c, rrect(-30, -180, 14, -50, 2), "#2A2E34")
        D.shape(c, rrect(18, -170, 30, -110, 2), "#5E2A32", 0.4)
        D.shape(c, rrect(-28, -40, 12, -14, 2), "#15191D", 0.4)
        c.drawRect(R(-28, -178, 12, -52), fill("#F4E2BC"))
        cols = ["#EF5B5B", "#F2B33D", "#3FB8AF", "#9B87F5", "#7DFFB0"]
        for row in range(5):
            c.drawRect(R(-28, -150 + row * 24, 12, -148 + row * 24), fill("#B8A890"))
            for k in range(4):
                c.drawRect(R(-26 + k * 9.6, -172 + row * 24, -19 + k * 9.6, -160 + row * 24), fill(cols[(row + k) % 5]))
    else:
        glow(c, -8, -116, 100, "#FFE6B0", 0.38)


def archive_shelf(c, seed=4):
    if not A():
        return
    rng = np.random.default_rng(seed)
    c.drawRect(R(-58, -170, -54, 0), fill("#5E6A70"))
    c.drawRect(R(54, -170, 58, 0), fill("#5E6A70"))
    for k in range(4):
        y = -164 + k * 42
        c.drawRect(R(-58, y + 38, 58, y + 42), fill("#7E8C93"))
        x = -52.0
        while x < 44:
            bw = float(rng.uniform(20, 30))
            col = ["#C9A877", "#B8956A", "#D6BC8E"][int(rng.integers(3))]
            D.shape(c, rrect(x, y + 12, min(x + bw, 52), y + 38, 1), col, 0.4)
            c.drawRect(R(x + bw * 0.25, y + 20, x + bw * 0.75, y + 26), fill("#F4EEDD", 0.85))
            x += bw + 2


def open_box(c):
    if A():
        D.shape(c, rrect(-26, -30, 26, 0, 1.5), "#C9A877")
        D.shape(c, poly([(-26, -30), (-34, -46), (-8, -40), (0, -30)]), "#D6BC8E", 0.4)
        for k in range(3):
            c.save()
            c.rotate(-8 + k * 9)
            D.shape(c, rrect(-14 + k * 6, -44, 2 + k * 6, -24, 0.5), "#F4EEDD", 0.3)
            c.restore()
    else:
        glow(c, 0, -30, 36, "#FFE6A7", 0.35)


def hanging_bulb(c):
    if A():
        c.drawLine(0, -96, 0, -12, D.line(0.8, "#2A211C"))
        c.drawRect(R(-2.5, -14, 2.5, -9), fill("#8C7A66"))
        c.drawCircle(0, -5, 5, fill("#FFF3C8"))
    else:
        glow(c, 0, -5, 70, "#FFD58A", 0.7)
        glow(c, 0, -5, 12, "#FFFFFF", 0.9)


def radiator(c):
    if not A():
        return
    D.shape(c, rrect(-34, -52, 34, -6, 3), "#B8B2A6")
    for k in range(9):
        c.drawLine(-28 + k * 7, -48, -28 + k * 7, -10, D.line(1.6, "#8C877C"))
    for x in (-30, 26):
        c.drawRect(R(x, -6, x + 4, 0), fill("#6A655C"))


def round_table(c):
    if not A():
        return
    D.shape(c, rrect(-40, -74, 40, -68, 2), "#7A4B2E")
    c.drawRect(R(-3, -68, 3, -4), fill("#5A361F"))
    c.drawOval(R(-18, -6, 18, 0), fill("#5A361F"))
    for x, col in ((-22, "#EF5B5B"), (-2, "#F4EEDD"), (18, "#3FB8AF")):
        D.shape(c, rrect(x - 5, -84, x + 5, -74, 1.5), col, 0.4)
    D.shape(c, rrect(-34, -77, -14, -74, 0.5), "#F4EEDD", 0.3)


def sheet_chair(c):
    if not A():
        return
    D.shape(c, poly([(-30, 0), (-34, -60), (-22, -96), (0, -104), (22, -96), (34, -60), (30, 0), (18, -6), (6, 0), (-6, -6), (-18, 0)]), "#E6E2D8", 0.6)
    c.drawLine(-14, -88, -4, -40, D.line(0.8, "#B8B2A6"))
    c.drawLine(12, -90, 18, -30, D.line(0.8, "#B8B2A6"))


def leaning_portrait(c):
    if not A():
        return
    c.save()
    c.rotate(-8)
    D.shape(c, rrect(-26, -70, 26, 0, 1), "#8C6A45")
    c.drawRect(R(-20, -64, 20, -6), fill("#3B2A4A"))
    c.drawCircle(0, -42, 8, fill("#6A5A6E"))
    c.drawPath(poly([(-14, -8), (0, -28), (14, -8)]), fill("#6A5A6E"))
    c.restore()


def bicycle(c):
    if not A():
        return
    for x in (-34, 34):
        c.drawCircle(x, -24, 22, D.line(2.4, "#1B1F2A"))
        c.drawCircle(x, -24, 2.5, fill("#1B1F2A"))
    c.drawPath(poly([(-34, -24), (-8, -24), (10, -52), (-16, -52)], close=True), D.line(2.6, "#C0563F"))
    c.drawLine(10, -52, 34, -24, D.line(2.6, "#C0563F"))
    c.drawLine(10, -52, 14, -64, D.line(2.4, "#1B1F2A"))
    c.drawLine(8, -64, 22, -66, D.line(2.4, "#1B1F2A"))
    c.drawLine(-16, -52, -18, -60, D.line(2.4, "#1B1F2A"))
    D.shape(c, rrect(-26, -64, -10, -60, 2), "#1B1F2A", 0.3)


def floor_dial(p, x, z, at):
    """A brass floor indicator over the lift: needle on G, 1, 2 or A."""
    if not A():
        p.c.drawCircle(x, z, 34, radial((x, z), 34, [(0, "#FFD58A", 0.25), (1, "#FFD58A", 0.0)], blend=PLUS))
        return
    path = skia.Path()
    path.addArc(R(x - 24, z - 24, x + 24, z + 24), 0, 180)
    path.close()
    p.c.drawPath(path, fill("#C9A45C"))
    p.c.drawPath(path, D.line(1.2))
    for k in range(4):
        a = math.radians(165 - k * 50)
        p.c.drawCircle(x + math.cos(a) * 17, z + math.sin(a) * 17, 2.2, fill("#3A2416"))
    a = math.radians(165 - "G12A".index(at) * 50)
    p.c.drawLine(x, z, x + math.cos(a) * 15, z + math.sin(a) * 15, D.line(2.0, "#C0392B"))
    p.c.drawCircle(x, z, 2.6, fill("#3A2416"))


def periodic_table(p, x, z, w, h):
    if not A():
        return
    p.rect(x - 3, z - 3, x + w + 3, z + h + 3, fill("#F4F6F6"))
    cols = ["#EF8A7A", "#F6D36B", "#9FD3C7", "#A7C2D5", "#BCA9CB"]
    for row in range(5):
        for k in range(12):
            if row < 2 and 1 < k < 10:
                continue
            p.rect(x + k * w / 12 + 0.6, z + row * h / 5 + 0.6, x + (k + 1) * w / 12 - 0.6, z + (row + 1) * h / 5 - 0.6, fill(cols[(k + row) % 5]))


def dartboard(p, x, z):
    if not A():
        return
    for r, col in ((20, "#1B1F2A"), (16, "#E9E1D0"), (12, "#C0392B"), (8, "#E9E1D0"), (4, "#2F5B4F"), (1.6, "#C0392B")):
        p.c.drawCircle(x, z, r, fill(col))
    p.c.drawLine(x + 6, z + 4, x + 16, z + 9, D.line(1.4, "#F2B33D"))


def cobwebs(p, corners):
    if not A():
        return
    for cx, cz, sx in corners:
        for k in range(4):
            a = math.radians(-5 - k * 25)
            p.c.drawLine(cx, cz, cx + sx * math.cos(a) * 60, cz + math.sin(a) * 60, D.line(0.5, "#D9D2C2", 0.6))
        for r in (20, 36, 52):
            p.c.drawArc(R(cx - r, cz - r, cx + r, cz + r), 180 if sx > 0 else 270, 90, False, D.line(0.5, "#D9D2C2", 0.5))


def sconce(p, x, z):
    """A wall light, on a back wall (plane coordinates, up is +z)."""
    if A():
        p.rect(x - 3, z - 14, x + 3, z, fill("#B8913F"))
        p.poly([(x - 9, z), (x + 9, z), (x + 6, z + 12), (x - 6, z + 12)], fill("#F2E6D2"))
    else:
        p.c.drawCircle(x, z + 4, 60, radial((x, z + 4), 60, [(0, "#FFD58A", 0.55), (1, "#FFD58A", 0.0)], blend=PLUS))


def night_window(p, cx, w, z0, h, curtain="#5B2440", lit=0.9):
    x0, x1 = cx - w / 2, cx + w / 2
    if A():
        p.rect(x0 - 6, z0 - 6, x1 + 6, z0 + h + 6, fill("#E8DCC4"))
        p.rect(x0, z0, x1, z0 + h, linear((0, z0), (0, z0 + h), [(0, "#2A3260", 1.0), (1, "#0B1024", 1.0)]))
        p.rect(x0, z0, x1, z0 + h * 0.3, fill("#141A36"))
        for k in range(9):
            xx = x0 + 6 + k * (w - 12) / 8
            p.c.drawLine(xx, z0 + h - 6, xx - 5, z0 + h - 26, D.line(0.6, "#9FB2E0", 0.45))
        p.rect(cx - 2, z0, cx + 2, z0 + h, fill("#E8DCC4"))
        p.rect(x0, z0 + h * 0.48, x1, z0 + h * 0.48 + 3, fill("#E8DCC4"))
        p.rect(x0 - 16, z0 - 8, x0 + 4, z0 + h + 10, fill(curtain))
        p.rect(x1 - 4, z0 - 8, x1 + 16, z0 + h + 10, fill(curtain))
        p.rect(x0 - 20, z0 + h + 10, x1 + 20, z0 + h + 14, fill("#B8913F"))
    else:
        rng = np.random.default_rng(int(cx * 7 + z0))
        for _ in range(int(10 * lit)):
            xx = float(rng.uniform(x0 + 4, x1 - 6))
            zz = float(rng.uniform(z0 + 4, z0 + h * 0.3))
            p.rect(xx, zz, xx + 3, zz + 3, fill("#FFCF6B", 0.85))


def deco_back(p, name, w, h):
    if name == "office":
        if A():
            p.rect(0, 0, w, 95, D.tex("darkboards", 90.0))
            p.rect(0, 95, w, 99, fill("#B8954F"))
            D.frame_pic(p, w * 0.5 - 22, 170, 44, 54, "#3B2A4A")
        night_window(p, w * 0.3, 70, 118, 104, "#5B2440")
        sconce(p, w * 0.82, 196)
    elif name == "seminar":
        if A():
            p.rect(w * 0.42, 92, w * 0.92, 222, fill("#9FAED0"))
            p.rect(w * 0.42, 222, w * 0.92, 228, fill("#3A3E44"))
            p.rect(w * 0.47, 108, w * 0.62, 196, fill("#C9D6F2"))
            p.c.drawCircle(w * 0.545, 160, 18, fill("#7E8EBE"))
            for k in range(4):
                p.rect(w * 0.66, 118 + k * 20, w * 0.66 + 30 + k * 12, 130 + k * 20, fill("#E8B04A"))
        else:
            cx = w * 0.67
            p.c.drawCircle(cx, 157, 120, radial((cx, 157), 120, [(0, "#B8CCFF", 0.22), (1, "#B8CCFF", 0.0)], blend=PLUS))
        night_window(p, w * 0.18, 60, 118, 100, "#2E3A5C")
    elif name == "lab":
        if A():
            p.rect(24, 112, 150, 214, fill("#F4F6F6"))
            p.rect(24, 112, 150, 214, D.line(3.0, "#9AA8AE"))
            rng = np.random.default_rng(12)
            for k in range(6):
                y = 200 - k * 15
                x = 34.0
                for _ in range(int(rng.integers(3, 7))):
                    ln = float(rng.uniform(6, 16))
                    p.c.drawLine(x, y, x + ln, y + float(rng.uniform(-2, 2)), D.line(1.2, ["#3F6FA0", "#C0563F"][k % 2], 0.85))
                    x += ln + 4
            periodic_table(p, 30, 224, 112, 40)
            p.rect(w * 0.56, 86, w * 0.94, 236, fill("#9AA8AE"))
            p.rect(w * 0.58, 98, w * 0.92, 214, fill("#3E8A76"))
            p.rect(w * 0.58, 200, w * 0.92, 205, fill("#BFFFE6"))
            for k in range(3):
                p.rect(w * 0.62 + k * 26, 104, w * 0.62 + k * 26 + 10, 124 + k * 6, fill("#9FE8D0"))
            p.rect(w * 0.58, 86, w * 0.92, 92, fill("#5E6A70"))
        else:
            cx = w * 0.75
            p.c.drawCircle(cx, 156, 110, radial((cx, 156), 110, [(0, "#7CFFC8", 0.2), (1, "#7CFFC8", 0.0)], blend=PLUS))
    elif name == "servers":
        if A():
            p.rect(0, 238, w, 252, fill("#3A3E44"))
            for k in range(9):
                p.c.drawLine(10 + k * 30, 238, 18 + k * 30, 160, D.line(1.6, ["#EF5B5B", "#3F6FA0", "#F2B33D"][k % 3], 0.9))
    elif name == "lobby":
        if A():
            p.rect(0, 0, w, 100, fill("#4A2420"))
            p.rect(0, 100, w, 104, fill("#C9A45C"))
            p.rect(w * 0.55, 128, w * 0.9, 210, fill("#B9864F"))
            p.rect(w * 0.55, 128, w * 0.9, 210, D.line(2.5, "#5A361F"))
            rng = np.random.default_rng(21)
            for k in range(6):
                x = w * 0.57 + float(rng.uniform(0, w * 0.27))
                z = 136 + float(rng.uniform(0, 56))
                p.rect(x, z, x + 18, z + 14, fill(["#F4EEDD", "#F6D36B", "#A7C2D5"][k % 3]))
                p.c.drawCircle(x + 9, z + 13, 1.6, fill("#EF5B5B"))
            p.c.drawLine(w * 0.6, 150, w * 0.8, 186, D.line(1.2, "#D6312F"))
            cx, cz = w * 0.3, 226
            p.c.drawCircle(cx, cz, 16, fill("#F4EEDD"))
            p.c.drawCircle(cx, cz, 16, D.line(2.0, "#3A2416"))
            p.c.drawLine(cx, cz, cx - 1.2, cz + 10, D.line(1.8, "#1B1F3B"))
            p.c.drawLine(cx, cz, cx - 4, cz + 12, D.line(1.2, "#1B1F3B"))
        sconce(p, w * 0.12, 196)
    elif name == "common":
        if A():
            p.rect(0, 0, w, 90, D.tex("darkboards", 90.0))
            p.rect(0, 90, w, 94, fill("#7A4B2E"))
            D.frame_pic(p, w * 0.72, 168, 50, 40, "#E98F7E")
            dartboard(p, w * 0.52, 200)
        night_window(p, w * 0.28, 66, 120, 100, "#2F5B4F")
    elif name.startswith("lift"):
        if A():
            p.rect(0, 0, w, 96, fill("#5A361F"))
            p.rect(0, 96, w, 100, fill("#C9A45C"))
            p.rect(105, 0, 195, h, fill("#14100E"))
            for k in range(3):
                p.c.drawLine(132 + k * 18, 0, 132 + k * 18, h, D.line(1.0, "#3A322C"))
            D.frame_pic(p, w - 74, 118, 36, 46, ["#A7C2D5", "#E9C3BB", "#9CB398"]["G12".index(name[-1])])
            D.frame_pic(p, 30, 118, 36, 46, ["#BCA9CB", "#C9A45C", "#D8A39D"]["G12".index(name[-1])])
        floor_dial(p, 150, 252, name[-1])
        sconce(p, 50, 200)
        sconce(p, w - 50, 200)


def cage(c, cam, z0, z1):
    """The open iron cage of the lift through one floor: back and sides (the front stays open for the car)."""
    for (o, a, ln) in (((410.0, 300.0, z0), (1, 0, 0), 80.0), ((410.0, 160.0, z0), (0, 1, 0), 140.0), ((490.0, 160.0, z0), (0, 1, 0), 140.0)):
        with On(c, cam, o, a, (0, 0, 1)) as p:
            if not A():
                continue
            hgt = z1 - z0
            for k in range(int(ln // 10) + 1):
                p.rect(k * 10 - 0.9, 0, k * 10 + 0.9, hgt, fill("#2A2420"))
            for zz in (2, hgt / 2, hgt - 4):
                p.rect(0, zz - 1.6, ln, zz + 1.6, fill("#3A322C"))


def draw_room(c, cam, name):
    col, fl, wall, floor_tex, tile = ROOMS[name]
    xa, xb = COLS[col] + WT, COLS[col + 1] - WT
    z0, z1 = FLOORS[fl]
    w, h = xb - xa, z1 - z0
    with On(c, cam, (xa, DEPTH, z0), (1, 0, 0), (0, 0, 1)) as p:
        if A():
            p.rect(0, 0, w, h, D.tex(wall, 70.0))
            p.rect(0, 0, w, 14, fill(D.TRIM))
            p.rect(0, h - 10, w, h, fill(D.shade(D.TRIM, 0.85)))
        deco_back(p, name, w, h)
        if A():
            p.rect(0, 0, w, h, linear((0, h - 40), (0, h), [(0, "#120C08", 0.0), (1, "#120C08", 0.3)]))
            p.rect(0, 0, 30, h, linear((0, 0), (30, 0), [(0, "#120C08", 0.25), (1, "#120C08", 0.0)]))
            p.rect(w - 30, 0, w, h, linear((w - 30, 0), (w, 0), [(0, "#120C08", 0.0), (1, "#120C08", 0.25)]))
    for x, facing in ((xa, 1), (xb, -1)):
        if (cam.x - x) * facing <= 0:
            continue
        with On(c, cam, (x, 0, z0), (0, 1, 0), (0, 0, 1)) as p:
            if A():
                p.rect(0, 0, DEPTH, h, D.tex(wall, 70.0))
                p.rect(0, 0, DEPTH, 14, fill(D.TRIM))
                p.rect(0, 0, DEPTH, h, fill("#120C08", 0.12))
            if name == "lobby" and x == xa:   # the front door, with the street light through its glass
                if A():
                    p.rect(110, 0, 240, 214, fill("#4A2C1A"))
                    p.rect(118, 8, 172, 200, fill("#3A2416"))
                    p.rect(178, 8, 232, 200, fill("#3A2416"))
                    for x0 in (124, 184):
                        p.rect(x0, 96, x0 + 42, 190, linear((0, 96), (0, 190), [(0, "#1B2550", 1.0), (1, "#0B1024", 1.0)]))
                    p.rect(104, 214, 246, 222, fill("#C9A45C"))
                else:
                    for x0 in (124, 184):
                        p.rect(x0, 96, x0 + 42, 190, fill("#9FB8FF", 0.22))
    if cam.z > z0:
        with On(c, cam, (xa, 0, z0), (1, 0, 0), (0, 1, 0)) as p:
            if A():
                p.rect(0, 0, w, DEPTH, D.tex(floor_tex, tile, dx=xa * 0.37))
                if name in ("office", "common", "lobby"):
                    p.rect(w * 0.16, 60, w * 0.84, 250, D.tex("rug", w * 0.68, dx=w * 0.16, dy=60))
                if name.startswith("lift"):
                    p.rect(402 - xa, 156, 498 - xa, 304, fill("#0E0B0A"))
                p.rect(0, DEPTH - 30, w, DEPTH, linear((0, DEPTH - 30), (0, DEPTH), [(0, "#120C08", 0.0), (1, "#120C08", 0.3)]))
    if cam.z < z1:
        with On(c, cam, (xa, 0, z1), (1, 0, 0), (0, 1, 0)) as p:
            if A():
                p.rect(0, 0, w, DEPTH, fill(D.CEILC))
                p.rect(0, 0, w, DEPTH, fill("#120C08", 0.2))
                if name.startswith("lift"):
                    p.rect(402 - xa, 156, 498 - xa, 304, fill("#0E0B0A"))
    if name.startswith("lift"):
        cage(c, cam, z0, z1)
    furnish(c, cam, name, xa, z0)


FURNITURE = {
    # name: [(x, y, height cm, draw, shadow (rx, ry))]
    "office": [((693, 342), 52, radiator, (34, 8)), ((800, 300), 84, office_desk, (84, 26)), ((660, 320), 214, bookcase, (52, 14)),
               ((870, 318), 58, safe, (26, 16)), ((628, 300), 182, coat_stand, (18, 12)), ((710, 255), 95, leather_chair, (46, 30))],
    "seminar": [((59, 342), 52, radiator, (34, 8)), ((170, 260), 104, long_table, (124, 30)), ((60, 300), 88, chair, (20, 14))],
    "lab": [((140, 290), 134, lab_bench, (92, 22)), ((250, 230), 88, lambda k: chair(k, "#5E6A70"), (20, 14))],
    "servers": [((660, 320), 208, lambda k: server_rack(k, 1), (33, 14)), ((736, 320), 208, lambda k: server_rack(k, 2), (33, 14)),
                ((812, 320), 208, lambda k: server_rack(k, 3), (33, 14)), ((690, 240), 128, terminal_desk, (62, 20))],
    "lobby": [((150, 300), 128, porter_desk, (92, 24)), ((260, 300), 88, umbrella_stand, (16, 12)), ((70, 300), 80, bench, (60, 14))],
    "common": [((720, 290), 90, sofa, (98, 30)), ((840, 300), 128, counter, (70, 20)), ((620, 310), 180, fridge, (30, 14)),
               ((700, 170), 110, tv_unit, (50, 18)), ((830, 205), 84, round_table, (40, 20))],
    "liftG": [((560, 300), 190, vending, (36, 16))],
    "lift1": [((350, 300), 80, bench, (60, 14))],
    "lift2": [((560, 342), 52, radiator, (34, 8))],
}


def furnish(c, cam, name, xa, z0):
    for (x, y), hgt, fn, shad in FURNITURE[name]:
        if fn is None:
            continue
        if shad and A():
            D.floor_shadow(c, cam, x, y, z0, *shad)
        D.billboard(c, cam, (x, y, z0), hgt, fn)
    if name == "office":
        D.billboard(c, cam, (858.0, 300.0, z0 + 84), 33, bankers_lamp)
    if name == "servers":
        pass


def draw_attic(c, cam):
    x0, x1, z0, top = WT, 900.0 - WT, ATTIC_Z, ROOF_TOP
    slope = [(x0, z0), (x1, z0), (x1 - SLOPE_IN, top), (x0 + SLOPE_IN, top)]
    with On(c, cam, (0, DEPTH, 0), (1, 0, 0), (0, 0, 1)) as p:
        if A():
            p.poly(slope, D.tex("attic", 120.0))
            p.poly(slope, fill("#120C08", 0.18))
        cx = 450.0
        vis = p.visible([(cx - 50, 990), (cx + 50, 990), (cx + 50, 1100), (cx - 50, 1100)])
        if len(vis) == 4:
            if A():
                p.c.drawCircle(cx, 1045, 44, fill("#D9CDB8"))
                p.c.drawCircle(cx, 1045, 37, linear((0, 1008), (0, 1082), [(0, "#26305E", 1.0), (1, "#0B1024", 1.0)]))
                p.c.drawCircle(cx + 14, 1058, 10, fill("#F4EEDD"))
                p.c.drawLine(cx - 37, 1045, cx + 37, 1045, D.line(3.0, "#D9CDB8"))
                p.c.drawLine(cx, 1008, cx, 1082, D.line(3.0, "#D9CDB8"))
            else:
                p.c.drawCircle(cx + 14, 1058, 30, radial((cx + 14, 1058), 30, [(0, "#E8F0FF", 0.9), (1, "#E8F0FF", 0.0)], blend=PLUS))
                p.c.drawCircle(cx + 14, 1058, 9, fill("#FFFFFF", 0.9))
    if cam.z > z0 and A():
        with On(c, cam, (0, 0, z0), (1, 0, 0), (0, 1, 0)) as p:
            p.rect(x0, 0, x1, DEPTH, D.tex("attic", 140.0))
            p.rect(x0, DEPTH - 30, x1, DEPTH, linear((0, DEPTH - 30), (0, DEPTH), [(0, "#120C08", 0.0), (1, "#120C08", 0.35)]))
            for k in range(7):   # footprints in the dust, from the lift to the box
                fx, fy = 470 + k * 20, 210 + (k % 2) * 14
                p.c.drawOval(R(fx - 5, fy - 3, fx + 5, fy + 3), fill("#5A4632", 0.5))
            p.rect(402, 156, 498, 304, fill("#0E0B0A"))
    for xa, xb in ((x0, x0 + SLOPE_IN), (x1, x1 - SLOPE_IN)):
        a = np.array([0.0, 1.0, 0.0])
        b = np.array([xb - xa, 0.0, top - z0])
        ln = float(np.linalg.norm(b))
        with On(c, cam, (xa, 0, z0), a, b / ln) as p:
            if A():
                p.rect(0, 0, DEPTH, ln, D.tex("attic", 120.0))
                p.rect(0, 0, DEPTH, ln, fill("#120C08", 0.28))
                for k in range(1, 4):
                    p.rect(0, ln * k / 4 - 3, DEPTH, ln * k / 4 + 3, fill("#6A4A30"))
    if A():
        with On(c, cam, (0, 0, top), (1, 0, 0), (0, 1, 0)) as p:
            p.rect(x0 + SLOPE_IN, 0, x1 - SLOPE_IN, DEPTH, D.tex("attic", 120.0))
            p.rect(x0 + SLOPE_IN, 0, x1 - SLOPE_IN, DEPTH, fill("#120C08", 0.3))
    cage(c, cam, z0, z0 + 200)
    with On(c, cam, (0, DEPTH, 0), (1, 0, 0), (0, 0, 1)) as p:
        cobwebs(p, [(x0 + SLOPE_IN + 6, top - 4, 1), (x1 - SLOPE_IN - 6, top - 4, -1)])
    items = [((150, 300), 170, lambda k: archive_shelf(k, 4), (58, 14)), ((290, 300), 170, lambda k: archive_shelf(k, 5), (58, 14)),
             ((390, 300), 104, sheet_chair, (34, 18)), ((690, 330), 70, leaning_portrait, (26, 8)),
             ((760, 290), 56, D.trunk if A() else None, (46, 24)), ((600, 250), 46, open_box, (30, 18)),
             ((820, 230), 90, D.boxes if A() else None, (44, 20))]
    for (x, y), hgt, fn, shad in items:
        if fn is None:
            continue
        if A():
            D.floor_shadow(c, cam, x, y, z0, *shad)
        D.billboard(c, cam, (x, y, z0), hgt, fn)
    D.billboard(c, cam, (600.0, 220.0, z0 + 130), 96, hanging_bulb)


# ---------------------------------------------------------------------------
# The night around the house

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


def draw_world(c, cam):
    if A():
        c.drawRect(skia.Rect.MakeWH(W, H), linear((0, 0), (0, H), [(0, "#05070F", 1.0), (0.38, "#0E1430", 1.0), (0.62, "#1C2048", 1.0), (1, "#120E1E", 1.0)]))
        rng = np.random.default_rng(7)
        for _ in range(70):   # a few stars between the clouds
            x, y = float(rng.uniform(0, W)), float(rng.uniform(0, H * 0.3))
            c.drawCircle(x, y, float(rng.uniform(0.6, 1.6)), fill("#DDE6FF", float(rng.uniform(0.2, 0.7))))
        for x, y, r, a in ((180, 260, 160, 0.55), (420, 190, 190, 0.5), (900, 300, 210, 0.5), (760, 140, 150, 0.45)):
            cl = fill("#2A3260", a)
            cl.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, r * 0.35))
            c.drawOval(R(x - r * 1.6, y - r * 0.45, x + r * 1.6, y + r * 0.45), cl)
        c.drawCircle(880, 210, 46, fill("#F2EBD8"))
        c.drawCircle(866, 200, 9, fill("#DCD3BC"))
        c.drawCircle(896, 226, 6, fill("#DCD3BC"))
        rng = np.random.default_rng(17)
        x = -20.0
        while x < W + 20:   # the city behind, in silhouette
            bw, bh = float(rng.uniform(50, 120)), float(rng.uniform(140, 420))
            c.drawRect(R(x, 1230 - bh, x + bw, 1260), fill("#0C0F22"))
            x += bw + float(rng.uniform(-10, 8))
    else:
        c.save()
        c.clipPath(poly(house_poly(cam)), skia.ClipOp.kDifference, True)
        glow(c, 880, 210, 230, "#B8C8FF", 0.35)
        rng = np.random.default_rng(17)
        x = -20.0
        while x < W + 20:
            bw, bh = float(rng.uniform(50, 120)), float(rng.uniform(140, 420))
            for _ in range(int(bh // 40)):
                if rng.random() < 0.45:
                    wx, wy = x + float(rng.uniform(6, bw - 10)), 1230 - float(rng.uniform(20, bh - 10))
                    c.drawRect(R(wx, wy, wx + 5, wy + 6), fill("#FFCF6B", float(rng.uniform(0.35, 0.8))))
            x += bw + float(rng.uniform(-10, 8))
        c.restore()
    with On(c, cam, (-900, -1400, -40), (1, 0, 0), (0, 1, 0)) as p:
        if A():
            p.rect(0, 0, 2700, 1800, D.tex("asphalt", 140.0))
            p.rect(0, 1240, 2700, 1400, fill("#4A4C56"))          # the pavement
            p.rect(0, 1236, 2700, 1244, fill("#6A6C74"))          # the kerb
            for k in range(12):   # puddles
                px, py = 300 + k * 190 + (k % 3) * 40, 900 + (k % 4) * 90
                p.c.drawOval(R(px - 90, py - 22, px + 90, py + 22), fill("#1A2244", 0.85))
            for k in range(14):   # road markings
                p.rect(80 + k * 200, 700, 180 + k * 200, 714, fill("#C9C2A0", 0.55))
        else:
            for k in range(12):   # the house's light in the puddles
                px, py = 300 + k * 190 + (k % 3) * 40, 900 + (k % 4) * 90
                p.c.drawOval(R(px - 80, py - 18, px + 80, py + 18), fill("#FFCF6B", 0.10))
    D.billboard(c, cam, (-36.0, -110.0, -40.0), 420, street_lamp)
    D.billboard(c, cam, (52.0, -150.0, -40.0), 64, bicycle)
    D.billboard(c, cam, (1080.0, 120.0, -40.0), 300, bare_tree)


# ---------------------------------------------------------------------------
# The three passes

CAM_POS, CAM_AT = (450.0, -640.0, 590.0), (450.0, 200.0, 600.0)


def camera():
    return D.look_cam(CAM_POS, CAM_AT)


def house_poly(cam):
    return [proj(cam, (-22, 0, -40)), proj(cam, (922, 0, -40)), proj(cam, (922, 0, ATTIC_Z)), proj(cam, (900 - WT - SLOPE_IN + 24, 0, ROOF_TOP + 40)),
            proj(cam, (760, 0, ROOF_TOP + 40)), proj(cam, (760, 0, ROOF_TOP + 130)), proj(cam, (680, 0, ROOF_TOP + 130)), proj(cam, (680, 0, ROOF_TOP + 40)),
            proj(cam, (WT + SLOPE_IN - 24, 0, ROOF_TOP + 40)), proj(cam, (-22, 0, ATTIC_Z))]


def scene(c, t):
    cam = camera()
    draw_world(c, cam)
    for name in ROOMS:
        draw_room(c, cam, name)
    draw_attic(c, cam)
    if A():
        D.draw_cut_edges(c, cam)


def proj(cam, p):
    q = cam.project(p)
    return (q[0], q[1]) if q else None


def lhex(v):
    return "#%02X%02X%02X" % tuple(int(np.clip(x / 2.0 * 255, 0, 255)) for x in v)


def opening(cam, xa, xb, z0, z1):
    return [proj(cam, (xa, 0, z0)), proj(cam, (xb, 0, z0)), proj(cam, (xb, 0, z1)), proj(cam, (xa, 0, z1))]


def light_scene(c, t):
    """The light map: 1.0 (stored as mid grey) leaves a surface as painted."""
    cam = camera()
    c.drawRect(skia.Rect.MakeWH(W, H), fill(lhex((1.0, 1.0, 1.0))))
    house = [proj(cam, (-22, 0, -40)), proj(cam, (922, 0, -40)), proj(cam, (922, 0, ATTIC_Z)), proj(cam, (900 - WT - SLOPE_IN + 24, 0, ROOF_TOP + 40)),
             proj(cam, (WT + SLOPE_IN - 24, 0, ROOF_TOP + 40)), proj(cam, (-22, 0, ATTIC_Z))]
    c.drawPath(poly(house), fill(lhex((0.62, 0.6, 0.66))))
    for name, (col, fl, *_r) in ROOMS.items():
        xa, xb = COLS[col] + WT, COLS[col + 1] - WT
        z0, z1 = FLOORS[fl]
        amb, lamps = LIGHTS[name]
        quad = opening(cam, xa, xb, z0, z1)
        c.save()
        c.clipPath(poly(quad), doAntiAlias=True)
        c.drawPath(poly(quad), fill(lhex(amb)))
        for (x, y, z, rad, colr) in lamps:
            p0, p1 = proj(cam, (x, y, z)), proj(cam, (x + rad, y, z))
            if not p0 or not p1:
                continue
            r = abs(p1[0] - p0[0])
            add = tuple(max(0.0, colr[i] - amb[i]) for i in range(3))
            c.drawCircle(p0[0], p0[1], r, radial(p0, r, [(0, lhex(add), 1.0), (0.55, lhex(tuple(v * 0.45 for v in add)), 1.0), (1, "#000000", 1.0)], blend=PLUS))
        c.restore()
    attic = [proj(cam, (WT, 0, ATTIC_Z)), proj(cam, (900 - WT, 0, ATTIC_Z)), proj(cam, (900 - WT - SLOPE_IN, 0, ROOF_TOP)), proj(cam, (WT + SLOPE_IN, 0, ROOF_TOP))]
    c.save()
    c.clipPath(poly(attic), doAntiAlias=True)
    c.drawPath(poly(attic), fill(lhex((0.16, 0.17, 0.24))))
    for (x, y, z, rad, colr) in ((600, 220, ATTIC_Z + 120, 230, (1.2, 0.95, 0.65)), (464, 320, 1050, 200, (0.45, 0.55, 0.85))):
        p0, p1 = proj(cam, (x, y, z)), proj(cam, (x + rad, y, z))
        r = abs(p1[0] - p0[0])
        add = tuple(max(0.0, colr[i] - 0.17) for i in range(3))
        c.drawCircle(p0[0], p0[1], r, radial(p0, r, [(0, lhex(add), 1.0), (0.6, lhex(tuple(v * 0.4 for v in add)), 1.0), (1, "#000000", 1.0)], blend=PLUS))
    c.restore()


def plate():
    global MODE
    MODE = "albedo"
    albedo = film.render_frame(scene, 0.0)
    light = film.render_frame(light_scene, 0.0) * 2.0
    MODE = "emit"
    emit = film.render_frame(scene, 0.0)
    MODE = "albedo"
    img = albedo * light + emit * 1.1
    look = Look(bloom=0.5, bloom_threshold=0.7, halation=0.12, shadow_tint=(0.0, 0.006, 0.024), highlight_tint=(1.04, 1.0, 0.93),
                contrast=1.08, saturation=1.05, fringe=0.4, vignette=0.3, grain=0.018, flicker=0.0)
    img = finish(np.clip(img, 0, 2), 0, look, exposure=1.12)
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)


# ---------------------------------------------------------------------------
# Where the moving things go, in 1080 x 1920 plate pixels

def positions():
    cam = camera()

    def feet(x, y, z, height=150.0):
        p0, p1 = proj(cam, (x, y, z)), proj(cam, (x, y, z + height))
        return {"x": round(p0[0], 1), "y": round(p0[1], 1), "h": round(abs(p0[1] - p1[1]), 1)}

    def box(x0, x1, y, z0, z1):
        a, b = proj(cam, (x0, y, z1)), proj(cam, (x1, y, z0))
        return {"x": round(a[0], 1), "y": round(a[1], 1), "w": round(b[0] - a[0], 1), "h": round(b[1] - a[1], 1)}

    rooms = {}
    for name, (col, fl, *_r) in ROOMS.items():
        xa, xb = COLS[col] + WT, COLS[col + 1] - WT
        z0, z1 = FLOORS[fl]
        rooms[name] = box(xa, xb, 0.0, z0, z1)
    rooms["attic"] = box(WT, 900 - WT, 0.0, ATTIC_Z, ROOF_TOP)
    return {
        "plate": [W, H],
        "rooms": rooms,
        "people": {
            "squires": feet(770, 225, 600), "ali": feet(680, 190, 600, 140),
            "rena": feet(250, 215, 600), "priya": feet(95, 220, 300),
            "jo": feet(612, 205, 300, 140), "ozzy": feet(130, 215, 0), "sam": feet(230, 160, 0, 140),
            "mei": feet(520, 200, ATTIC_Z, 140),
        },
        "lift": {f: box(415, 485, 165, z, z + 200) for f, z in (("G", 0.0), ("1", 300.0), ("2", 600.0), ("A", ATTIC_Z))},
        "glow": {
            "bulb": feet(600, 220, ATTIC_Z + 34, 1), "tv": feet(700, 170, 56, 50), "box": feet(600, 250, ATTIC_Z + 30, 1),
            "lamp": feet(858, 300, 600 + 106, 1), "steam": feet(818, 300, 128, 1), "projector": feet(158, 260, 600 + 86, 1),
        },
    }


if __name__ == "__main__":
    img = plate()
    name = "halden-draft.png" if DRAFT else "halden-plate.png"
    Image.fromarray(img).save(os.path.join(OUT, name))
    print(os.path.join(OUT, name))
    if not DRAFT:
        with open(os.path.join(OUT, "positions.json"), "w") as f:
            json.dump(positions(), f, indent=1)
        print(json.dumps(positions())[:600])
