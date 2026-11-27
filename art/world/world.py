"""Case 001's world: the Halden Innovation Building at 12:40 AM, a flat 2D cutaway painted at close-up size.

    python art/world/world.py draft    # quick check at 0.8 px/cm
    python art/world/world.py          # 2 px/cm plate and world.json (positions in world cm)

Lab 4 and the lobby reuse the evidence-photo painters (cinema/case001_photos.py), so the world shows the same
Cabinet B, clock, whiteboard, reception desk and drinks machine the players see in the photos. The rest is painted
here. Three passes, as on the Halden board: albedo x light + emission, then the film finish. People, ghosts and
anything that moves are left to the artboards.

World: x runs west to east in cm, z is height in cm, the ground is z = 0. Ground floor 0-280, first floor 300-580.
Lab 4 sits above the maker space; the corridor sits above the lobby and the stairs; the car park and the North Gate
are east of the glass entrance.

Moved here from art/mockups/case001/world.py on 2026-11-20 (W0.7). The parts of the videos repo's omc_cinema it
uses are copied into cinema/, so it no longer needs that repo (README.md has the list).
"""
from __future__ import annotations

import json
import os
import sys
from contextlib import contextmanager

HERE = os.path.dirname(os.path.abspath(__file__))
DRAFT = len(sys.argv) > 1 and sys.argv[1] == "draft"

import halden as Hd  # noqa: E402  registers textures; importing cinema puts art/ (omc_art) on the path
from halden import D, PLUS, Look, R, fill, finish, lhex, linear, np, poly, radial, rrect, skia  # noqa: E402
from cinema import case001_photos as PH  # noqa: E402
from cinema.film import font, stroke, text  # noqa: E402
from cinema.textures import surface, weave  # noqa: E402
from omc_art.palette import CREAM, INK  # noqa: E402

P = 0.8 if DRAFT else 2.0                       # plate px per cm
XMIN, XMAX, ZMIN, ZMAX = -60.0, 3100.0, -70.0, 780.0
W, H = round((XMAX - XMIN) * P), round((ZMAX - ZMIN) * P)
FB, CEIL = 18.0, 12.0                            # floor band and ceiling strip, cm
MINUTE = 220                                     # Lab 4's clock counts from 9:00: 12:40 AM
LAB_K = 250.0 / 942.0                            # cm per photo unit in Lab 4
LOB_K = 0.4                                      # cm per photo unit in the lobby
LOB_X = 560.0                                    # world x of the lobby photo's x = 0

# The building, bigger (2026-11-27): two floors of four rooms. First floor: the professor's office, Lab 4, the
# corridor, the staff kitchen. Ground: the maker space, the security office, the lobby, then a covered entrance under
# the kitchen and the car park. Lab 4, the corridor, the lobby and the maker space are each 20% wider than before.
NEW = {   # x0, x1, z0, z1 in world cm (inside the cut edges)
    "office": (8.0, 516.0, 300.0, 580.0),
    "lab4": (532.0, 1040.0, 300.0, 580.0),
    "corridor": (1056.0, 1660.0, 300.0, 580.0),
    "kitchen": (1676.0, 2076.0, 300.0, 580.0),
    "maker": (8.0, 516.0, 0.0, 280.0),
    "security": (532.0, 1040.0, 0.0, 280.0),
    "lobby": (1056.0, 1660.0, 0.0, 280.0),
}
CANOPY = (1676.0, 2076.0, 0.0, 280.0)   # the covered entrance under the kitchen: outside, but dry
BX1 = 2098.0                             # the building's east face (the kitchen's outer wall)

# The four first rooms keep their old painting code, which works in the old building's cm ("legacy" x). Each is drawn
# shifted by SHIFT; their old boxes are widened here so walls, floors and shading reach the new walls. Lab 4 and the
# maker space grew to the west (an office door, a storage corner), the corridor and the lobby to the east (the kitchen
# door; the lobby's entrance wall moves LOBBY_EAST further, with the exit, the drinks machine and the camera).
SHIFT = {"lab4": 608.0, "corridor": 608.0, "lobby": 608.0, "maker": 84.0}
LOBBY_EAST = 100.0
ROOMS = {   # legacy boxes
    "lab4": (-76.0, 432.0, 300.0, 580.0),
    "maker": (-76.0, 432.0, 0.0, 280.0),
    "corridor": (448.0, 1052.0, 300.0, 580.0),
    "lobby": (448.0, 1052.0, 0.0, 280.0),
}
LAB_X0 = 8.0      # where Lab 4's photo wall starts, legacy x
MAKER_X0 = 8.0    # where the maker space's old wall starts, legacy x


def moved(room, x):
    """A legacy x in `room`, in today's world cm."""
    return x + SHIFT[room]


LIGHTS = {  # ambient (r, g, b), lamps (x, z, radius cm, (r, g, b)), in world cm
    "lab4": ((0.66, 0.70, 0.78), [(718, 565, 240, (1.10, 1.12, 1.16)), (928, 565, 240, (1.10, 1.12, 1.16)), (837, 425, 70, (0.80, 0.90, 1.30)),
                                  (590, 565, 160, (1.02, 1.04, 1.08))]),
    "maker": ((0.20, 0.22, 0.33), [(194, 175, 210, (0.46, 0.58, 0.92)), (214, 110, 90, (0.36, 0.52, 1.05)), (414, 50, 70, (0.70, 0.30, 0.30)),
                                   (50, 180, 140, (0.30, 0.36, 0.60))]),
    "corridor": ((0.34, 0.36, 0.47), [(1248, 565, 220, (1.12, 1.04, 0.90)), (1488, 565, 190, (1.05, 0.98, 0.86)), (1089, 540, 90, (0.50, 1.10, 0.72)),
                                      (1610, 565, 170, (1.08, 1.00, 0.88))]),
    "lobby": ((0.50, 0.48, 0.50), [(1248, 250, 210, (1.14, 1.06, 0.94)), (1418, 250, 210, (1.14, 1.06, 0.94)), (1618, 100, 120, (1.25, 1.08, 0.86)),
                                   (1244, 132, 90, (0.72, 0.88, 1.25)), (1108, 230, 150, (0.86, 0.86, 0.98)), (1576, 250, 170, (1.12, 1.04, 0.92))]),
    "office": ((0.30, 0.29, 0.36), [(430, 420, 190, (1.18, 1.00, 0.76)), (100, 470, 150, (0.50, 0.58, 0.95)), (390, 390, 60, (0.70, 0.80, 1.10))]),
    "kitchen": ((0.56, 0.58, 0.60), [(1780, 565, 200, (1.10, 1.12, 1.06)), (1970, 565, 200, (1.10, 1.12, 1.06)), (1920, 400, 70, (0.90, 1.00, 1.20))]),
    "security": ((0.27, 0.30, 0.40), [(790, 175, 210, (0.62, 0.80, 1.30)), (640, 255, 170, (1.02, 0.98, 0.88)), (960, 120, 110, (0.70, 0.62, 0.50))]),
}

D.MAKERS.update({
    "block": lambda: D._tiles("#4E5466", "#565C6F", "#3A3F4E", 6, 83),
    "lobbyfloor": lambda: D._tiles("#8E9299", "#999DA4", "#5A5D64", 6, 81),
    "vinyl": lambda: D._tiles("#5F6982", "#66708A", "#4A5268", 5, 85),
    "concrete": lambda: D._tiles("#9A968C", "#A39F95", "#7E7A70", 4, 87),
})


def A():
    return Hd.MODE == "albedo"


def sx(x):
    return (x - XMIN) * P


def sy(z):
    return (ZMAX - z) * P


def wglow(c, x, z, r, col, a=1.0):
    """A glow in world cm."""
    Hd.glow(c, sx(x), sy(z), r * P, col, a)


class P2:
    """A flat wall in world cm, +z up."""

    def __init__(self, c, x0=0.0, z0=0.0):
        self.c, self.x0, self.z0 = c, x0, z0

    def __enter__(self):
        self.c.save()
        self.c.translate(sx(self.x0), sy(self.z0))
        self.c.scale(P, -P)
        return self

    def __exit__(self, *exc):
        self.c.restore()

    def rect(self, x0, y0, x1, y1, paint):
        self.c.drawRect(R(min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1)), paint)

    def poly(self, pts, paint):
        self.c.drawPath(poly(pts), paint)


def wtext(c, s, x, z, size, col, align="center", tracking=0.0, face="display", a=1.0, blur=0.0):
    """Upright text in world cm with its baseline at z."""
    c.save()
    c.translate(sx(x), sy(z))
    c.scale(P, P)
    paint = fill(col, a)
    if blur:
        paint.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, blur))
    text(c, s, 0, 0, font(face, size), paint, align=align, tracking=tracking)
    c.restore()


def put(c, x, z, fn, shadow=None):
    """Something standing on the floor line at x, drawn in cm with up = -y."""
    if fn is None:
        return
    if shadow and A():
        sh = fill("#0A0604", 0.42)
        sh.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, shadow * P * 0.18))
        c.drawOval(R(sx(x - shadow), sy(z + 9), sx(x + shadow), sy(z + 3)), sh)
    c.save()
    c.translate(sx(x), sy(z + 6))
    c.scale(P, P)
    fn(c)
    c.restore()


@contextmanager
def photo(c, x0, z_top, k, y_top, clip=None):
    """Photo-space art (1600 x 1200 units) with photo point (0, y_top) at world (x0, z_top), k cm per unit."""
    c.save()
    if clip is not None:
        cx0, cz0, cx1, cz1 = clip
        c.clipRect(R(sx(cx0), sy(cz1), sx(cx1), sy(cz0)), skia.ClipOp.kIntersect, True)
    c.translate(sx(x0), sy(z_top))
    c.scale(k * P, k * P)
    c.translate(0, -y_top)
    try:
        yield
    finally:
        c.restore()


def room_shell(c, name, wall=None, floor_tex="labfloor", tile=40.0, trim="#2C3352", ceiling=True):
    """Floor band, skirting, edge shading and (optionally) a ceiling strip, over whatever wall is already drawn."""
    shell(c, ROOMS[name], wall, floor_tex, tile, trim, ceiling)


def shell(c, box, wall=None, floor_tex="labfloor", tile=40.0, trim="#2C3352", ceiling=True):
    """room_shell for any box in the current coordinates."""
    x0, x1, z0, z1 = box
    w, h = x1 - x0, z1 - z0
    with P2(c, x0, z0) as p:
        if wall:
            p.rect(0, 0, w, h, wall)
        p.rect(0, 0, w, FB, D.tex(floor_tex, tile, dx=x0 * 0.37))
        p.rect(0, 0, w, FB, linear((0, 0), (0, FB), [(0, "#000000", 0.0), (1, "#000000", 0.28)]))
        p.rect(0, FB, w, FB + 9, fill(trim))
        p.rect(0, FB + 7.5, w, FB + 9, fill(D.shade(trim, 0.7)))
        if ceiling:
            p.rect(0, h - CEIL, w, h, fill("#C9CDD6"))
            p.rect(0, h - CEIL, w, h - CEIL + 1.5, fill("#8D93A3"))
        p.rect(0, h - 44, w, h - CEIL, linear((0, h - 44), (0, h - CEIL), [(0, "#0A0604", 0.0), (1, "#0A0604", 0.3)]))
        p.rect(0, 0, 24, h, linear((0, 0), (24, 0), [(0, "#0A0604", 0.32), (1, "#0A0604", 0.0)]))
        p.rect(w - 24, 0, w, h, linear((w - 24, 0), (w, 0), [(0, "#0A0604", 0.0), (1, "#0A0604", 0.32)]))


# ---------------------------------------------------------------------------
# Furniture and small things (cm, base at the origin, up is -y). In "emit" mode a piece draws only what glows.

def lab_bench(c):
    """Lab 4's long bench straight on: a slate top on steel legs, and what has ended up underneath."""
    if not A():
        return
    top = poly([(-196, -99), (196, -99), (190, -106), (-190, -106)])
    c.drawPath(top, fill("#59617D"))
    c.drawPath(top, D.line(0.8, INK))
    D.shape(c, rrect(-197, -99, 197, -92, 1.5), "#3E4560", 0.8)
    for x in (-188, -6, 184):
        D.shape(c, rrect(x - 3, -92, x + 3, 0, 1), "#2C3148", 0.6)
    D.shape(c, rrect(-188, -30, 187, -27, 1), "#2C3148", 0.4)
    # under the bench: the bin, the e-waste crate, a power strip, cables and the visitor badge's clip
    D.shape(c, poly([(-172, -34), (-146, -34), (-149, 0), (-169, 0)]), "#2E3656", 0.7)
    for x in (-166, -158, -151):
        c.drawCircle(x, -36, 4.2, fill("#E8E6DE"))
    D.shape(c, rrect(-118, -27, -66, 0, 1.5), "#5A3A26", 0.7)
    c.drawRect(R(-108, -18, -76, -10), fill("#E8E6DE"))
    c.drawRect(R(-108, -18, -76, -10), D.line(0.4, INK))
    D.shape(c, rrect(-12, -5, 30, -1, 1), "#D9D6CE", 0.5)
    for k in range(4):
        c.drawCircle(-4 + k * 9, -3, 1.3, fill("#2A2D3A"))
    cable = skia.Path()
    cable.moveTo(-2, -5)
    cable.cubicTo(-10, -40, 40, -50, 30, -92)
    c.drawPath(cable, D.line(0.9, "#1E2230"))
    D.shape(c, rrect(64, -3, 76, -1, 0.6), "#D6312F", 0.3)
    c.drawRect(R(70, -4.5, 80, -1), fill("#F2EFE6"))


def bench_things(c):
    """What's on the bench at 12:40: Priya's locked laptop, the mug, the cutting mat, the charger, the pizza box."""
    if A():
        # cutting mat, breadboard and goggles
        D.shape(c, rrect(-93, -2.5, -27, 0, 0.5), "#2E8A5E", 0.4)
        c.drawRect(R(-86, -5, -58, -2.5), fill("#F2EFE6"))
        c.drawRect(R(-86, -5, -58, -2.5), D.line(0.35, INK))
        goggles = skia.Path()
        goggles.addArc(R(-52, -9, -32, 3), 180, 180)
        c.drawPath(goggles, D.line(1.6, "#9FD6CF", 0.9))
        # screwdriver cup
        for k, col in enumerate(["#D6312F", "#3FB8AF", "#F2B33D", "#9B87F5"]):
            c.drawRect(R(-21 + k * 3, -30 + (k % 2) * 3, -18.8 + k * 3, -14), fill(col))
        D.shape(c, rrect(-23, -16, -9, 0, 1.5), "#C9D6E6", 0.5, 0.75)
        # Priya's laptop, locked since 9:16
        D.shape(c, rrect(-12, -3.5, 56, 0, 1), "#30364C", 0.6)
        screen = poly([(-8, -3.5), (52, -3.5), (56, -44), (-4, -44)])
        D.shape(c, screen, "#262B3E", 0.7)
        c.drawPath(poly([(-4.5, -6.5), (48.5, -6.5), (52, -41), (-1, -41)]), linear((0, -41), (0, -6), [(0, "#24335E", 1.0), (1, "#141B36", 1.0)]))
        D.shape(c, rrect(19, -30, 27, -23, 1.2), "#9CB3E8", 0.3)
        c.drawPath(rrect(20.5, -35, 25.5, -29, 2.5), D.line(0.8, "#9CB3E8"))
        c.drawRect(R(12, -17, 36, -14.5), fill("#9CB3E8", 0.6))
        c.save()
        c.rotate(-4, -8, -12)
        D.shape(c, rrect(-14, -16, -2, -5, 0.4), "#F6D36B", 0.3)
        c.restore()
        # the No.1 PROF mug, a notebook, the charger and the pizza box
        D.shape(c, rrect(62, -12, 72, 0, 1.2), "#F2EFE6", 0.5)
        c.drawPath(rrect(71, -9.5, 75, -4, 2), D.line(0.9, INK))
        c.drawRect(R(64, -8, 70, -5.5), fill("#D6312F"))
        D.shape(c, rrect(78, -2, 94, 0, 0.4), "#3F6FA0", 0.3)
        D.shape(c, rrect(98, -6, 120, 0, 1), "#E8E6DE", 0.5)
        c.drawCircle(116, -3, 1.2, fill("#3DD68C"))
        D.shape(c, rrect(128, -6, 184, 0, 0.6), "#C9A877", 0.5)
        lid = poly([(128, -6), (184, -6), (178, -12), (134, -12)])
        D.shape(c, lid, "#B8935F", 0.5)
    else:
        c.drawPath(poly([(-4.5, -6.5), (48.5, -6.5), (52, -41), (-1, -41)]), fill("#3B5BAA", 0.45))
        Hd.glow(c, 24, -24, 30, "#6E8EFF", 0.35)
        Hd.glow(c, 116, -3, 4, "#3DD68C", 0.9)


def office_chair(c):
    if not A():
        return
    col = "#5D4E9C"
    D.shape(c, rrect(-20, -112, 20, -64, 8), col, 0.8)
    D.shape(c, rrect(-24, -64, 24, -54, 4), D.shade(col, 1.12), 0.8)
    c.drawRect(R(-2.5, -54, 2.5, -16), fill("#2A2D3A"))
    D.shape(c, rrect(-26, -16, 26, -11, 2), "#2A2D3A", 0.6)
    for x in (-24, 0, 24):
        c.drawCircle(x, -5, 4.5, fill("#16171C"))


def printer3d(c):
    if A():
        D.shape(c, rrect(-18, -44, 18, 0, 2), "#2B2F3A", 0.7)
        c.drawRect(R(-14, -40, 14, -6), fill("#11141B"))
        c.drawRect(R(-12, -12, 12, -9), fill("#6A7285"))
        c.drawRect(R(-5, -21, 5, -12), fill("#E8B04A"))
        c.drawRect(R(-14, -36, 14, -33), fill("#59617D"))
        c.drawRect(R(-3, -36, 3, -28), fill("#9AA3B8"))
        c.drawCircle(13, -3, 1.6, fill("#7FB2FF"))
    else:
        Hd.glow(c, 13, -3, 12, "#7FB2FF", 0.9)
        Hd.glow(c, 0, -26, 10, "#FF9A4A", 0.35)


def printer_bench(c):
    if A():
        D.shape(c, rrect(-78, -74, 78, -68, 1.5), "#6B5640", 0.7)
        for x in (-72, 68):
            c.drawRect(R(x, -68, x + 4, 0), fill("#3A3040"))
        c.drawRect(R(-72, -24, 72, -21), fill("#3A3040"))
        for k, col in enumerate(["#EF5B5B", "#3FB8AF", "#F2B33D", "#9B87F5"]):
            c.drawCircle(-48 + k * 24, -10, 9, fill(col))
            c.drawCircle(-48 + k * 24, -10, 9, D.line(0.5, INK))
            c.drawCircle(-48 + k * 24, -10, 3, fill("#1B1F2A"))
    for k in range(3):
        c.save()
        c.translate(-48 + k * 48, -74)
        printer3d(c)
        c.restore()


def laser_cutter(c):
    if A():
        D.shape(c, rrect(-48, -96, 48, 0, 3), "#C9CDD6", 0.8)
        D.shape(c, rrect(-44, -92, 44, -70, 2), "#2A2E38", 0.6)
        c.drawRect(R(-40, -88, 40, -74), fill("#3A2028"))
        D.shape(c, rrect(-44, -64, 44, -8, 2), "#B4B9C4", 0.5)
        c.drawRect(R(28, -60, 40, -52), fill("#1B1F2A"))
        c.drawCircle(-36, -56, 2, fill("#EF5B5B"))
    else:
        Hd.glow(c, -36, -56, 9, "#FF6B6B", 0.9)
        Hd.glow(c, 0, -81, 34, "#FF5A3C", 0.16)


def stool(c):
    if not A():
        return
    D.shape(c, rrect(-14, -62, 14, -56, 2), "#3A3E4A", 0.5)
    for x in (-11, 8):
        c.drawRect(R(x, -56, x + 3, 0), fill("#2A2D36"))
    c.drawRect(R(-11, -22, 11, -19), fill("#2A2D36"))


def water_cooler(c):
    if A():
        D.shape(c, rrect(-16, -96, 16, 0, 2), "#E4E7EC", 0.7)
        D.shape(c, rrect(-13, -138, 13, -96, 7), "#9CC8F0", 0.6, 0.85)
        c.drawRect(R(-10, -84, 10, -66), fill("#2A2E38"))
        c.drawCircle(-5, -75, 2, fill("#5BA8FF"))
        c.drawCircle(5, -75, 2, fill("#EF5B5B"))
    else:
        Hd.glow(c, -5, -75, 7, "#5BA8FF", 0.8)


def bench_seat(c):
    if not A():
        return
    D.shape(c, rrect(-60, -46, 60, -40, 2), "#7A5A3E", 0.6)
    for x in (-54, 50):
        c.drawRect(R(x, -40, x + 4, 0), fill("#2A2D36"))


def car(c, col="#2E4A6E"):
    """A car in the car park: a small estate, side on, facing the gate."""
    if A():
        body = skia.Path()
        body.moveTo(-145, -22)
        body.lineTo(-145, -64)
        body.quadTo(-140, -72, -124, -74)
        body.lineTo(-98, -76)
        body.quadTo(-70, -118, -30, -120)
        body.lineTo(52, -120)
        body.quadTo(84, -118, 104, -82)
        body.quadTo(138, -78, 146, -64)
        body.lineTo(147, -22)
        body.close()
        D.shape(c, body, col, 1.0)
        glass = skia.Path()
        glass.moveTo(-88, -80)
        glass.quadTo(-64, -112, -30, -113)
        glass.lineTo(50, -113)
        glass.quadTo(76, -111, 94, -82)
        glass.close()
        c.drawPath(glass, linear((0, -113), (0, -80), [(0, "#9FB4D6", 1.0), (1, "#3A4A6A", 1.0)]))
        c.drawPath(glass, D.line(0.8, INK))
        c.drawLine(4, -113, 6, -80, D.line(2.4, col))
        c.drawLine(-140, -50, 144, -50, D.line(0.8, "#22385A"))
        for x in (-30, 52):
            c.drawRect(R(x, -66, x + 12, -63), fill("#C9CDD6"))
        c.drawRect(R(138, -66, 147, -56), fill("#F2EFE6"))
        c.drawRect(R(-147, -68, -140, -58), fill("#B8302F"))
        for x in (-92, 96):
            c.drawCircle(x, -22, 22, fill("#14161C"))
            c.drawCircle(x, -22, 10, fill("#8E939E"))
            c.drawCircle(x, -22, 22, D.line(0.8, INK))
        for k in range(14):
            rx = -70 + (k * 37) % 150
            ry = -116 + (k * 13) % 30
            c.drawCircle(rx, ry, 1.1, fill("#DDE8FF", 0.6))


def visitor_sign(c):
    if not A():
        return
    c.drawRect(R(-2, -150, 2, 0), fill("#3A3E4A"))
    D.shape(c, rrect(-26, -168, 26, -142, 2), "#2C3266", 0.7)


def gatehouse(c):
    if A():
        D.shape(c, rrect(-36, -228, 36, 0, 2), "#B9B3A6", 0.9)
        D.shape(c, rrect(-42, -240, 42, -226, 2), "#6E6A62", 0.8)
        D.shape(c, rrect(-28, -196, 28, -118, 2), "#3C3F48", 0.7)
        c.drawRect(R(-25, -193, 25, -121), linear((0, -193), (0, -121), [(0, "#F6D9A0", 1.0), (1, "#D9A85C", 1.0)]))
        c.drawRect(R(-1, -193, 1, -121), fill("#3C3F48"))
        D.shape(c, rrect(10, -100, 30, 0, 1), "#6E6A62", 0.6)
        D.shape(c, rrect(-40, -262, 40, -242, 2), "#1F2C4E", 0.7)
    else:
        Hd.glow(c, 0, -157, 90, "#FFD58A", 0.45)
        c.drawRect(R(-25, -193, 25, -121), fill("#FFDCA0", 0.55))


def barrier(c):
    """The North Gate's arm, down, on its post (origin at the post)."""
    if not A():
        return
    D.shape(c, rrect(-8, -104, 8, 0, 1.5), "#F2B33D", 0.7)
    for k in range(4):
        c.drawRect(R(-8, -90 + k * 22, 8, -82 + k * 22), fill("#1B1F2A"))
    arm = rrect(-86, -100, 0, -92, 3)
    D.shape(c, arm, "#F2EFE6", 0.6)
    c.save()
    c.clipPath(arm)
    for k in range(5):
        c.drawRect(R(-86 + k * 18, -100, -77 + k * 18, -92), fill("#D6312F"))
    c.restore()


def anpr_pole(c):
    """The number-plate camera that logged the cars at the North Gate."""
    if A():
        c.drawRect(R(-3, -318, 3, 0), fill("#262A34"))
        c.drawRect(R(-34, -320, 3, -314), fill("#262A34"))
        D.shape(c, rrect(-58, -330, -22, -306, 3), "#3C414E", 0.7)
        D.shape(c, rrect(-64, -326, -56, -310, 2), "#16171C", 0.5)
        c.drawCircle(-60, -318, 3, fill("#5A1E24"))
    else:
        Hd.glow(c, -60, -318, 26, "#FF3A4A", 0.35)


def hvac(c):
    if not A():
        return
    D.shape(c, rrect(-66, -60, 66, 0, 3), "#8E939E", 0.9)
    c.drawCircle(-30, -30, 20, fill("#5E6370"))
    c.drawCircle(-30, -30, 20, D.line(0.8, INK))
    for k in range(4):
        c.drawLine(-30, -30, -30 + 18 * [1, 0, -1, 0][k], -30 + 18 * [0, 1, 0, -1][k], D.line(1.6, "#3A3E4A"))
    for k in range(6):
        c.drawRect(R(4, -52 + k * 8, 58, -48 + k * 8), fill("#6E7380"))


def antenna(c):
    if A():
        c.drawRect(R(-2, -124, 2, 0), fill("#3A3E4A"))
        for k, wdt in enumerate((26, 20, 14)):
            c.drawRect(R(-wdt / 2, -100 + k * 26, wdt / 2, -98 + k * 26), fill("#3A3E4A"))
        c.drawCircle(0, -126, 3, fill("#7A2028"))
    else:
        Hd.glow(c, 0, -126, 22, "#FF3A3A", 0.75)


# ---------------------------------------------------------------------------
# Rooms

def office_door_strip(c, x0, z0, z1):
    """Lab 4's new west end: the same wall as the photos, and the door through to the professor's office."""
    with photo(c, LAB_X0 - 0.3 - 1600 * LAB_K, z1 - CEIL, LAB_K, 58, clip=(x0, z0, LAB_X0 + 1, z1)):
        PH.back_wall(c)
        PH.ceiling(c)
    with P2(c, x0, z0) as p:
        # the door, ajar, in a steel frame, with a nameplate and a coat hook beside it
        p.rect(8, 6, 70, 214, fill("#C9CDD6"))
        p.rect(8, 6, 70, 214, D.line(1.0, INK))
        p.rect(12, 6, 66, 210, fill("#7A5A3E"))
        p.rect(12, 6, 66, 210, D.line(0.8, INK))
        p.poly([(12, 6), (30, 12), (30, 204), (12, 210)], fill("#5E4630"))
        p.rect(52, 100, 58, 106, fill("#C9CDD6"))
        p.rect(24, 120, 40, 190, fill("#1A2240"))
        p.rect(18, 222, 62, 238, fill("#2C3266"))
        p.rect(18, 222, 62, 238, D.line(0.6, INK))
        p.rect(74, 150, 80, 154, fill("#3A3E4A"))
        p.c.drawCircle(77, 148, 2.2, fill("#3A3E4A"))
    wtext(c, "PROF. SQUIRES", x0 + 40, z0 + 227, 4.6, CREAM, tracking=0.4)


def draw_lab4(c):
    x0, x1, z0, z1 = ROOMS["lab4"]
    if A():
        office_door_strip(c, x0, z0, z1)
        x0 = LAB_X0
        with photo(c, x0 - 0.3, z1 - CEIL, LAB_K, 58, clip=(x0, z0, x1, z1)):
            PH.lab_wall(c, MINUTE, halo=False)
            # the cabinet's lower half, which both photos hide behind the bench
            base = rrect(112, 770, 424, 1010, 6)
            c.drawPath(base, surface("steel", 0.9))
            c.drawPath(base, fill("#26304C", 0.42))
            c.drawLine(268, 784, 268, 1000, stroke(INK, 4))
            for x in (252, 284):
                c.drawPath(rrect(x - 4, 840, x + 4, 900, 3), fill("#9AA3B8"))
            c.drawPath(base, stroke(INK, 5))
            # a tour-point tag by the door: Ozzy's round touches it
            c.drawPath(rrect(1560, 600, 1600, 640, 6), fill("#C9CDD6"))
            c.drawPath(rrect(1560, 600, 1600, 640, 6), stroke(INK, 3))
            c.drawCircle(1580, 620, 9, fill("#3A3E4A"))
        room_shell(c, "lab4", floor_tex="labfloor", tile=36.0, trim="#2C3352", ceiling=False)
        x0 = ROOMS["lab4"][0]
    else:
        for x in (110, 320):   # the strip lights in the photo's ceiling
            wglow(c, x, 573, 60, "#FFFDF2", 0.5)
        wglow(c, 70, 465, 70, "#BFD8FF", 0.18)   # the light inside the cabinet
    put(c, 205, z0, lab_bench, 150)
    with photo(c, LAB_X0 - 0.3, z0 + 108 + (803 - 58) * LAB_K, LAB_K, 58, clip=(LAB_X0, z0, x1, z1)):
        if A():
            PH.oscilloscope(c, probe=False)
    if not A():   # the oscilloscope's trace
        wglow(c, 70, 425, 30, "#7DFFB0", 0.4)
    put(c, 205, z0 + 102, bench_things)
    put(c, 404, z0, office_chair, 28)


def storage_rack(c):
    """The maker space's new west corner: a steel rack of part bins, a half-built drone on top, a bike against it."""
    if not A():
        return
    for x in (-40, 36):
        c.drawRect(R(x, -196, x + 4, 0), fill("#5E6676"))
    for k, zz in enumerate((-6, -60, -114, -168)):
        D.shape(c, rrect(-42, zz - 4, 42, zz, 1), "#7A8294", 0.5)
        if k < 3:
            for j, col in enumerate(["#3F6FA0", "#E8B04A", "#3FB8AF", "#D6312F"][k:k + 3]):
                D.shape(c, rrect(-36 + j * 25, zz - 34, -16 + j * 25, zz - 4, 1.5), col, 0.5)
                c.drawRect(R(-31 + j * 25, zz - 26, -21 + j * 25, zz - 22), fill("#F2EFE6"))
    # the drone, arms out, two props missing
    D.shape(c, rrect(-12, -186, 12, -176, 2), "#2B2F3A", 0.5)
    for dx in (-30, 30):
        c.drawLine(0, -181, dx, -184, D.line(1.6, "#2B2F3A"))
    c.drawLine(-38, -188, -22, -188, D.line(1.2, "#9AA3B8"))
    c.drawCircle(30, -186, 3, fill("#9AA3B8"))


def draw_maker(c):
    x0, x1, z0, z1 = ROOMS["maker"]
    xa = x0
    x0 = MAKER_X0
    w, h = x1 - x0, z1 - z0
    with P2(c, x0, z0) as p:
        if A():
            p.rect(xa - x0, 0, w, h, D.tex("block", 60.0))
            # the window, blinds half down, moonlight
            p.rect(46, 104, 164, 236, fill("#C9CDD6"))
            p.rect(52, 110, 158, 230, linear((0, 110), (0, 230), [(0, "#0B1024", 1.0), (1, "#22305E", 1.0)]))
            for k in range(8):
                p.rect(52, 230 - k * 7, 158, 227 - k * 7, fill("#D9DCE4"))
            p.rect(103, 110, 107, 230, fill("#C9CDD6"))
            for k in range(6):
                xx = 60 + k * 16
                p.c.drawLine(xx, 116, xx - 5, 150, D.line(0.6, "#9FB2E0", 0.45))
            # pegboard with tools
            p.rect(188, 120, 300, 206, fill("#9A7A56"))
            p.rect(188, 120, 300, 206, D.line(0.9, INK))
            for i in range(12):
                for j in range(8):
                    p.c.drawCircle(194 + i * 9.3, 125 + j * 10.5, 0.8, fill("#5A4430"))
            p.rect(200, 140, 204, 196, fill("#3A3E4A"))
            p.rect(194, 190, 210, 198, fill("#3A3E4A"))
            p.c.drawCircle(226, 180, 9, D.line(2.2, "#3A3E4A"))
            p.rect(224, 140, 228, 171, fill("#3A3E4A"))
            p.poly([(246, 196), (262, 196), (258, 150), (250, 150)], fill("#3A3E4A"))
            p.rect(272, 136, 292, 140, fill("#3A3E4A"))
            p.rect(280, 140, 284, 196, fill("#C9A877"))
            # filament shelves
            for zz in (150.0, 200.0):
                p.rect(312, zz - 4, 370, zz, fill("#6B5640"))
                for k, col in enumerate(["#EF5B5B", "#3FB8AF", "#F2B33D"]):
                    p.c.drawCircle(324 + k * 21, zz + 10, 9, fill(col))
                    p.c.drawCircle(324 + k * 21, zz + 10, 9, D.line(0.5, INK))
                    p.c.drawCircle(324 + k * 21, zz + 10, 3, fill("#1B1F2A"))
            # the door out to the lobby, shut for the night, under its little green sign
            p.rect(376, 0, 422, 198, fill("#5E6676"))
            p.rect(376, 0, 422, 198, D.line(1.0, INK))
            p.rect(382, 6, 416, 192, fill("#6E7686"))
            p.rect(388, 120, 410, 176, fill("#1A2240"))
            p.rect(388, 120, 410, 176, D.line(0.6, INK))
            p.rect(382, 92, 392, 96, fill("#C9CDD6"))
            p.rect(380, 204, 418, 216, fill("#1E7A4E"))
            p.rect(380, 204, 418, 216, D.line(0.5, INK))
            # the sign
            p.rect(188, 226, 300, 250, fill("#F2EFE6"))
            p.rect(188, 226, 300, 250, D.line(0.9, INK))
        else:
            p.rect(52, 110, 158, 230, fill("#5D7BD8", 0.10))
            p.rect(380, 204, 418, 216, fill("#3DFF9A", 0.45))
            p.c.drawCircle(399, 210, 30, radial((399, 210), 30, [(0, "#3DFF9A", 0.3), (1, "#3DFF9A", 0.0)], blend=PLUS))
    if A():
        wtext(c, "MAKER SPACE", x0 + 244, z0 + 240, 11.0, INK, tracking=1.0)
        wtext(c, "closed 8 PM - 8 AM", x0 + 244, z0 + 230, 6.5, "#5A5D64", face="type")
        wtext(c, "LOBBY", x0 + 399, z0 + 207.5, 6.0, "#E8FFF2", tracking=0.6)
        room_shell(c, "maker", floor_tex="concrete", tile=50.0, trim="#3A3F4E", ceiling=True)
    put(c, 118, z0, printer_bench, 100)
    put(c, 330, z0, laser_cutter, 60)
    put(c, 236, z0, stool, 18)
    put(c, -32, z0, storage_rack, 50)


def draw_corridor(c):
    x0, x1, z0, z1 = ROOMS["corridor"]
    w, h = x1 - x0, z1 - z0
    with P2(c, x0, z0) as p:
        if A():
            p.rect(0, 0, w, h, fill("#B9C0CE"))
            p.rect(0, 0, w, 108, fill("#3B4868"))
            p.rect(0, 106, w, 112, fill("#22293F"))
            p.rect(0, 252, w, 257, fill("#3FB8AF"))
            p.rect(0, 257, w, 260, fill("#F2B33D"))
            # the corridor clock, 12:40
            p.c.drawCircle(320, 232, 13, fill("#F2EFE6"))
            p.c.drawCircle(320, 232, 13, D.line(2.0, INK))
            for k in range(12):
                a = k * 0.5236
                p.c.drawLine(320 + 10.5 * np.sin(a), 232 + 10.5 * np.cos(a), 320 + 12 * np.sin(a), 232 + 12 * np.cos(a), D.line(0.7, INK))
            p.c.drawLine(320, 232, 320 + 6.5 * np.sin(0.349), 232 + 6.5 * np.cos(0.349), D.line(1.6, INK))
            p.c.drawLine(320, 232, 320 + 9.8 * np.sin(4.189), 232 + 9.8 * np.cos(4.189), D.line(1.0, INK))
            # the open door into Lab 4, folded back against the wall
            p.rect(2, 6, 62, 214, fill("#7A5A3E"))
            p.rect(2, 6, 62, 214, D.line(1.0, INK))
            p.rect(14, 120, 28, 196, fill("#1A2240"))
            p.rect(2, 10, 62, 22, fill("#9AA3B8"))
            # LAB 4 plaque and the door's badge reader
            p.rect(72, 168, 118, 188, fill("#2C3266"))
            p.rect(72, 168, 118, 188, D.line(0.8, INK))
            p.rect(76, 118, 86, 140, fill("#30343E"))
            p.rect(76, 118, 86, 140, D.line(0.6, INK))
            p.c.drawCircle(81, 134, 1.6, fill("#3DD68C"))
            # stairs-down sign
            p.rect(10, 240, 56, 254, fill("#1E7A4E"))
            # doors to Labs 3 and 5
            for dx in (168.0, 392.0):
                p.rect(dx, 6, dx + 80, 214, fill("#8A6A4A"))
                p.rect(dx, 6, dx + 80, 214, D.line(1.0, INK))
                p.rect(dx + 12, 120, dx + 26, 196, fill("#151A2E"))
                p.rect(dx, 10, dx + 80, 24, fill("#9AA3B8"))
                p.rect(dx + 64, 104, dx + 72, 108, fill("#C9CDD6"))
                p.rect(dx + 20, 222, dx + 60, 238, fill("#2C3266"))
            # noticeboard with flyers
            p.rect(268, 120, 372, 200, fill("#B88A5A"))
            p.rect(268, 120, 372, 200, D.line(1.0, INK))
            for fx, fz, fw, fh, col in ((276, 160, 26, 34, "#F2EFE6"), (308, 168, 30, 26, "#F6D36B"), (342, 150, 24, 40, "#9FD6CF"),
                                        (280, 128, 32, 26, "#F2C9C0"), (318, 126, 44, 34, "#F2EFE6")):
                p.rect(fx, fz, fx + fw, fz + fh, fill(col))
                p.rect(fx, fz, fx + fw, fz + fh, D.line(0.4, INK))
                p.c.drawCircle(fx + fw / 2, fz + fh - 2, 1.4, fill("#D6312F"))
                for k in range(3):
                    p.rect(fx + 3, fz + fh - 9 - k * 6, fx + fw - 3, fz + fh - 8 - k * 6, fill("#5A5D64", 0.5))
            # guard tour point and a fire extinguisher
            p.rect(254, 130, 264, 140, fill("#C9CDD6"))
            p.rect(254, 130, 264, 140, D.line(0.5, INK))
            p.c.drawCircle(259, 135, 2.4, fill("#3A3E4A"))
            p.rect(150, 120, 162, 160, fill("#D6312F"))
            p.rect(150, 120, 162, 160, D.line(0.7, INK))
            p.rect(152, 160, 160, 166, fill("#2A2D36"))
            # the fuse cupboard over the water cooler, in the gap past Lab 5's door: grey steel, a hazard stripe, a keyhole
            p.rect(474, 150, 501, 206, fill("#8D93A3"))
            p.rect(474, 150, 501, 206, D.line(1.0, INK))
            p.rect(477, 153, 498, 203, fill("#9EA4B4"))
            p.rect(477, 195, 498, 201, fill("#F2B33D"))
            for k in range(3):
                p.poly([(478 + k * 7, 195), (482 + k * 7, 195), (479 + k * 7, 201), (475 + k * 7, 201)], fill("#22293F"))
            p.poly([(488, 186), (483, 177), (487, 177), (484, 168), (492, 180), (488, 180)], fill("#F2B33D"))
            p.c.drawCircle(495, 170, 1.5, fill("#22293F"))
            # the new east end: the staff kitchen's door, propped open, with a mug sign
            p.rect(516, 6, 582, 214, fill("#C9CDD6"))
            p.rect(516, 6, 582, 214, D.line(1.0, INK))
            p.rect(520, 6, 578, 210, fill("#2A2F3E"))
            p.rect(520, 6, 578, 210, linear((520, 0), (578, 0), [(0, "#0A0604", 0.0), (1, "#0A0604", 0.35)]))
            p.poly([(578, 6), (598, 0), (598, 214), (578, 210)], fill("#8A6A4A"))
            p.poly([(578, 6), (598, 0), (598, 214), (578, 210)], D.line(0.8, INK))
            p.rect(520, 222, 578, 238, fill("#2C3266"))
            p.rect(520, 222, 578, 238, D.line(0.6, INK))
            # a fire-exit plan in a frame between the cupboard and the door
            p.rect(506, 150, 512, 200, fill("#F2EFE6"))
            # ceiling panels, one switched off for the night
            p.rect(0, h - CEIL, w, h, fill("#C9CDD6"))
            p.rect(0, h - CEIL, w, h - CEIL + 1.5, fill("#8D93A3"))
            for k, cx in enumerate((92.0, 192.0, 312.0, 432.0, 552.0)):
                p.rect(cx - 40, h - CEIL + 2, cx + 40, h - 2, fill("#FFFDF2" if k != 2 else "#9EA4B4"))
        else:
            p.c.drawCircle(81, 134, 8, radial((81, 134), 8, [(0, "#3DD68C", 0.9), (1, "#3DD68C", 0.0)], blend=PLUS))
            p.rect(10, 240, 56, 254, fill("#3DFF9A", 0.5))
            p.c.drawCircle(33, 247, 40, radial((33, 247), 40, [(0, "#3DFF9A", 0.35), (1, "#3DFF9A", 0.0)], blend=PLUS))
            p.rect(522, 8, 576, 120, fill("#FFF2D6", 0.10))   # the kitchen's light through its door
            for k, cx in enumerate((92.0, 192.0, 312.0, 432.0, 552.0)):
                if k != 2:
                    p.c.drawCircle(cx, h - 8, 70, radial((cx, h - 8), 70, [(0, "#FFF6DC", 0.5), (1, "#FFF6DC", 0.0)], blend=PLUS))
    if A():
        wtext(c, "LAB 4", x0 + 95, z0 + 172, 12.0, CREAM, tracking=1.2)
        wtext(c, "LAB 3", x0 + 208, z0 + 226, 10.0, CREAM, tracking=1.0)
        wtext(c, "LAB 5", x0 + 432, z0 + 226, 10.0, CREAM, tracking=1.0)
        wtext(c, "STAIRS", x0 + 33, z0 + 243.5, 8.0, "#E8FFF2", tracking=0.8)
        wtext(c, "KITCHEN", x0 + 549, z0 + 226.5, 8.0, CREAM, tracking=0.8)
        room_shell(c, "corridor", floor_tex="vinyl", tile=44.0, trim="#22293F", ceiling=False)
    put(c, 920, z0, water_cooler, 24)
    put(c, 760, z0, bench_seat, 70)


def lobby_wall_photo(c):
    """The lobby's back wall in photo space (camera 2's wall, with warmer paint than the greyscale still shows)."""
    right = 1120 + LOBBY_EAST / LOB_K
    wall = PH.box(-320, 0, right, 640)
    c.drawPath(wall, linear((0, 0), (0, 640), [(0, "#C2B49C", 1), (1, "#9C8E78", 1)]))
    weave(c, wall, "paper", 1.3)
    c.drawRect(R(-320, 500, right, 640), surface("wood", 0.7))
    c.drawRect(R(-320, 500, right, 640), fill("#8A6A4A", 0.3))
    c.drawLine(-320, 500, right, 500, stroke(INK, 4))
    text(c, "HALDEN INNOVATION BUILDING", 490, 132, font("display", 44), fill(INK, 0.9), align="center", tracking=4)
    # a tour-point tag beside the noticeboard
    c.drawPath(rrect(586, 300, 610, 324, 4), fill("#C9CDD6"))
    c.drawPath(rrect(586, 300, 610, 324, 4), stroke(INK, 3))
    c.drawCircle(598, 312, 5, fill("#3A3E4A"))


def stairs(c):
    """The switchback stairs from the lobby up to the corridor, against the back wall."""
    if not A():
        return
    with P2(c) as p:
        p.rect(448, 0, 560, 280, fill("#B3A68F"))
        p.rect(448, 0, 560, 280, fill("#0A0604", 0.12))

        def flight(xa, za, xb, zb):
            n = 9
            pts = [(xa, za)]
            for i in range(n):
                xi = xa + (xb - xa) * i / n
                xj = xa + (xb - xa) * (i + 1) / n
                zj = za + (zb - za) * (i + 1) / n
                pts += [(xi, zj), (xj, zj)]
            pts += [(xb, zb - 16), (xa, za - 16)]
            p.poly(pts, fill("#8E95A8"))
            p.poly(pts, D.line(0.9, INK))
            for i in range(n):
                xi = xa + (xb - xa) * i / n
                xj = xa + (xb - xa) * (i + 1) / n
                zj = za + (zb - za) * (i + 1) / n
                p.rect(min(xi, xj), zj - 1.6, max(xi, xj), zj, fill("#C9CED8"))
            # handrail, 90 cm above the nosings, on posts
            p.c.drawLine(xa, za + 90, xb, zb + 90, D.line(3.4, INK))
            p.c.drawLine(xa, za + 90, xb, zb + 90, D.line(2.0, "#C9CED8"))
            for t in (0.12, 0.5, 0.88):
                xp, zp = xa + (xb - xa) * t, za + (zb - za) * t
                p.c.drawLine(xp, zp, xp, zp + 90, D.line(1.4, "#5A5D64"))

        flight(456.0, 0.0, 548.0, 150.0)
        p.rect(536, 134, 560, 150, fill("#8E95A8"))
        p.rect(536, 134, 560, 150, D.line(0.9, INK))
        flight(548.0, 150.0, 456.0, 300.0)


def draw_lobby(c):
    x0, x1, z0, z1 = ROOMS["lobby"]
    if A():
        with photo(c, LOB_X, z0 + FB, LOB_K, 640, clip=(x0, z0, x1, z1)):
            lobby_wall_photo(c)
            c.save()
            c.clipRect(R(90, 186, 484, 380))
            PH.security_desk(c)        # the key board and the rounds rota, on the wall
            c.restore()
            c.save()
            c.clipRect(R(616, 204, 792, 392))
            PH.lobby_furniture(c)      # the noticeboard
            c.restore()
        E = LOBBY_EAST                 # the entrance wall's things moved east with the wall
        with photo(c, LOB_X + E, z0 + FB, LOB_K, 640, clip=(x0, z0, x1, z1)):
            c.clipRect(R(940, 340, 986, 420))
            PH.exit_doors(c)           # the badge reader by the way out
        stairs(c)
        with photo(c, 898 + E - 1176 * 0.3, z0 + 263, 0.3, 88, clip=(x0, z0, x1, z1)):
            c.clipRect(R(1166, 78, 1340, 156))
            PH.exit_doors(c)           # the lit EXIT sign
        room_shell(c, "lobby", floor_tex="lobbyfloor", tile=48.0, trim="#5A3A26", ceiling=True)
        with P2(c, E, 0) as p:
            p.rect(896, 1, 952, 7, fill("#3A3C44"))
            # the lobby camera, on a bracket under the ceiling, looking down at the desk and the doors
            p.rect(887, 262, 891, 276, fill("#3A3E4A"))
            p.poly([(862, 262), (890, 266), (892, 254), (864, 250)], fill("#E4E7EC"))
            p.poly([(862, 262), (890, 266), (892, 254), (864, 250)], D.line(0.8, INK))
            p.poly([(856, 260), (863, 262), (865, 251), (858, 249)], fill("#1B1F2A"))
            p.c.drawCircle(886, 258, 1.4, fill("#5A1E24"))
        with P2(c) as p:
            for cx in (640.0, 810.0, 968.0):
                p.rect(cx - 16, 270, cx + 16, 278, fill("#FFFDF2"))
    else:
        E = LOBBY_EAST
        for cx in (640.0, 810.0, 968.0):
            wglow(c, cx, 272, 70, "#FFF6E0", 0.38)
        wglow(c, 924 + E, 254, 40, "#FFFFFF", 0.35)
        wglow(c, 945 + E, 130, 8, "#3DD68C", 0.8)
        wglow(c, 886 + E, 258, 7, "#FF3A4A", 0.8)          # the lobby camera's light
    # standing things: the drinks machine, the wet floor cone, the umbrellas, then the desk in front
    if A():
        with photo(c, LOB_X + E, z0 + 6, LOB_K, 626, clip=(x0, z0, x1, z1)):
            c.clipRect(R(800, 204, 950, 632))
            PH.lobby_furniture(c)
        with photo(c, 845 + E - 1034 * LOB_K, z0 + 6, LOB_K, 880, clip=(x0, z0, x1, z1)):
            c.clipRect(R(1024, 740, 1116, 884))
            PH.wet_floor_cone(c)
        with photo(c, 920 + E - 1524 * LOB_K, z0 + 6, LOB_K, 660, clip=(x0, z0, x1, z1)):
            c.clipRect(R(1510, 420, 1600, 664))
            PH.exit_doors(c)
        with photo(c, LOB_X, z0 + 6, LOB_K, 816, clip=(x0, z0, x1, z1)):
            c.clipRect(R(0, 446, 600, 820))
            PH.security_desk(c)
        # the back wall again where the desk's chair showed between the monitors and the flask
        with photo(c, LOB_X, z0 + FB, LOB_K, 640, clip=(666.4, 113.2, 692.0, 154.0)):
            lobby_wall_photo(c)
            c.save()
            c.clipRect(R(90, 186, 484, 380))
            PH.security_desk(c)
            c.restore()
    else:
        wglow(c, 910 + E, 110, 70, "#FFE6B0", 0.3)     # the drinks machine
        wglow(c, 636, 132, 50, "#BFD8FF", 0.35)    # the monitor bank
        wglow(c, 721, 120, 14, "#BFD8FF", 0.4)     # the phone with the match on


# ---------------------------------------------------------------------------
# The new rooms (2026-11-27). Each has two or three things to look at, all flavour: nothing here is a clue.

def filing_cabinet(c):
    """The professor's filing cabinet, where the asset register is kept."""
    if not A():
        return
    D.shape(c, rrect(-26, -132, 26, 0, 2), "#6E7A72", 0.9)
    for k in range(4):
        top = -128 + k * 32
        D.shape(c, rrect(-22, top, 22, top + 28, 1.5), "#7F8B83", 0.6)
        c.drawRect(R(-8, top + 6, 8, top + 12), fill("#F2EFE6"))
        c.drawRect(R(-8, top + 6, 8, top + 12), D.line(0.3, INK))
        D.shape(c, rrect(-9, top + 16, 9, top + 20, 1.5), "#C9CDD6", 0.4)
    # a pot of pens and a stapler on top
    D.shape(c, rrect(-18, -144, -8, -132, 1), "#2C3266", 0.4)
    for k, col in enumerate(["#D6312F", "#3F6FA0", "#2A2D3A"]):
        c.drawLine(-16 + k * 3, -144, -17 + k * 4, -152 - k, D.line(1.0, col))
    D.shape(c, rrect(2, -138, 20, -132, 1.5), "#3A3E4A", 0.4)


def bookcase(c):
    if not A():
        return
    D.shape(c, rrect(-42, -232, 42, 0, 2), "#6B4E36", 0.9)
    c.drawRect(R(-37, -226, 37, -4), fill("#3E2C1E"))
    rng = np.random.default_rng(11)
    cols = ["#8E3B32", "#2C4A6E", "#3F6B4E", "#C9A877", "#5D4E9C", "#D9D6CE", "#7A5A3E", "#B4532A"]
    for k, zz in enumerate((-4, -58, -112, -166)):
        c.drawRect(R(-38, zz - 4, 38, zz), fill("#7A5A3E"))
        x = -36.0
        while x < 32:
            bw = float(rng.uniform(4, 8))
            bh = float(rng.uniform(32, 46))
            if rng.random() < 0.12 and x < 20:   # a gap, and a book leaning into it
                x += 8
                continue
            c.drawRect(R(x, zz - 4 - bh, x + bw, zz - 4), fill(cols[int(rng.integers(len(cols)))]))
            c.drawRect(R(x, zz - 4 - bh, x + bw, zz - 4), D.line(0.25, INK))
            x += bw + 0.6
    c.drawRect(R(-38, -224, 38, -220), fill("#7A5A3E"))
    # a little brass award on the top shelf
    D.shape(c, rrect(-6, -218, 6, -212, 1), "#C9A23A", 0.3)
    c.drawPath(poly([(-4, -218), (4, -218), (6, -232), (-6, -232)]), fill("#E2BE52"))


def office_desk(c):
    """His desk: a wide wooden top, a drawer pedestal (shut), the screen, the lamp, papers and a cold mug."""
    if A():
        D.shape(c, rrect(-84, -80, 84, -73, 1.5), "#7A5A3E", 0.8)
        D.shape(c, rrect(-80, -73, -74, 0, 1), "#5E4630", 0.6)
        D.shape(c, rrect(36, -73, 80, 0, 1.5), "#6B4E36", 0.8)
        for k in range(3):
            top = -70 + k * 23
            D.shape(c, rrect(39, top, 77, top + 20, 1), "#7A5A3E", 0.5)
            D.shape(c, rrect(52, top + 8, 64, top + 11, 1.2), "#C9A877", 0.3)
        c.drawRect(R(-74, -60, 36, -56), fill("#5E4630"))   # the modesty panel
        # the screen, asleep but not off
        c.drawRect(R(-26, -92, -18, -80), fill("#2A2D3A"))
        D.shape(c, rrect(-34, -82, -10, -80, 1), "#2A2D3A", 0.4)
        D.shape(c, rrect(-58, -132, 14, -92, 2), "#1E2230", 0.8)
        c.drawRect(R(-54, -128, 10, -96), linear((0, -128), (0, -96), [(0, "#1C2A4E", 1.0), (1, "#101830", 1.0)]))
        # keyboard, papers, the mug
        D.shape(c, rrect(-50, -83, -6, -80, 0.8), "#3A3E4A", 0.4)
        for k in range(4):
            c.drawRect(R(-78 + k * 0.8, -84 - k * 1.6, -58 + k * 0.8, -82.4 - k * 1.6), fill("#F2EFE6"))
            c.drawRect(R(-78 + k * 0.8, -84 - k * 1.6, -58 + k * 0.8, -82.4 - k * 1.6), D.line(0.2, INK))
        D.shape(c, rrect(16, -91, 25, -80, 1), "#3F6FA0", 0.4)
        c.drawPath(rrect(24, -88.5, 28, -84, 2), D.line(0.8, INK))
        # the lamp: base, two arms, a green shade
        D.shape(c, rrect(50, -84, 70, -80, 1.5), "#2A2D3A", 0.4)
        c.drawLine(60, -84, 50, -112, D.line(1.8, "#2A2D3A"))
        c.drawLine(50, -112, 68, -128, D.line(1.8, "#2A2D3A"))
        D.shape(c, poly([(62, -134), (80, -122), (74, -114), (58, -124)]), "#2E6B4E", 0.6)
    else:
        c.drawRect(R(-54, -128, 10, -96), fill("#3B5BAA", 0.28))
        Hd.glow(c, -22, -112, 34, "#6E8EFF", 0.22)
        Hd.glow(c, 70, -116, 46, "#FFD58A", 0.65)
        c.drawPath(poly([(66, -116), (96, -82), (36, -82), (60, -118)]), fill("#FFE2A8", 0.10))


def fern(c):
    """A fern that nobody has watered this week."""
    if not A():
        return
    D.shape(c, poly([(-15, -34), (15, -34), (11, 0), (-11, 0)]), "#B4532A", 0.6)
    c.drawRect(R(-16, -38, 16, -33), fill("#9A4524"))
    for k, (dx, dz, col) in enumerate(((-30, -50, "#4E7A3A"), (-18, -74, "#5E8A44"), (2, -80, "#4E7A3A"), (20, -70, "#6E8A3E"),
                                       (32, -46, "#8A7A3A"), (-34, -36, "#8A6A34"), (26, -40, "#9A7A3A"))):
        leaf = skia.Path()
        leaf.moveTo(0, -38)
        leaf.quadTo(dx * 0.4, dz - 10, dx, dz)
        c.drawPath(leaf, D.line(2.4, col))
        for j in range(4):
            t = 0.35 + j * 0.15
            lx, lz = dx * t * 0.9, -38 + (dz + 38) * t
            c.drawLine(lx, lz, lx + 4, lz - 3, D.line(1.2, col))
            c.drawLine(lx, lz, lx - 4, lz - 2, D.line(1.2, col))


def demo_case(c):
    """An aluminium flight case for the investor demo, lid shut, by the desk."""
    if not A():
        return
    D.shape(c, rrect(-34, -36, 34, 0, 2.5), "#B4B9C4", 0.8)
    c.drawRect(R(-34, -20, 34, -18), fill("#7E8494"))
    for x in (-34, 28):
        for z in (-36, -6):
            c.drawRect(R(x, z, x + 6, z + 6), fill("#6E7380"))
    D.shape(c, rrect(-10, -40, 10, -36, 1.5), "#2A2D3A", 0.4)
    D.shape(c, rrect(-24, -32, -4, -24, 1), "#F2B33D", 0.3)


def draw_office(c):
    """Prof. Squires's office: lights off, the desk lamp left on, rain on the window."""
    x0, x1, z0, z1 = NEW["office"]
    w, h = x1 - x0, z1 - z0
    with P2(c, x0, z0) as p:
        if A():
            p.rect(0, 0, w, h, linear((0, 0), (0, h), [(0, "#3E4F58", 1.0), (1, "#56707A", 1.0)]))
            p.rect(0, 0, w, 96, fill("#5E4630"))
            for k in range(13):
                p.rect(k * 40, 0, k * 40 + 1.2, 96, fill("#3E2C1E"))
            p.rect(0, 94, w, 100, fill("#7A5A3E"))
            # the window: rain, the city, blinds half up
            p.rect(30, 108, 158, 238, fill("#C9CDD6"))
            p.rect(36, 114, 152, 232, linear((0, 114), (0, 232), [(0, "#0B1024", 1.0), (1, "#22305E", 1.0)]))
            for k, (bx, bw, bh) in enumerate(((40, 18, 40), (62, 14, 62), (80, 22, 30), (106, 16, 52), (126, 22, 44))):
                p.rect(bx, 114, bx + bw, 114 + bh, fill("#0C0F22"))
                for j in range(3):
                    if (k + j) % 2 == 0:
                        p.rect(bx + 4, 120 + j * 10, bx + 7, 124 + j * 10, fill("#FFCF6B", 0.8))
            for k in range(6):
                p.rect(36, 232 - k * 6, 152, 229 - k * 6, fill("#D9DCE4"))
            p.rect(92, 114, 96, 232, fill("#C9CDD6"))
            p.rect(26, 104, 162, 109, fill("#9AA3B8"))
            # the framed HALO sketch: two lenses and a hinge, in pencil
            p.rect(312, 150, 376, 214, fill("#3A2C22"))
            p.rect(316, 154, 372, 210, fill("#F2EBD8"))
            p.c.drawCircle(332, 182, 9, D.line(0.9, "#5A5D64"))
            p.c.drawCircle(356, 182, 9, D.line(0.9, "#5A5D64"))
            p.c.drawLine(341, 183, 347, 183, D.line(0.9, "#5A5D64"))
            p.c.drawLine(323, 184, 318, 192, D.line(0.7, "#5A5D64"))
            for k in range(3):
                p.rect(322, 162 - k * 3, 360 - k * 6, 162.8 - k * 3, fill("#8E939E", 0.6))
            # a certificate and a wall calendar
            p.rect(390, 172, 426, 202, fill("#3A2C22"))
            p.rect(393, 175, 423, 199, fill("#E8E2CE"))
            p.rect(398, 190, 418, 192, fill("#C9A23A"))
            p.rect(440, 142, 476, 196, fill("#F2EFE6"))
            p.rect(440, 186, 476, 196, fill("#B4532A"))
            for i in range(5):
                for j in range(4):
                    p.rect(443 + i * 6.6, 147 + j * 9, 448 + i * 6.6, 153 + j * 9, fill("#D9D6CE"))
            # the ceiling light, switched off
            p.rect(0, h - CEIL, w, h, fill("#9AA0AD"))
            p.rect(150, h - CEIL + 2, 330, h - 2, fill("#B9BFCB"))
        else:
            p.rect(36, 114, 152, 232, fill("#5D7BD8", 0.10))
    if A():
        shell(c, NEW["office"], floor_tex="vinyl", tile=44.0, trim="#3E2C1E", ceiling=False)
    put(c, x0 + 196, z0, filing_cabinet, 30)
    put(c, x0 + 262, z0, bookcase, 46)
    put(c, x0 + 324, z0, demo_case, 38)
    put(c, x0 + 420, z0, office_desk, 90)
    put(c, x0 + 476, z0, fern, 20)


def kitchen_counter(c):
    """The staff kitchen's counter: sink, kettle, microwave and the coffee machine."""
    if A():
        D.shape(c, rrect(-150, -90, 150, 0, 1.5), "#E4E7EC", 0.9)
        for k in range(5):
            D.shape(c, rrect(-146 + k * 59, -84, -92 + k * 59, -6, 1.5), "#F2F3F5", 0.5)
            c.drawRect(R(-124 + k * 59, -76, -114 + k * 59, -73), fill("#8E939E"))
        c.drawRect(R(-150, -6, 150, 0), fill("#2A2D36"))
        D.shape(c, rrect(-154, -96, 154, -90, 1), "#6E6A62", 0.6)
        # sink and tap
        c.drawRect(R(-132, -96, -90, -92), fill("#9AA3B8"))
        c.drawLine(-104, -96, -104, -116, D.line(2.0, "#9AA3B8"))
        c.drawLine(-104, -116, -116, -116, D.line(2.0, "#9AA3B8"))
        # the kettle, just boiled
        D.shape(c, poly([(-70, -96), (-46, -96), (-49, -120), (-67, -120)]), "#D9DCE4", 0.6)
        c.drawPath(rrect(-48, -116, -40, -102, 3), D.line(1.6, INK))
        c.drawRect(R(-61, -124, -55, -120), fill("#2A2D3A"))
        c.drawCircle(-64, -100, 1.3, fill("#3F6FA0"))
        # the microwave, its clock on 12:40
        D.shape(c, rrect(-26, -136, 34, -96, 2), "#E4E7EC", 0.7)
        D.shape(c, rrect(-22, -132, 14, -100, 1.5), "#2A2D3A", 0.5)
        c.drawRect(R(18, -128, 30, -122), fill("#10301E"))
        # the coffee machine: the one from the "Coffee run"
        D.shape(c, rrect(62, -160, 112, -96, 3), "#2B2F3A", 0.8)
        D.shape(c, rrect(68, -154, 106, -136, 2), "#11141B", 0.5)
        c.drawRect(R(72, -150, 102, -140), fill("#3A2010"))
        c.drawRect(R(80, -126, 94, -116), fill("#1B1F2A"))
        D.shape(c, rrect(78, -104, 96, -96, 1), "#F2EFE6", 0.4)
        c.drawCircle(102, -128, 2, fill("#5A1E24"))
        # a roll of kitchen paper and a box of tea bags
        D.shape(c, rrect(124, -116, 136, -96, 2), "#F2EFE6", 0.4)
        D.shape(c, rrect(-84, -108, -74, -96, 1), "#B4532A", 0.3)
    else:
        Hd.glow(c, 24, -125, 8, "#3DFF9A", 0.85)
        c.drawRect(R(72, -150, 102, -140), fill("#FF9A4A", 0.35))
        Hd.glow(c, 87, -145, 22, "#FFAA5A", 0.4)
        Hd.glow(c, 102, -128, 6, "#FF3A4A", 0.8)
        Hd.glow(c, -64, -100, 5, "#5BA8FF", 0.8)


def fridge(c):
    """The kitchen fridge, its door papered with notes."""
    if not A():
        return
    D.shape(c, rrect(-32, -196, 32, 0, 4), "#E4E7EC", 0.9)
    c.drawLine(-32, -128, 32, -128, D.line(0.9, "#8E939E"))
    c.drawRect(R(22, -184, 26, -140), fill("#9AA3B8"))
    c.drawRect(R(22, -118, 26, -84), fill("#9AA3B8"))
    for (nx, nz, col, rot) in ((-24, -180, "#F6D36B", -6), (-6, -170, "#9FD6CF", 4), (-22, -154, "#F2C9C0", 3), (-4, -146, "#F2EFE6", -4),
                              (-20, -112, "#F6D36B", 5), (2, -100, "#F2EFE6", -3)):
        c.save()
        c.rotate(rot, nx + 7, nz + 7)
        c.drawRect(R(nx, nz, nx + 15, nz + 14), fill(col))
        c.drawRect(R(nx, nz, nx + 15, nz + 14), D.line(0.25, INK))
        c.drawRect(R(nx + 2, nz + 4, nx + 13, nz + 5), fill("#5A5D64", 0.5))
        c.drawRect(R(nx + 2, nz + 8, nx + 10, nz + 9), fill("#5A5D64", 0.5))
        c.restore()
        c.drawCircle(nx + 7, nz + 1.5, 1.4, fill("#D6312F"))


def kitchen_table(c):
    if not A():
        return
    D.shape(c, rrect(-34, -74, 34, -69, 2), "#C9A877", 0.6)
    c.drawRect(R(-3, -69, 3, -4), fill("#3A3E4A"))
    D.shape(c, rrect(-18, -4, 18, 0, 1.5), "#3A3E4A", 0.4)
    D.shape(c, rrect(-6, -84, 4, -74, 1), "#F2EFE6", 0.4)   # somebody's mug, left out


def draw_kitchen(c):
    """The staff kitchen: bright, tiled, the kettle still warm."""
    x0, x1, z0, z1 = NEW["kitchen"]
    w, h = x1 - x0, z1 - z0
    with P2(c, x0, z0) as p:
        if A():
            p.rect(0, 0, w, h, fill("#A9B49E"))
            p.rect(0, 96, 320, 150, fill("#E6E1D2"))     # the splashback tiles
            for i in range(32):
                p.rect(i * 10, 96, i * 10 + 0.5, 150, fill("#B8B2A2"))
            for j in range(6):
                p.rect(0, 96 + j * 9, 320, 96.5 + j * 9, fill("#B8B2A2"))
            # wall cupboards and the mug rack
            for k in range(3):
                p.rect(14 + k * 62, 166, 72 + k * 62, 232, fill("#E4E7EC"))
                p.rect(14 + k * 62, 166, 72 + k * 62, 232, D.line(0.8, INK))
                p.rect(60 + k * 62, 172, 64 + k * 62, 190, fill("#8E939E"))
            p.rect(206, 176, 300, 180, fill("#7A5A3E"))
            for k, col in enumerate(["#D6312F", "#F2EFE6", "#3F6FA0", "#F2B33D", "#3FB8AF", "#F2EFE6"]):
                mx = 214 + k * 14
                p.rect(mx, 160, mx + 9, 172, fill(col))
                p.rect(mx, 160, mx + 9, 172, D.line(0.3, INK))
                p.c.drawLine(mx + 4.5, 176, mx + 4.5, 172, D.line(0.6, "#3A3E4A"))
            # a rota and a "please wash your mug" sign
            p.rect(232, 196, 280, 232, fill("#F2EFE6"))
            p.rect(232, 196, 280, 232, D.line(0.5, INK))
            for k in range(5):
                p.rect(236, 224 - k * 6, 276 - (k % 2) * 10, 225 - k * 6, fill("#5A5D64", 0.5))
            p.rect(0, h - CEIL, w, h, fill("#C9CDD6"))
            for cx in (104.0, 294.0):
                p.rect(cx - 50, h - CEIL + 2, cx + 50, h - 2, fill("#FFFDF2"))
        else:
            for cx in (104.0, 294.0):
                p.c.drawCircle(cx, h - 8, 80, radial((cx, h - 8), 80, [(0, "#FFF6DC", 0.5), (1, "#FFF6DC", 0.0)], blend=PLUS))
    if A():
        shell(c, NEW["kitchen"], floor_tex="vinyl", tile=36.0, trim="#4A5268", ceiling=False)
    put(c, x0 + 160, z0, kitchen_counter, 150)
    put(c, x0 + 356, z0, fridge, 34)


def lockers(c):
    if not A():
        return
    for k in range(3):
        lx = -45 + k * 30
        D.shape(c, rrect(lx, -190, lx + 30, 0, 1.5), "#7E8BA0", 0.8)
        for j in range(4):
            c.drawRect(R(lx + 6, -180 + j * 4, lx + 24, -178.6 + j * 4), fill("#4A5268"))
        D.shape(c, rrect(lx + 22, -110, lx + 26, -92, 1), "#C9CDD6", 0.3)
        c.drawRect(R(lx + 8, -150, lx + 22, -142), fill("#F2EFE6"))
    D.shape(c, rrect(-28, -200, 2, -190, 1), "#2A2D3A", 0.4)   # a kit bag on top


def monitor_desk(c):
    """The security office's desk under the screens: the radio, a cold pizza, the tour wand's charger."""
    if A():
        D.shape(c, rrect(-124, -78, 124, -72, 1.5), "#59617D", 0.8)
        D.shape(c, rrect(-120, -72, -60, 0, 1), "#3E4560", 0.6)
        for k in range(3):
            D.shape(c, rrect(-116, -68 + k * 22, -64, -50 + k * 22, 1), "#4A5270", 0.4)
        c.drawRect(R(110, -72, 116, 0), fill("#2C3148"))
        D.shape(c, rrect(-40, -82, 20, -78, 0.8), "#2A2D3A", 0.4)        # keyboard
        D.shape(c, rrect(-56, -96, -46, -78, 1.5), "#2A2D3A", 0.5)       # the radio on its charger
        c.drawRect(R(-53, -104, -51, -96), fill("#2A2D3A"))
        c.drawCircle(-51, -82, 1.1, fill("#1E5A2E"))
        D.shape(c, rrect(36, -82, 96, -78, 0.6), "#C9A877", 0.5)         # the pizza box, lid up
        D.shape(c, poly([(36, -82), (96, -82), (92, -112), (40, -112)]), "#B8935F", 0.5)
        c.drawPath(poly([(48, -80), (68, -80), (58, -88)]), fill("#E8B04A"))
        D.shape(c, rrect(100, -84, 108, -78, 1), "#3A3E4A", 0.3)         # the tour wand's dock
        c.drawCircle(104, -86, 1.1, fill("#1E5A2E"))
    else:
        Hd.glow(c, -51, -82, 5, "#3DFF9A", 0.8)
        Hd.glow(c, 104, -86, 5, "#3DFF9A", 0.8)


def draw_security(c):
    """The security office behind reception: a bank of camera screens in the dark, lockers, the rounds clipboard."""
    x0, x1, z0, z1 = NEW["security"]
    w, h = x1 - x0, z1 - z0
    with P2(c, x0, z0) as p:
        if A():
            p.rect(0, 0, w, h, fill("#55617A"))
            p.rect(0, 0, w, 100, fill("#3B4660"))
            p.rect(0, 98, w, 103, fill("#22293F"))
            # the screens: six on a frame. Only the first is a camera, the lobby's (the only one the case file has); the
            # rest are the building's own panels: server temperature, the weather, the printers, the kitchen, the lights.
            p.rect(150, 116, 382, 240, fill("#1B1F2A"))
            for i in range(3):
                for j in range(2):
                    sx0, sz0 = 156 + i * 76, 122 + j * 58
                    k = i + (1 - j) * 3
                    p.rect(sx0, sz0, sx0 + 70, sz0 + 52, fill("#2A2E38"))
                    p.rect(sx0 + 3, sz0 + 3, sx0 + 67, sz0 + 49, linear((0, sz0), (0, sz0 + 52), [(0, "#33405E", 1.0), (1, "#1C2438", 1.0)]))
                    p.rect(sx0 + 3, sz0 + 3, sx0 + 67, sz0 + 49, D.line(0.4, INK))
                    p.rect(sx0 + 6, sz0 + 42, sx0 + 30, sz0 + 45, fill("#9FB2E0", 0.7))   # the panel's title strip
                    if k == 0:   # the lobby camera: the desk and the doors from the ceiling
                        p.poly([(sx0 + 8, sz0 + 38), (sx0 + 62, sz0 + 38), (sx0 + 54, sz0 + 20), (sx0 + 16, sz0 + 20)], fill("#4A5878", 0.9))
                        p.rect(sx0 + 22, sz0 + 8, sx0 + 46, sz0 + 16, fill("#56688C", 0.9))
                        p.rect(sx0 + 52, sz0 + 6, sx0 + 62, sz0 + 18, fill("#7C8AA8", 0.8))
                    elif k == 1:   # a temperature line
                        pts = [(6, 14), (16, 18), (26, 16), (36, 24), (46, 20), (56, 28), (64, 26)]
                        for (ax, az), (bx, bz) in zip(pts, pts[1:]):
                            p.c.drawLine(sx0 + ax, sz0 + az, sx0 + bx, sz0 + bz, D.line(1.4, "#7EF0C6"))
                    elif k == 2:   # the weather radar
                        p.c.drawCircle(sx0 + 35, sz0 + 24, 15, D.line(0.8, "#3FB8AF"))
                        p.c.drawCircle(sx0 + 35, sz0 + 24, 7, D.line(0.8, "#3FB8AF"))
                        p.c.drawCircle(sx0 + 28, sz0 + 28, 8, fill("#3FB8AF", 0.45))
                    elif k == 3:   # the printers' queue
                        for r in range(3):
                            p.rect(sx0 + 8, sz0 + 30 - r * 9, sx0 + 46, sz0 + 34 - r * 9, fill("#56688C"))
                            p.c.drawCircle(sx0 + 56, sz0 + 32 - r * 9, 2.4, fill("#3DD68C"))
                    elif k == 4:   # the kitchen fridge's temperature
                        p.rect(sx0 + 26, sz0 + 8, sx0 + 42, sz0 + 38, fill("#C9CDD6", 0.8))
                        p.rect(sx0 + 26, sz0 + 26, sx0 + 42, sz0 + 27, fill("#56688C"))
                    else:   # the lights, all on
                        for r in range(4):
                            p.c.drawCircle(sx0 + 14 + r * 14, sz0 + 24, 4, fill("#F6D36B", 0.85))
            # the rounds clipboard on its hook, and the door through to the lobby
            p.rect(392, 136, 424, 180, fill("#8A6A4A"))
            p.rect(394, 138, 422, 176, fill("#F2EFE6"))
            for k in range(6):
                p.rect(398, 168 - k * 5, 418 - (k % 3) * 4, 169 - k * 5, fill("#5A5D64", 0.6))
            p.rect(402, 176, 414, 182, fill("#9AA3B8"))
            p.rect(440, 6, 500, 214, fill("#C9CDD6"))
            p.rect(440, 6, 500, 214, D.line(1.0, INK))
            p.rect(444, 6, 496, 210, fill("#5E6676"))
            p.rect(452, 132, 488, 176, fill("#E8D8B8"))
            p.rect(452, 132, 488, 176, D.line(0.6, INK))
            p.rect(484, 98, 492, 102, fill("#C9CDD6"))
            p.rect(448, 222, 492, 238, fill("#2C3266"))
            p.rect(448, 222, 492, 238, D.line(0.6, INK))
            p.rect(0, h - CEIL, w, h, fill("#9AA0AD"))
            p.rect(100, h - CEIL + 2, 220, h - 2, fill("#FFFDF2"))
        else:
            for i in range(3):
                for j in range(2):
                    sx0, sz0 = 156 + i * 76, 122 + j * 58
                    p.rect(sx0 + 3, sz0 + 3, sx0 + 67, sz0 + 49, fill("#6E8EFF", 0.18))
            p.c.drawCircle(266, 178, 150, radial((266, 178), 150, [(0, "#7FA2FF", 0.22), (1, "#7FA2FF", 0.0)], blend=PLUS))
            p.rect(452, 132, 488, 176, fill("#FFE6B0", 0.30))   # the lobby's light through the door's window
            p.c.drawCircle(160, h - 8, 70, radial((160, h - 8), 70, [(0, "#FFF6DC", 0.4), (1, "#FFF6DC", 0.0)], blend=PLUS))
    if A():
        shell(c, NEW["security"], floor_tex="block", tile=50.0, trim="#22293F", ceiling=False)
        wtext(c, "LOBBY", x0 + 470, z0 + 226.5, 7.5, CREAM, tracking=0.8)
    put(c, x0 + 66, z0, lockers, 50)
    put(c, x0 + 266, z0, monitor_desk, 130)
    put(c, x0 + 230, z0, office_chair, 28)


def bike_rack(c):
    if not A():
        return
    for k in range(3):
        hoop = skia.Path()
        hoop.addArc(R(-50 + k * 36, -78, -22 + k * 36, -22), 180, 180)
        c.drawPath(hoop, D.line(3.0, "#8E939E"))
        c.drawLine(-50 + k * 36, -50, -50 + k * 36, 0, D.line(3.0, "#8E939E"))
        c.drawLine(-22 + k * 36, -50, -22 + k * 36, 0, D.line(3.0, "#8E939E"))
    # one bike, chained up for the night
    for wx in (-34, 22):
        c.drawCircle(wx, -26, 24, D.line(2.2, "#1B1F2A"))
        c.drawCircle(wx, -26, 3, fill("#1B1F2A"))
    c.drawPath(poly([(-34, -26), (-6, -26), (8, -56), (-18, -56)]), D.line(2.2, "#3F6FA0"))
    c.drawLine(8, -56, 22, -26, D.line(2.2, "#3F6FA0"))
    c.drawLine(-18, -56, -22, -64, D.line(2.2, "#3F6FA0"))
    c.drawLine(-28, -64, -16, -64, D.line(3.0, "#1B1F2A"))
    c.drawLine(8, -56, 6, -70, D.line(2.2, "#3F6FA0"))
    c.drawLine(0, -70, 12, -72, D.line(2.2, "#1B1F2A"))


def bin_post(c):
    if not A():
        return
    c.drawRect(R(-3, -40, 3, 0), fill("#3A3E4A"))
    D.shape(c, rrect(-16, -96, 16, -40, 3), "#2E4A3E", 0.8)
    c.drawRect(R(-12, -90, 12, -84), fill("#1B1F2A"))


def draw_canopy(c):
    """The covered way in under the kitchen: dark cladding, a downlight, the bike rack and a bin."""
    x0, x1, z0, z1 = CANOPY
    w, h = x1 - x0, z1 - z0
    with P2(c, x0, z0) as p:
        if A():
            p.rect(0, 0, w, h, fill("#343A4A"))
            for k in range(10):
                p.rect(k * 40, 0, k * 40 + 1.2, h, fill("#262B38"))
            p.rect(0, 120, w, 121.5, fill("#262B38"))
            p.rect(0, 0, w, 10, fill("#8E877C"))
            p.rect(0, h - 14, w, h, fill("#262A34"))     # the soffit: the kitchen's floor from below
            p.rect(150, h - 15, 210, h - 13, fill("#FFFDF2"))
            # MAIN ENTRANCE on a lit panel, and a doormat outside the glass
            p.rect(36, 196, 196, 226, fill("#1E2230"))
            p.rect(36, 196, 196, 226, D.line(0.8, INK))
            p.rect(0, 1, 70, 7, fill("#3A3C44"))
        else:
            p.c.drawCircle(180, h - 14, 140, radial((180, h - 14), 140, [(0, "#FFE8B8", 0.30), (1, "#FFE8B8", 0.0)], blend=PLUS))
            p.rect(36, 196, 196, 226, fill("#FFE2A8", 0.12))
    if A():
        wtext(c, "MAIN ENTRANCE", x0 + 116, z0 + 205.5, 13.0, "#F2E6D2", tracking=1.0)
    else:
        wtext(c, "MAIN ENTRANCE", x0 + 116, z0 + 205.5, 13.0, "#FFD58A", tracking=1.0, a=0.5, blur=2.0)
    put(c, x0 + 270, z0, bike_rack, 70)
    put(c, x0 + 360, z0, bin_post, 20)


def draw_edges(c):
    """The cut: cream edges round every room, the plinth, the parapet, the glass entrance seen edge on."""
    doors_first = (516.0, 1040.0, 1660.0)    # open doorways on the first floor: office|Lab 4|corridor|kitchen
    with P2(c) as p:
        if A():
            edge, dark = D.EDGE, D.shade(D.EDGE, 0.78)
            p.rect(-18, -40, BX1 + 4, 0, fill("#8E877C"))
            p.rect(-18, -6, BX1 + 4, 0, fill("#A8A094"))
            for z in (280.0, 580.0):
                p.rect(-14, z, BX1, z + 20, fill(edge))
                p.rect(-14, z, BX1, z + 2.5, fill(dark))
                p.rect(-14, z + 17.5, BX1, z + 20, fill(D.shade(edge, 0.9)))
            p.rect(-14, -6, 8, 600, fill(edge))
            p.rect(6, -6, 8, 600, fill(dark))
            # the kitchen's outer wall, and the column holding it up over the entrance
            p.rect(2076, 280, BX1, 600, fill(edge))
            p.rect(2076, 280, 2078, 600, fill(dark))
            p.rect(2078, -6, 2096, 280, fill(D.shade(edge, 0.92)))
            p.rect(2078, -6, 2080, 280, fill(dark))
            # first floor: open doorways (a header over each, dark frame lines)
            for x in doors_first:
                p.rect(x, 516, x + 16, 580, fill(edge))
                p.rect(x + 14, 516, x + 16, 580, fill(dark))
                p.rect(x - 2, 300, x + 2, 516, fill("#3A3040"))
                p.rect(x + 14, 300, x + 18, 520, fill("#3A3040"))
            # ground: the maker space's wall (its door is shut for the night), the security office's doorway, the glass entrance
            p.rect(516, 0, 532, 280, fill(edge))
            p.rect(530, 0, 532, 280, fill(dark))
            p.rect(1040, 216, 1056, 280, fill(edge))
            p.rect(1054, 216, 1056, 280, fill(dark))
            p.rect(1038, 0, 1042, 216, fill("#3A3040"))
            p.rect(1054, 0, 1058, 220, fill("#3A3040"))
            p.rect(1660, 228, 1676, 280, fill(edge))
            p.rect(1660, 228, 1662, 280, fill(dark))
            p.rect(1660, 220, 1676, 229, fill("#3C3F48"))
            for x in (1662.0, 1671.0):
                p.rect(x, 0, x + 2.2, 220, fill("#BFE3FF", 0.6))
            p.rect(-20, 600, BX1 + 6, 640, fill(edge))
            p.rect(-20, 600, BX1 + 6, 603, fill(dark))
            p.rect(-26, 636, BX1 + 12, 646, fill("#8C8478"))
        else:
            p.rect(1662, 0, 1673, 220, fill("#9FC8FF", 0.06))
    put(c, 160, 640, hvac)
    put(c, 1880, 640, hvac)
    put(c, 1488, 640, antenna)
    if A():
        with P2(c) as p:
            for x in (870.0, 1230.0):
                p.rect(x - 3, 646, x + 3, 656, fill("#3A3E4A"))
            p.rect(860, 654, 1240, 658, fill("#3A3E4A"))
        wtext(c, "HALDEN INNOVATION", 1050, 662, 30.0, "#E9E1D0", tracking=2.0)
    else:
        wtext(c, "HALDEN INNOVATION", 1050, 662, 30.0, "#FFD58A", tracking=2.0, a=0.9, blur=3.0)
        wtext(c, "HALDEN INNOVATION", 1050, 662, 30.0, "#FFE6B8", tracking=2.0, a=0.55)


# Outside: the car park and the North Gate, east of the covered entrance.
CAR_A, CAR_B = 2290.0, 2620.0
SIGN_X = 2842.0                     # the visitors' sign; the lamp, the camera, the barrier and the gatehouse follow it
LAMP_X, ANPR_X, BARRIER_X, GATE_X = SIGN_X + 34, SIGN_X + 74, SIGN_X + 152, SIGN_X + 196


def car_b(c):
    """A second staff car: a small olive hatch, nose to the building."""
    if not A():
        return
    c.save()
    c.scale(-0.86, 0.86)
    car(c, "#55603A")
    c.restore()


def draw_world(c):
    """Sky, moon, the city behind, the street, the car park and the North Gate."""
    if A():
        c.drawRect(R(0, 0, W, H), linear((0, 0), (0, H), [(0, "#05070F", 1.0), (0.35, "#0E1430", 1.0), (0.7, "#1C2048", 1.0), (1, "#120E1E", 1.0)]))
        rng = np.random.default_rng(7)
        for _ in range(210):
            x, y = float(rng.uniform(0, W)), float(rng.uniform(0, sy(420)))
            c.drawCircle(x, y, float(rng.uniform(0.5, 1.5)) * P, fill("#DDE6FF", float(rng.uniform(0.2, 0.7))))
        for x, z, r, a in ((80, 690, 170, 0.55), (520, 740, 210, 0.5), (1050, 650, 200, 0.5), (1420, 735, 160, 0.45),
                           (1900, 700, 190, 0.5), (2400, 745, 170, 0.45), (2950, 680, 200, 0.5)):
            cl = fill("#2A3260", a)
            cl.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, r * P * 0.35))
            c.drawOval(R(sx(x - r * 1.6), sy(z + r * 0.45), sx(x + r * 1.6), sy(z - r * 0.45)), cl)
        mx, mz = 2500.0, 700.0
        c.drawCircle(sx(mx), sy(mz), 34 * P, fill("#F2EBD8"))
        c.drawCircle(sx(mx - 10), sy(mz + 8), 7 * P, fill("#DCD3BC"))
        c.drawCircle(sx(mx + 12), sy(mz - 10), 5 * P, fill("#DCD3BC"))
        rng = np.random.default_rng(17)
        x = XMIN - 20
        while x < XMAX + 20:
            bw, bh = float(rng.uniform(50, 120)), float(rng.uniform(160, 460))
            c.drawRect(R(sx(x), sy(bh), sx(x + bw), sy(0)), fill("#0C0F22"))
            x += bw + float(rng.uniform(-10, 8))
        c.drawRect(R(0, sy(0), W, H), fill("#1E2029"))
        c.drawRect(R(0, sy(0), W, sy(-16)), fill("#3E404A"))
        c.drawRect(R(0, sy(-16), W, sy(-19)), fill("#5E606A"))
        c.drawRect(R(sx(BX1), sy(0), sx(XMAX), H), D.tex("asphalt", 90.0))
        for k in range(20):
            c.drawRect(R(sx(-40 + k * 170), sy(-46), sx(40 + k * 170), sy(-49)), fill("#C9C2A0", 0.45))
        for bx in (2120.0, 2455.0, 2790.0):   # the bays' white lines, end on
            c.drawRect(R(sx(bx - 3), sy(-2), sx(bx + 3), sy(-30)), fill("#D9D6CE", 0.7))
        for k, (px, pw) in enumerate(((262, 120), (786, 130), (1358, 170), (1880, 120), (2400, 150))):
            c.drawOval(R(sx(px - pw), sy(-32 - (k % 3) * 6), sx(px + pw), sy(-50 - (k % 3) * 6)), fill("#141A36", 0.9))
    else:
        c.save()
        c.clipRect(R(sx(-30), sy(780), sx(BX1 + 10), sy(-40)), skia.ClipOp.kDifference, True)
        Hd.glow(c, sx(2500), sy(700), 230 * P, "#B8C8FF", 0.3)
        rng = np.random.default_rng(17)
        x = XMIN - 20
        while x < XMAX + 20:
            bw, bh = float(rng.uniform(50, 120)), float(rng.uniform(160, 460))
            for _ in range(int(bh // 34)):
                if rng.random() < 0.45:
                    wx, wz = x + float(rng.uniform(6, bw - 10)), float(rng.uniform(20, bh - 10))
                    c.drawRect(R(sx(wx), sy(wz + 6), sx(wx + 5), sy(wz)), fill("#FFCF6B", float(rng.uniform(0.35, 0.8))))
            x += bw + float(rng.uniform(-10, 8))
        c.restore()
        for k, (px, pw) in enumerate(((262, 120), (786, 130), (1358, 170), (1880, 120), (2400, 150))):   # the lit rooms in the puddles
            c.drawOval(R(sx(px - pw * 0.8), sy(-34 - (k % 3) * 6), sx(px + pw * 0.8), sy(-48 - (k % 3) * 6)), fill("#FFCF6B", 0.13))
    for x, fn in ((-38.0, Hd.bare_tree), (LAMP_X, Hd.street_lamp)):
        c.save()
        c.translate(sx(x), sy(0))
        c.scale(P, P)
        fn(c)
        c.restore()
    put(c, CAR_A, -6, car, 150)
    put(c, CAR_B, -6, car_b, 130)
    put(c, SIGN_X, -6, visitor_sign)
    put(c, ANPR_X, -6, anpr_pole)
    put(c, BARRIER_X, -6, barrier)
    put(c, GATE_X, -6, gatehouse, 50)
    if A():
        wtext(c, "VISITORS", SIGN_X, 145, 7.0, CREAM, tracking=0.6)
        wtext(c, "NORTH GATE", GATE_X, 254, 9.0, CREAM, tracking=1.0)


LEGACY = (("maker", "draw_maker"), ("lobby", "draw_lobby"), ("lab4", "draw_lab4"), ("corridor", "draw_corridor"))
FRESH = (("office", draw_office), ("kitchen", draw_kitchen), ("security", draw_security))


def scene(c):
    draw_world(c)
    rooms = [(name, globals()[fn], SHIFT[name]) for name, fn in LEGACY] + [(name, fn, 0.0) for name, fn in FRESH]
    for name, fn, dx in rooms:
        x0, x1, z0, z1 = NEW[name]
        if not A():   # a room's own glow never spills over its walls
            c.save()
            c.clipRect(R(sx(x0), sy(z1), sx(x1), sy(z0)))
        c.save()
        c.translate(dx * P, 0)
        fn(c)
        c.restore()
        if not A():
            c.restore()
    draw_canopy(c)
    draw_edges(c)


def light_scene(c):
    c.drawRect(R(0, 0, W, H), fill(lhex((0.84, 0.86, 0.98))))
    c.drawRect(R(sx(-30), sy(780), sx(BX1 + 6), sy(280)), fill(lhex((0.70, 0.70, 0.78))))
    c.drawRect(R(sx(-30), sy(280), sx(1676), sy(-40)), fill(lhex((0.70, 0.70, 0.78))))
    for name, (x0, x1, z0, z1) in NEW.items():
        amb, lamps = LIGHTS[name]
        rect = R(sx(x0), sy(z1), sx(x1), sy(z0))
        c.save()
        c.clipRect(rect)
        c.drawRect(rect, fill(lhex(amb)))
        for (x, z, rad, colr) in lamps:
            cx, cy, r = sx(x), sy(z), rad * P
            add = tuple(max(0.0, colr[i] - amb[i]) for i in range(3))
            c.drawCircle(cx, cy, r, radial((cx, cy), r, [(0, lhex(add), 1.0), (0.55, lhex(tuple(v * 0.45 for v in add)), 1.0), (1, "#000000", 1.0)], blend=PLUS))
        c.restore()
    for (x, z, rad, colr) in ((LAMP_X + 3, 40, 240, (0.62, 0.52, 0.32)), (GATE_X, 90, 150, (0.50, 0.40, 0.22)), (1856, 250, 190, (0.55, 0.48, 0.34))):
        cx, cy, r = sx(x), sy(z), rad * P
        c.drawCircle(cx, cy, r, radial((cx, cy), r, [(0, lhex(colr), 1.0), (1, "#000000", 1.0)], blend=PLUS))


def render(fn):
    surf = skia.Surface(W, H)
    c = surf.getCanvas()
    c.clear(skia.ColorBLACK)
    fn(c)
    rgba = surf.makeImageSnapshot().toarray(colorType=skia.kRGBA_8888_ColorType)
    return rgba[..., :3].astype(np.float32) / 255.0


def plate():
    Hd.MODE = "albedo"
    albedo = render(scene)
    light = render(light_scene) * 2.0
    Hd.MODE = "emit"
    emit = render(scene)
    Hd.MODE = "albedo"
    img = albedo * light + emit * 1.1
    del albedo, light, emit
    look = Look(bloom=0.42, bloom_threshold=0.74, halation=0.1, shadow_tint=(0.0, 0.006, 0.024), highlight_tint=(1.04, 1.0, 0.94),
                contrast=1.07, saturation=1.06, fringe=0.25, vignette=0.18, grain=0.014, flicker=0.0)
    img = finish(np.clip(img, 0, 2), 0, look, exposure=1.1)
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)


def world_info():
    """Positions in world cm for the game data (feet are where a sprite's feet go)."""
    L, M = SHIFT["lab4"], SHIFT["maker"]
    E = L + LOBBY_EAST

    def lab(px, py):
        return round(LAB_X0 + L - 0.3 + px * LAB_K, 1), round(ROOMS["lab4"][3] - CEIL - (py - 58) * LAB_K, 1)

    def desk(px, py):
        return round(LOB_X + L + px * LOB_K, 1), round(6 + (816 - py) * LOB_K, 1)

    def east(px, py):
        return round(LOB_X + E + px * LOB_K, 1), round(6 + (816 - py) * LOB_K, 1)

    def wall_e(px, py):
        return round(LOB_X + E + px * LOB_K, 1), round(FB + (640 - py) * LOB_K, 1)

    return {
        "extent": [XMIN, XMAX, ZMIN, ZMAX], "plate": [W, H], "px_per_cm": P,
        "rooms": {**NEW, "outside": [1680.0, XMAX - 4, 0.0, 300.0]},
        "shift": SHIFT, "lobby_east": LOBBY_EAST,
        "feet": {   # floor z + 6, where put() stands things
            "mei": [165 + L, 306], "priya": [300 + L, 306], "jo": [388 + L, 306],
            "sam": [630 + L, 306], "rena": [800 + L, 306],
            "ali": [600 + L, 6], "ozzy": [748 + L, 40], "squires": [886 + E, 6],
        },
        "halo_tray": [*lab(145, 470), *lab(390, 362)],
        "halo": [*lab(170, 441), *lab(365, 390)],
        "laptop_screen": [200.5 + L, 414.5, 257 + L, 449],
        "doors": {"office_lab": [516, 306, 532, 516], "lab_corridor": [1040, 306, 1056, 516], "corridor_kitchen": [1660, 306, 1676, 516],
                  "maker_security": [516, 6, 532, 216], "security_lobby": [1040, 6, 1056, 216], "exit": [1660, 0, 1676, 220]},
        "lab_reader": [524 + L, 418, 534 + L, 440],
        "lobby_reader": [*wall_e(948, 412), *wall_e(978, 348)],
        "stairs": {"top": [456 + L, 306], "landing": [548 + L, 156], "foot": [456 + L, 6]},
        "desk_front": [desk(20, 816), desk(594, 816), desk(594, 594), desk(560, 548), desk(426, 548), desk(426, 498), desk(378, 498),
                       desk(374, 548), desk(374, 470), desk(366, 454), desk(338, 454), desk(330, 470), desk(330, 548),
                       desk(266, 548), desk(266, 448), desk(116, 448), desk(116, 548), desk(44, 548), desk(20, 594)],
        "monitors": [*desk(116, 556), *desk(266, 448)],
        "tv_phone": [*desk(378, 566), *desk(426, 498)],
        "vending": [*east(806, 626), *east(944, 214)],
        "exit_sign": [898 + E, 245.6, 944.2 + E, 263],
        "lobby_camera": [856 + E, 249, 892 + E, 276],
        "kitchen_door": [964 + L, 306, 1030 + L, 516],
        "fuse_cupboard": [922 + L, 450, 949 + L, 506],
        "office": {"filing_cabinet": [196, 306], "bookcase": [262, 306], "demo_case": [324, 306], "desk": [420, 306], "fern": [476, 306],
                   "screen": [370, 396, 442, 436], "window": [38, 414, 160, 532], "sketch": [316, 454, 380, 514]},
        "kitchen": {"counter": [1836, 306], "coffee": [1898, 402, 1948, 466], "kettle": [1766, 402, 1790, 430], "fridge": [2032, 306],
                    "microwave_clock": [1854, 428, 1866, 434], "mugs": [1890, 460, 1976, 480], "rota": [1908, 496, 1956, 532]},
        "security": {"lockers": [598, 6], "desk": [798, 6], "screens": [682, 116, 914, 240], "clipboard": [924, 136, 956, 180],
                     "pizza": [834, 84, 894, 118], "door": [972, 6, 1032, 214]},
        "canopy": {"bike_rack": [1946, 6], "bin": [2036, 6], "sign": [1712, 196, 1872, 226]},
        "maker_rack": [-32 + M, 6],
        "glows": {"lab_strip_l": [110 + L, 573], "lab_strip_r": [320 + L, 573], "printers": [118 + M, 80], "laser": [330 + M, 46],
                  "roof_light": [1488, 772], "gatehouse": [GATE_X, 163], "anpr": [ANPR_X - 60, 324], "lamp": [LAMP_X + 27, 389]},
        "cars": [[CAR_A - 145, -6, CAR_A + 147, 114], [CAR_B - 126, -6, CAR_B + 126, 98]],
        "gate": [BARRIER_X - 86, -6, GATE_X + 42, 262],
        "booth": [GATE_X - 36, -6, GATE_X + 36, 234],
        "anpr_pole": [ANPR_X - 64, 0, ANPR_X + 3, 330],
    }


if __name__ == "__main__":
    from PIL import Image
    img = plate()
    name = "world-draft.png" if DRAFT else "world.png"
    path = os.path.join(HERE, name)
    Image.fromarray(img).save(path)
    print(path, img.shape)
    if not DRAFT:
        Image.fromarray(img).save(os.path.join(HERE, "world.webp"), "WEBP", quality=90, method=6)
        with open(os.path.join(HERE, "world.json"), "w") as f:
            json.dump(world_info(), f, indent=1)
        print(os.path.getsize(os.path.join(HERE, "world.webp")))
