"""Halden Hall at night, flat 2D: a side-on cutaway (no perspective) painted with the cinema tools.

    python halden2d.py draft     # quick check
    python halden2d.py           # 1080 x 1920 plate and overlay positions

Same three passes as halden.py (albedo x light + emission, then the film finish), but every room is a flat box seen
straight on: back wall, a strip of floor, furniture standing on the line. Moving things are left to the artboard.
"""
from __future__ import annotations

import json
import math
import os
import sys

import halden as Hd  # sets OMC_SCALE from argv and registers the textures
from halden import (ATTIC_Z, COLS, D, FLOORS, PLUS, ROOF_TOP, SLOPE_IN, WT, R, fill, film, finish, glow, lhex, linear,  # noqa: F401
                    Look, np, poly, radial, rrect, skia)

DRAFT = Hd.DRAFT
OUT = Hd.OUT
W, H = 1080, 1920
S = 1.06                       # px per cm
X0 = (W - 900 * S) / 2         # screen x of the house's x = 0
Y0 = 1660.0                    # screen y of the ground (z = 0)
SHAFT = (410.0, 490.0)


def sx(x):
    return X0 + x * S


def sy(z):
    return Y0 - z * S


def A():
    return Hd.MODE == "albedo"


class P2:
    """A flat wall: draw in cm with +v up, like the cinema's planes, but straight on."""

    def __init__(self, c, x0, z0):
        self.c, self.x0, self.z0 = c, x0, z0

    def __enter__(self):
        self.c.save()
        self.c.translate(sx(self.x0), sy(self.z0))
        self.c.scale(S, -S)
        return self

    def __exit__(self, *exc):
        self.c.restore()

    def visible(self, pts):
        return pts

    def poly(self, pts, paint):
        self.c.drawPath(poly(pts), paint)

    def rect(self, x0, y0, x1, y1, paint):
        self.c.drawRect(R(min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1)), paint)


def put(c, x, z, fn, shadow=None):
    """Furniture standing on the floor line at x (cm), drawn in cm with up = -y."""
    if fn is None:
        return
    if shadow and A():
        sh = fill("#0A0604", 0.45)
        sh.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, shadow * S * 0.18))
        c.drawOval(R(sx(x - shadow), sy(z + 9), sx(x + shadow), sy(z + 3)), sh)
    c.save()
    c.translate(sx(x), sy(z + 6))
    c.scale(S, S)
    fn(c)
    c.restore()


# ---------------------------------------------------------------------------
# Rooms

ROOMS = Hd.ROOMS
FLOOR_BAND = 18.0              # how much floor shows under the back wall

LIGHTS = {
    "lobby": ((0.40, 0.36, 0.38), [(190, 150, 260, (1.45, 1.20, 0.90)), (46, 120, 150, (0.70, 0.85, 1.15))]),
    "liftG": ((0.40, 0.36, 0.34), [(358, 205, 180, (1.20, 1.02, 0.80)), (542, 205, 180, (1.20, 1.02, 0.80)), (555, 110, 120, (1.10, 1.02, 0.90))]),
    "common": ((0.30, 0.31, 0.42), [(822, 480 - 300, 220, (0.70, 0.92, 1.40)), (720, 140, 200, (1.30, 1.05, 0.75))]),
    "lab": ((0.34, 0.38, 0.40), [(150, 530, 250, (0.80, 0.84, 0.88)), (232, 460, 150, (0.66, 1.0, 0.86))]),
    "lift1": ((0.36, 0.33, 0.32), [(358, 505, 180, (1.15, 1.00, 0.78)), (542, 505, 180, (1.15, 1.00, 0.78))]),
    "servers": ((0.22, 0.28, 0.34), [(720, 420, 250, (0.70, 1.25, 1.35)), (830, 400, 180, (0.55, 1.10, 1.25))]),
    "seminar": ((0.22, 0.24, 0.34), [(200, 760, 230, (0.95, 1.02, 1.22)), (60, 700, 140, (0.55, 0.62, 0.85))]),
    "lift2": ((0.34, 0.31, 0.30), [(358, 805, 180, (1.15, 1.00, 0.78)), (542, 805, 180, (1.15, 1.00, 0.78))]),
    "office": ((0.30, 0.27, 0.26), [(860, 700, 260, (1.65, 1.30, 0.85)), (700, 820, 260, (0.90, 0.80, 0.68))]),
}

# (x cm, draw, shadow half-width cm), back to front
FURN = {
    "office": [(664, Hd.bookcase, 52), (764, Hd.radiator, 30), (808, Hd.office_desk, 80), (742, Hd.leather_chair, 44)],
    "seminar": [(62, Hd.radiator, 30), (160, Hd.long_table, 120)],
    "lab": [(140, Hd.lab_bench, 90), (262, lambda k: Hd.chair(k, "#5E6A70"), 18)],
    "servers": [(650, lambda k: Hd.server_rack(k, 1), 32), (720, lambda k: Hd.server_rack(k, 2), 32), (790, lambda k: Hd.server_rack(k, 3), 32),
                (830, Hd.terminal_desk, 60)],
    "lobby": [(200, Hd.porter_desk, 90), (92, Hd.umbrella_stand, 14)],
    "common": [(640, Hd.fridge, 30), (760, Hd.counter, 68), (770, lambda k: Hd.sofa(k, "#7A3B46"), 96)],
    "liftG": [(555, Hd.vending, 36)],
    "lift1": [(352, lambda k: Hd.chair(k, "#6E4428"), 18)],
    "lift2": [(548, Hd.radiator, 30)],
}


def shaft_back(p, xa, h):
    """The lift shaft seen straight on: dark, with its cables (cage bars come after the cut edges)."""
    if A():
        p.rect(SHAFT[0] - xa, 0, SHAFT[1] - xa, h, fill("#100C0B"))
        for k in range(3):
            x = SHAFT[0] - xa + 22 + k * 18
            p.c.drawLine(x, 0, x, h, D.line(1.0, "#3A322C"))


def deco(p, name, w, h, xa):
    if name == "office":
        if A():
            p.rect(0, 0, w, 95, D.tex("darkboards", 90.0))
            p.rect(0, 95, w, 99, fill("#B8954F"))
            D.frame_pic(p, 30, 150, 40, 50, "#3B2A4A")
        Hd.night_window(p, w * 0.55, 76, 118, 104, "#5B2440")
        Hd.sconce(p, w * 0.9, 196)
    elif name == "seminar":
        if A():
            p.rect(w * 0.4, 96, w * 0.94, 226, fill("#9FAED0"))
            p.rect(w * 0.4, 226, w * 0.94, 232, fill("#3A3E44"))
            p.rect(w * 0.45, 112, w * 0.6, 200, fill("#C9D6F2"))
            p.c.drawCircle(w * 0.525, 164, 18, fill("#7E8EBE"))
            for k in range(4):
                p.rect(w * 0.64, 122 + k * 20, w * 0.64 + 30 + k * 12, 134 + k * 20, fill("#E8B04A"))
        else:
            p.c.drawCircle(w * 0.67, 161, 120, radial((w * 0.67, 161), 120, [(0, "#B8CCFF", 0.2), (1, "#B8CCFF", 0.0)], blend=PLUS))
        Hd.night_window(p, w * 0.17, 60, 118, 100, "#2E3A5C")
    elif name == "lab":
        if A():
            Hd.periodic_table(p, 24, 226, 112, 40)
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
            p.rect(w * 0.6, 86, w * 0.96, 236, fill("#9AA8AE"))
            p.rect(w * 0.62, 98, w * 0.94, 214, fill("#3E8A76"))
            p.rect(w * 0.62, 200, w * 0.94, 205, fill("#BFFFE6"))
            for k in range(3):
                p.rect(w * 0.66 + k * 26, 104, w * 0.66 + k * 26 + 10, 124 + k * 6, fill("#9FE8D0"))
            p.rect(w * 0.62, 86, w * 0.94, 92, fill("#5E6A70"))
        else:
            p.c.drawCircle(w * 0.78, 156, 110, radial((w * 0.78, 156), 110, [(0, "#7CFFC8", 0.2), (1, "#7CFFC8", 0.0)], blend=PLUS))
    elif name == "servers":
        if A():
            p.rect(0, 236, w, 250, fill("#3A3E44"))
            for k in range(9):
                p.c.drawLine(10 + k * 30, 236, 18 + k * 30, 160, D.line(1.6, ["#EF5B5B", "#3F6FA0", "#F2B33D"][k % 3], 0.9))
            p.rect(w * 0.06, 150, w * 0.06 + 34, 180, fill("#F2B33D"))
            p.c.drawPath(poly([(w * 0.06 + 17, 175), (w * 0.06 + 6, 156), (w * 0.06 + 28, 156)]), fill("#1B1F3B"))
    elif name == "lobby":
        if A():
            p.rect(0, 0, w, 100, fill("#4A2420"))
            p.rect(0, 100, w, 104, fill("#C9A45C"))
            p.rect(14, 18, 80, 220, fill("#4A2C1A"))
            p.rect(20, 24, 46, 212, fill("#3A2416"))
            p.rect(48, 24, 74, 212, fill("#3A2416"))
            for x0 in (24, 52):
                p.rect(x0, 110, x0 + 18, 200, linear((0, 110), (0, 200), [(0, "#1B2550", 1.0), (1, "#0B1024", 1.0)]))
            p.rect(10, 220, 84, 226, fill("#C9A45C"))
            p.rect(w * 0.42, 128, w * 0.8, 206, fill("#B9864F"))
            p.rect(w * 0.42, 128, w * 0.8, 206, D.line(2.5, "#5A361F"))
            rng = np.random.default_rng(21)
            for k in range(6):
                x = w * 0.44 + float(rng.uniform(0, w * 0.3))
                z = 136 + float(rng.uniform(0, 52))
                p.rect(x, z, x + 18, z + 14, fill(["#F4EEDD", "#F6D36B", "#A7C2D5"][k % 3]))
                p.c.drawCircle(x + 9, z + 13, 1.6, fill("#EF5B5B"))
            p.c.drawLine(w * 0.47, 150, w * 0.72, 186, D.line(1.2, "#D6312F"))
            cx, cz = w * 0.9, 226
            p.c.drawCircle(cx, cz, 16, fill("#F4EEDD"))
            p.c.drawCircle(cx, cz, 16, D.line(2.0, "#3A2416"))
            p.c.drawLine(cx, cz, cx - 1.2, cz + 10, D.line(1.8, "#1B1F3B"))
            p.c.drawLine(cx, cz, cx - 4, cz + 12, D.line(1.2, "#1B1F3B"))
        else:
            for x0 in (24, 52):
                p.rect(x0, 110, x0 + 18, 200, fill("#9FB8FF", 0.18))
        Hd.sconce(p, w * 0.36, 210)
    elif name == "common":
        if A():
            p.rect(0, 0, w, 90, D.tex("darkboards", 90.0))
            p.rect(0, 90, w, 94, fill("#7A4B2E"))
            Hd.dartboard(p, w * 0.12, 238)
            D.shape(p.c, rrect(w * 0.62, 148, w * 0.94, 206, 2), "#15191D")
            p.rect(w * 0.64, 152, w * 0.92, 202, fill("#8DB6EE"))
            p.rect(w * 0.64, 152, w * 0.92, 166, fill("#2F68C0"))
            p.rect(w * 0.66, 172, w * 0.76, 196, fill("#DDEBFF"))
            p.rect(w * 0.79, 186, w * 0.9, 192, fill("#F2B33D"))
        else:
            p.c.drawCircle(w * 0.78, 177, 110, radial((w * 0.78, 177), 110, [(0, "#7FB2FF", 0.35), (1, "#7FB2FF", 0.0)], blend=PLUS))
        Hd.night_window(p, w * 0.36, 60, 122, 96, "#2F5B4F")
    elif name.startswith("lift"):
        if A():
            p.rect(0, 0, w, 96, fill("#5A361F"))
            p.rect(0, 96, w, 100, fill("#C9A45C"))
            D.frame_pic(p, w - 70, 120, 36, 46, ["#A7C2D5", "#E9C3BB", "#9CB398"]["G12".index(name[-1])])
            D.frame_pic(p, 34, 120, 36, 46, ["#BCA9CB", "#C9A45C", "#D8A39D"]["G12".index(name[-1])])
        shaft_back(p, xa, h)
        Hd.sconce(p, 50, 205)
        Hd.sconce(p, w - 50, 205)


def draw_room(c, name):
    col, fl, wall, floor_tex, tile = ROOMS[name]
    xa, xb = COLS[col] + WT, COLS[col + 1] - WT
    z0, z1 = FLOORS[fl]
    w, h = xb - xa, z1 - z0
    if not A():   # a room's own light never spills over its walls
        c.save()
        c.clipRect(R(sx(xa), sy(z1), sx(xb), sy(z0)))
    with P2(c, xa, z0) as p:
        if A():
            p.rect(0, 0, w, h, D.tex(wall, 70.0))
        deco(p, name, w, h, xa)
        if A():
            p.rect(0, 0, w, FLOOR_BAND, D.tex(floor_tex, tile * 0.6, dx=xa * 0.37))
            p.rect(0, 0, w, FLOOR_BAND, linear((0, 0), (0, FLOOR_BAND), [(0, "#000000", 0.0), (1, "#000000", 0.25)]))
            p.rect(0, FLOOR_BAND, w, FLOOR_BAND + 12, fill(D.TRIM))
            p.rect(0, FLOOR_BAND + 10, w, FLOOR_BAND + 12, fill(D.shade(D.TRIM, 0.7)))
            if name in ("office", "lobby", "common"):
                p.rect(w * 0.18, 3, w * 0.86, 11, D.tex("rug", 60.0))
            p.rect(0, h - 12, w, h, fill(D.shade(D.CEILC, 0.6)))
            p.rect(0, h - 40, w, h - 12, linear((0, h - 40), (0, h - 12), [(0, "#0A0604", 0.0), (1, "#0A0604", 0.35)]))
            p.rect(0, 0, 26, h, linear((0, 0), (26, 0), [(0, "#0A0604", 0.35), (1, "#0A0604", 0.0)]))
            p.rect(w - 26, 0, w, h, linear((w - 26, 0), (w, 0), [(0, "#0A0604", 0.0), (1, "#0A0604", 0.35)]))
    for x, fn, shadow in FURN[name]:
        put(c, x, z0, fn, shadow)
    if name == "office":
        put(c, 866, z0 + 84, Hd.bankers_lamp)
    if not A():
        c.restore()


def draw_attic(c):
    x0, x1, z0, top = WT, 900.0 - WT, ATTIC_Z, ROOF_TOP
    inner = [(x0, z0), (x1, z0), (x1 - SLOPE_IN, top), (x0 + SLOPE_IN, top)]
    with P2(c, 0, 0) as p:
        if A():
            p.poly(inner, D.tex("attic", 120.0))
            for k in range(1, 4):   # rafters
                zz = z0 + (top - z0) * k / 4
                xl = x0 + SLOPE_IN * k / 4
                p.rect(xl, zz - 3, 900 - xl, zz + 3, fill("#6A4A30"))
            p.poly(inner, fill("#0A0604", 0.18))
            p.rect(x0, z0, x1, z0 + FLOOR_BAND, D.tex("attic", 80.0))
            p.rect(x0, z0 + FLOOR_BAND, x1, z0 + FLOOR_BAND + 6, fill("#4A3220"))
            cx, cz = 660.0, 1062.0
            p.c.drawCircle(cx, cz, 44, fill("#D9CDB8"))
            p.c.drawCircle(cx, cz, 37, linear((0, cz + 37), (0, cz - 37), [(0, "#26305E", 1.0), (1, "#0B1024", 1.0)]))
            p.c.drawCircle(cx + 13, cz + 12, 10, fill("#F4EEDD"))
            p.c.drawLine(cx - 37, cz, cx + 37, cz, D.line(3.0, "#D9CDB8"))
            p.c.drawLine(cx, cz - 37, cx, cz + 37, D.line(3.0, "#D9CDB8"))
            for k in range(7):   # footprints in the dust, from the lift to the box
                fx = 500 + k * 16
                p.c.drawOval(R(fx - 5, z0 + 8 + (k % 2) * 4, fx + 5, z0 + 12 + (k % 2) * 4), fill("#3A2A1C", 0.7))
        else:
            p.c.drawCircle(673, 1074, 34, radial((673, 1074), 34, [(0, "#E8F0FF", 0.85), (1, "#E8F0FF", 0.0)], blend=PLUS))
        Hd.cobwebs(p, [(x0 + SLOPE_IN + 6, top - 4, 1), (x1 - SLOPE_IN - 6, top - 4, -1)])
    if not A():
        c.save()
        c.clipPath(poly([(sx(x), sy(z)) for x, z in inner]), skia.ClipOp.kIntersect, True)
    for x, fn, shadow in ((152, lambda k: Hd.archive_shelf(k, 4), 56), (272, lambda k: Hd.archive_shelf(k, 5), 56),
                          (356, Hd.sheet_chair, 32), (604, Hd.open_box, 28), (712, Hd.leaning_portrait, 24),
                          (770, D.trunk if A() else None, 44), (812, D.boxes if A() else None, 40)):
        put(c, x, z0, fn, shadow)
    put(c, 540, z0 + 140, Hd.hanging_bulb)
    if not A():
        c.restore()


def draw_edges(c):
    """The doll's house's cut: cream edges round every room, the plinth, the roof in section, the chimney."""
    if not A():
        return
    with P2(c, 0, 0) as p:
        edge, dark = D.EDGE, D.shade(D.EDGE, 0.78)
        p.rect(-18, -40, 918, 0, fill("#9C9284"))
        p.rect(-18, -6, 918, 0, fill("#B8AE9E"))
        for z in (280.0, 580.0, 880.0):
            p.rect(-14, z, 914, z + 20, fill(edge))
            p.rect(-14, z, 914, z + 2.5, fill(dark))
            p.rect(-14, z + 17.5, 914, z + 20, fill(D.shade(edge, 0.9)))
        for x in (COLS[1], COLS[2]):
            for z0, z1 in FLOORS:
                p.rect(x - WT, z0, x + WT, z1, fill(edge))
                p.rect(x + WT - 2, z0, x + WT, z1, fill(dark))
        p.rect(-14, -6, WT, ATTIC_Z, fill(edge))
        p.rect(900 - WT, -6, 914, ATTIC_Z, fill(edge))
        outer = [(-26, ATTIC_Z - 4), (WT, ATTIC_Z - 4), (WT + SLOPE_IN, ROOF_TOP), (900 - WT - SLOPE_IN, ROOF_TOP), (900 - WT, ATTIC_Z - 4), (926, ATTIC_Z - 4),
                 (900 - WT - SLOPE_IN + 26, ROOF_TOP + 34), (WT + SLOPE_IN - 26, ROOF_TOP + 34)]
        p.rect(690, ROOF_TOP + 10, 752, ROOF_TOP + 132, D.tex("brick", 80.0))
        p.rect(684, ROOF_TOP + 128, 758, ROOF_TOP + 138, fill("#8C7A66"))
        p.poly(outer, D.tex("roof", 60.0))
        p.poly([(WT, ATTIC_Z - 4), (WT + SLOPE_IN, ROOF_TOP), (WT + SLOPE_IN - 9, ROOF_TOP + 9), (WT - 11, ATTIC_Z - 4)], fill(edge))
        p.poly([(900 - WT, ATTIC_Z - 4), (900 - WT - SLOPE_IN, ROOF_TOP), (900 - WT - SLOPE_IN + 9, ROOF_TOP + 9), (900 - WT + 11, ATTIC_Z - 4)], fill(edge))
        p.rect(WT + SLOPE_IN - 9, ROOF_TOP, 900 - WT - SLOPE_IN + 9, ROOF_TOP + 9, fill(edge))
        p.rect(-26, ATTIC_Z - 12, 926, ATTIC_Z - 2, fill("#8C7A66"))


def draw_shaft(c):
    """The open lift cage runs up the middle of the house, through every floor, to the attic."""
    with P2(c, 0, 0) as p:
        if A():
            for z0, z1 in ((280.0, 300.0), (580.0, 600.0), (880.0, 1100.0)):
                p.rect(SHAFT[0], z0, SHAFT[1], z1, fill("#100C0B"))
            for k in range(9):
                x = SHAFT[0] + k * 10
                p.rect(x - 0.9, 0, x + 0.9, 1100, fill("#2E2620"))
            for zz in range(0, 1101, 50):
                p.rect(SHAFT[0], zz - 1.4, SHAFT[1], zz + 1.4, fill("#3A3028"))
            p.rect(SHAFT[0] - 4, 0, SHAFT[0], 1100, fill("#4A3E34"))
            p.rect(SHAFT[1], 0, SHAFT[1] + 4, 1100, fill("#4A3E34"))
            p.rect(SHAFT[0] - 10, 1100, SHAFT[1] + 10, 1112, fill("#4A3E34"))
            p.c.drawCircle(450, 1106, 8, fill("#2E2620"))
        for z0, at in ((0.0, "G"), (300.0, "1"), (600.0, "2"), (ATTIC_Z, "A")):   # a brass dial over each landing
            Hd.floor_dial(p, 450, z0 + 236, at)


def draw_world(c):
    if A():
        c.drawRect(skia.Rect.MakeWH(W, H), linear((0, 0), (0, H), [(0, "#05070F", 1.0), (0.3, "#0E1430", 1.0), (0.6, "#1C2048", 1.0), (1, "#120E1E", 1.0)]))
        rng = np.random.default_rng(7)
        for _ in range(80):
            x, y = float(rng.uniform(0, W)), float(rng.uniform(0, 420))
            c.drawCircle(x, y, float(rng.uniform(0.6, 1.7)), fill("#DDE6FF", float(rng.uniform(0.2, 0.7))))
        for x, y, r, a in ((160, 240, 160, 0.55), (430, 150, 190, 0.5), (930, 330, 200, 0.5), (720, 110, 150, 0.45)):
            cl = fill("#2A3260", a)
            cl.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, r * 0.35))
            c.drawOval(R(x - r * 1.6, y - r * 0.45, x + r * 1.6, y + r * 0.45), cl)
        c.drawCircle(902, 168, 46, fill("#F2EBD8"))
        c.drawCircle(888, 158, 9, fill("#DCD3BC"))
        c.drawCircle(918, 184, 6, fill("#DCD3BC"))
        rng = np.random.default_rng(17)
        x = -20.0
        while x < W + 20:
            bw, bh = float(rng.uniform(50, 120)), float(rng.uniform(260, 620))
            c.drawRect(R(x, Y0 - bh, x + bw, Y0), fill("#0C0F22"))
            x += bw + float(rng.uniform(-10, 8))
        c.drawRect(R(0, Y0, W, H), fill("#1E2029"))
        c.drawRect(R(0, Y0, W, Y0 + 70), fill("#3E404A"))
        c.drawRect(R(0, Y0 + 70, W, Y0 + 78), fill("#5E606A"))
        for k in range(8):
            c.drawRect(R(30 + k * 150, Y0 + 170, 120 + k * 150, Y0 + 178), fill("#C9C2A0", 0.5))
        for k, (px, pw) in enumerate(((180, 120), (560, 160), (900, 110))):
            c.drawOval(R(px - pw, Y0 + 110 + k * 22, px + pw, Y0 + 140 + k * 22), fill("#141A36", 0.9))
    else:
        c.save()
        c.clipRect(R(sx(-30), sy(ROOF_TOP + 140), sx(930), sy(-40)), skia.ClipOp.kDifference, True)
        glow(c, 902, 168, 240, "#B8C8FF", 0.32)
        rng = np.random.default_rng(17)
        x = -20.0
        while x < W + 20:
            bw, bh = float(rng.uniform(50, 120)), float(rng.uniform(260, 620))
            for _ in range(int(bh // 40)):
                if rng.random() < 0.45:
                    wx, wy = x + float(rng.uniform(6, bw - 10)), Y0 - float(rng.uniform(20, bh - 10))
                    c.drawRect(R(wx, wy, wx + 5, wy + 6), fill("#FFCF6B", float(rng.uniform(0.35, 0.8))))
            x += bw + float(rng.uniform(-10, 8))
        c.restore()
        for k, (px, pw) in enumerate(((180, 120), (560, 160), (900, 110))):   # the lit rooms in the puddles
            c.drawOval(R(px - pw * 0.8, Y0 + 114 + k * 22, px + pw * 0.8, Y0 + 136 + k * 22), fill("#FFCF6B", 0.12))
    for x, fn, h in ((-40.0, Hd.street_lamp, 1.0), (930.0, Hd.bare_tree, 1.0)):
        c.save()
        c.translate(sx(x), Y0 + 40)
        c.scale(S, S)
        fn(c)
        c.restore()
    c.save()
    c.translate(sx(40), Y0 + 52)
    c.scale(S, S)
    Hd.bicycle(c)
    c.restore()


def scene(c, t):
    draw_world(c)
    for name in ROOMS:
        draw_room(c, name)
    draw_attic(c)
    draw_edges(c)
    draw_shaft(c)


def light_scene(c, t):
    c.drawRect(skia.Rect.MakeWH(W, H), fill(lhex((1.0, 1.0, 1.0))))
    house = [(sx(-30), sy(-40)), (sx(930), sy(-40)), (sx(930), sy(ATTIC_Z)), (sx(900 - WT - SLOPE_IN + 26), sy(ROOF_TOP + 40)),
             (sx(WT + SLOPE_IN - 26), sy(ROOF_TOP + 40)), (sx(-30), sy(ATTIC_Z))]
    c.drawPath(poly(house), fill(lhex((0.66, 0.63, 0.68))))
    for name, (col, fl, *_r) in ROOMS.items():
        xa, xb = COLS[col] + WT, COLS[col + 1] - WT
        z0, z1 = FLOORS[fl]
        amb, lamps = LIGHTS[name]
        rect = R(sx(xa), sy(z1), sx(xb), sy(z0))
        c.save()
        c.clipRect(rect)
        c.drawRect(rect, fill(lhex(amb)))
        for (x, z, rad, colr) in lamps:
            cx, cy, r = sx(x), sy(z), rad * S
            add = tuple(max(0.0, colr[i] - amb[i]) for i in range(3))
            c.drawCircle(cx, cy, r, radial((cx, cy), r, [(0, lhex(add), 1.0), (0.55, lhex(tuple(v * 0.45 for v in add)), 1.0), (1, "#000000", 1.0)], blend=PLUS))
        c.restore()
    inner = [(sx(WT), sy(ATTIC_Z)), (sx(900 - WT), sy(ATTIC_Z)), (sx(900 - WT - SLOPE_IN), sy(ROOF_TOP)), (sx(WT + SLOPE_IN), sy(ROOF_TOP))]
    c.save()
    c.clipPath(poly(inner), skia.ClipOp.kIntersect, True)
    c.drawPath(poly(inner), fill(lhex((0.18, 0.18, 0.25))))
    for (x, z, rad, colr) in ((540, ATTIC_Z + 30, 260, (1.25, 1.0, 0.7)), (660, 1060, 190, (0.5, 0.6, 0.9))):
        cx, cy, r = sx(x), sy(z), rad * S
        add = tuple(max(0.0, colr[i] - 0.18) for i in range(3))
        c.drawCircle(cx, cy, r, radial((cx, cy), r, [(0, lhex(add), 1.0), (0.6, lhex(tuple(v * 0.4 for v in add)), 1.0), (1, "#000000", 1.0)], blend=PLUS))
    c.restore()


def plate():
    Hd.MODE = "albedo"
    albedo = film.render_frame(scene, 0.0)
    light = film.render_frame(light_scene, 0.0) * 2.0
    Hd.MODE = "emit"
    emit = film.render_frame(scene, 0.0)
    Hd.MODE = "albedo"
    img = albedo * light + emit * 1.1
    look = Look(bloom=0.45, bloom_threshold=0.72, halation=0.1, shadow_tint=(0.0, 0.006, 0.024), highlight_tint=(1.04, 1.0, 0.93),
                contrast=1.08, saturation=1.06, fringe=0.3, vignette=0.28, grain=0.016, flicker=0.0)
    img = finish(np.clip(img, 0, 2), 0, look, exposure=1.12)
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)


def positions():
    def feet(x, z, height=150.0):
        return {"x": round(sx(x), 1), "y": round(sy(z + 6), 1), "h": round(height * S, 1)}

    def box(x0, x1, z0, z1):
        return {"x": round(sx(x0), 1), "y": round(sy(z1), 1), "w": round((x1 - x0) * S, 1), "h": round((z1 - z0) * S, 1)}

    rooms = {}
    for name, (col, fl, *_r) in ROOMS.items():
        rooms[name] = box(COLS[col] + WT, COLS[col + 1] - WT, *FLOORS[fl])
    rooms["attic"] = box(WT, 900 - WT, ATTIC_Z, ROOF_TOP)
    return {
        "plate": [W, H], "scale": S,
        "rooms": rooms,
        "people": {
            "squires": feet(772, 600), "ali": feet(690, 600, 140), "rena": feet(250, 600), "priya": feet(78, 300),
            "jo": feet(752, 300, 140), "ozzy": feet(116, 0), "sam": feet(44, 0, 140), "mei": feet(520, ATTIC_Z, 140),
        },
        "lift": {f: box(415, 485, z + 6, z + 206) for f, z in (("G", 0.0), ("1", 300.0), ("2", 600.0), ("A", ATTIC_Z))},
        "shaft": box(SHAFT[0], SHAFT[1], 0.0, 1100.0),
        "glow": {"bulb": feet(540, ATTIC_Z + 140 - 5, 1), "box": feet(604, ATTIC_Z + 30, 1), "tv": feet(822, 300 - 300 + 177, 1),
                 "lamp": feet(866, 600 + 84 + 18, 1), "steam": feet(728, 128, 1), "led": box(625, 815, 300 + 12, 300 + 214)},
    }


if __name__ == "__main__":
    img = plate()
    name = "halden2d-draft.png" if DRAFT else "halden2d-plate.png"
    path = os.path.join(OUT, name)
    from PIL import Image
    Image.fromarray(img).save(path)
    print(path)
    if not DRAFT:
        with open(os.path.join(OUT, "positions2d.json"), "w") as f:
            json.dump(positions(), f, indent=1)
