"""Case 001's world: the Halden Innovation Building at 12:40 AM, a flat 2D cutaway painted at close-up size.

    python world.py draft    # quick check at 0.8 px/cm
    python world.py          # 2 px/cm plate and world.json (positions in world cm)

Lab 4 and the lobby reuse the evidence-photo painters (omc_cinema/case001_photos.py), so the world shows the same
Cabinet B, clock, whiteboard, reception desk and drinks machine the players see in the photos. The rest is painted
here. Three passes, as on the Halden board: albedo x light + emission, then the film finish. People, ghosts and
anything that moves are left to the artboards.

World: x runs west to east in cm, z is height in cm, the ground is z = 0. Ground floor 0-280, first floor 300-580.
Lab 4 sits above the maker space; the corridor sits above the lobby and the stairs; the car park and the North Gate
are east of the glass entrance.
"""
from __future__ import annotations

import json
import os
import sys
from contextlib import contextmanager

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "dollhouse"))
DRAFT = len(sys.argv) > 1 and sys.argv[1] == "draft"

import halden as Hd  # noqa: E402  registers textures and puts omc_cinema on the path
from halden import D, PLUS, Look, R, fill, finish, lhex, linear, np, poly, radial, rrect, skia  # noqa: E402
from omc_cinema import case001_photos as PH  # noqa: E402
from omc_cinema.film import font, stroke, text  # noqa: E402
from omc_cinema.textures import surface, weave  # noqa: E402
from omc_art.palette import CREAM, INK  # noqa: E402

P = 0.8 if DRAFT else 2.0                       # plate px per cm
XMIN, XMAX, ZMIN, ZMAX = -60.0, 1560.0, -70.0, 780.0
W, H = round((XMAX - XMIN) * P), round((ZMAX - ZMIN) * P)
FB, CEIL = 18.0, 12.0                            # floor band and ceiling strip, cm
MINUTE = 220                                     # Lab 4's clock counts from 9:00: 12:40 AM
LAB_K = 250.0 / 942.0                            # cm per photo unit in Lab 4
LOB_K = 0.4                                      # cm per photo unit in the lobby
LOB_X = 560.0                                    # world x of the lobby photo's x = 0

ROOMS = {   # x0, x1, z0, z1 (inside the cut edges)
    "lab4": (8.0, 432.0, 300.0, 580.0),
    "maker": (8.0, 432.0, 0.0, 280.0),
    "corridor": (448.0, 952.0, 300.0, 580.0),
    "lobby": (448.0, 952.0, 0.0, 280.0),
}

LIGHTS = {  # ambient (r, g, b), lamps (x, z, radius cm, (r, g, b))
    "lab4": ((0.66, 0.70, 0.78), [(110, 565, 240, (1.10, 1.12, 1.16)), (320, 565, 240, (1.10, 1.12, 1.16)), (229, 425, 70, (0.80, 0.90, 1.30))]),
    "maker": ((0.20, 0.22, 0.33), [(110, 175, 210, (0.46, 0.58, 0.92)), (130, 110, 90, (0.36, 0.52, 1.05)), (330, 50, 70, (0.70, 0.30, 0.30))]),
    "corridor": ((0.34, 0.36, 0.47), [(640, 565, 220, (1.12, 1.04, 0.90)), (880, 565, 190, (1.05, 0.98, 0.86)), (481, 540, 90, (0.50, 1.10, 0.72))]),
    "lobby": ((0.50, 0.48, 0.50), [(640, 250, 210, (1.14, 1.06, 0.94)), (810, 250, 210, (1.14, 1.06, 0.94)), (910, 100, 120, (1.25, 1.08, 0.86)),
                                   (636, 132, 90, (0.72, 0.88, 1.25)), (500, 230, 150, (0.86, 0.86, 0.98))]),
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
    x0, x1, z0, z1 = ROOMS[name]
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


def car(c):
    """The car still in the car park: a small estate, side on, facing the gate."""
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
        D.shape(c, body, "#2E4A6E", 1.0)
        glass = skia.Path()
        glass.moveTo(-88, -80)
        glass.quadTo(-64, -112, -30, -113)
        glass.lineTo(50, -113)
        glass.quadTo(76, -111, 94, -82)
        glass.close()
        c.drawPath(glass, linear((0, -113), (0, -80), [(0, "#9FB4D6", 1.0), (1, "#3A4A6A", 1.0)]))
        c.drawPath(glass, D.line(0.8, INK))
        c.drawLine(4, -113, 6, -80, D.line(2.4, "#2E4A6E"))
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

def draw_lab4(c):
    x0, x1, z0, z1 = ROOMS["lab4"]
    if A():
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
    else:
        for x in (110, 320):   # the strip lights in the photo's ceiling
            wglow(c, x, 573, 60, "#FFFDF2", 0.5)
        wglow(c, 70, 465, 70, "#BFD8FF", 0.18)   # the light inside the cabinet
    put(c, 205, z0, lab_bench, 150)
    with photo(c, x0 - 0.3, z0 + 108 + (803 - 58) * LAB_K, LAB_K, 58, clip=(x0, z0, x1, z1)):
        if A():
            PH.oscilloscope(c, probe=False)
    if not A():   # the oscilloscope's trace
        wglow(c, 70, 425, 30, "#7DFFB0", 0.4)
    put(c, 205, z0 + 102, bench_things)
    put(c, 404, z0, office_chair, 28)


def draw_maker(c):
    x0, x1, z0, z1 = ROOMS["maker"]
    w, h = x1 - x0, z1 - z0
    with P2(c, x0, z0) as p:
        if A():
            p.rect(0, 0, w, h, D.tex("block", 60.0))
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
                p.rect(312, zz - 4, 420, zz, fill("#6B5640"))
                for k, col in enumerate(["#EF5B5B", "#F2EFE6", "#3FB8AF", "#F2B33D", "#9B87F5"]):
                    p.c.drawCircle(324 + k * 21, zz + 10, 9, fill(col))
                    p.c.drawCircle(324 + k * 21, zz + 10, 9, D.line(0.5, INK))
                    p.c.drawCircle(324 + k * 21, zz + 10, 3, fill("#1B1F2A"))
            # the sign
            p.rect(188, 226, 300, 250, fill("#F2EFE6"))
            p.rect(188, 226, 300, 250, D.line(0.9, INK))
        else:
            p.rect(52, 110, 158, 230, fill("#5D7BD8", 0.10))
    if A():
        wtext(c, "MAKER SPACE", x0 + 244, z0 + 240, 11.0, INK, tracking=1.0)
        wtext(c, "closed 8 PM - 8 AM", x0 + 244, z0 + 230, 6.5, "#5A5D64", face="type")
        room_shell(c, "maker", floor_tex="concrete", tile=50.0, trim="#3A3F4E", ceiling=True)
    put(c, 118, z0, printer_bench, 100)
    put(c, 330, z0, laser_cutter, 60)
    put(c, 236, z0, stool, 18)


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
            # ceiling panels, one switched off for the night
            p.rect(0, h - CEIL, w, h, fill("#C9CDD6"))
            p.rect(0, h - CEIL, w, h - CEIL + 1.5, fill("#8D93A3"))
            for k, cx in enumerate((92.0, 192.0, 312.0, 432.0)):
                p.rect(cx - 40, h - CEIL + 2, cx + 40, h - 2, fill("#FFFDF2" if k != 2 else "#9EA4B4"))
        else:
            p.c.drawCircle(81, 134, 8, radial((81, 134), 8, [(0, "#3DD68C", 0.9), (1, "#3DD68C", 0.0)], blend=PLUS))
            p.rect(10, 240, 56, 254, fill("#3DFF9A", 0.5))
            p.c.drawCircle(33, 247, 40, radial((33, 247), 40, [(0, "#3DFF9A", 0.35), (1, "#3DFF9A", 0.0)], blend=PLUS))
            for k, cx in enumerate((92.0, 192.0, 312.0, 432.0)):
                if k != 2:
                    p.c.drawCircle(cx, h - 8, 70, radial((cx, h - 8), 70, [(0, "#FFF6DC", 0.5), (1, "#FFF6DC", 0.0)], blend=PLUS))
    if A():
        wtext(c, "LAB 4", x0 + 95, z0 + 172, 12.0, CREAM, tracking=1.2)
        wtext(c, "LAB 3", x0 + 208, z0 + 226, 10.0, CREAM, tracking=1.0)
        wtext(c, "LAB 5", x0 + 432, z0 + 226, 10.0, CREAM, tracking=1.0)
        wtext(c, "STAIRS", x0 + 33, z0 + 243.5, 8.0, "#E8FFF2", tracking=0.8)
        room_shell(c, "corridor", floor_tex="vinyl", tile=44.0, trim="#22293F", ceiling=False)
    put(c, 920, z0, water_cooler, 24)
    put(c, 760, z0, bench_seat, 70)


def lobby_wall_photo(c):
    """The lobby's back wall in photo space (camera 2's wall, with warmer paint than the greyscale still shows)."""
    wall = PH.box(-320, 0, 1120, 640)
    c.drawPath(wall, linear((0, 0), (0, 640), [(0, "#C2B49C", 1), (1, "#9C8E78", 1)]))
    weave(c, wall, "paper", 1.3)
    c.drawRect(R(-320, 500, 1120, 640), surface("wood", 0.7))
    c.drawRect(R(-320, 500, 1120, 640), fill("#8A6A4A", 0.3))
    c.drawLine(-320, 500, 1120, 500, stroke(INK, 4))
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
            c.save()
            c.clipRect(R(940, 340, 986, 420))
            PH.exit_doors(c)           # the badge reader by the way out
            c.restore()
        stairs(c)
        with photo(c, 898 - 1176 * 0.3, z0 + 263, 0.3, 88, clip=(x0, z0, x1, z1)):
            c.clipRect(R(1166, 78, 1340, 156))
            PH.exit_doors(c)           # the lit EXIT sign
        room_shell(c, "lobby", floor_tex="lobbyfloor", tile=48.0, trim="#5A3A26", ceiling=True)
        with P2(c) as p:
            p.rect(896, 1, 952, 7, fill("#3A3C44"))
            for cx in (640.0, 810.0):
                p.rect(cx - 16, 270, cx + 16, 278, fill("#FFFDF2"))
    else:
        for cx in (640.0, 810.0):
            wglow(c, cx, 272, 70, "#FFF6E0", 0.38)
        wglow(c, 924, 254, 40, "#FFFFFF", 0.35)
        wglow(c, 945, 130, 8, "#3DD68C", 0.8)
    # standing things: the drinks machine, the wet floor cone, the umbrellas, then the desk in front
    if A():
        with photo(c, LOB_X, z0 + 6, LOB_K, 626, clip=(x0, z0, x1, z1)):
            c.clipRect(R(800, 204, 950, 632))
            PH.lobby_furniture(c)
        with photo(c, 845 - 1034 * LOB_K, z0 + 6, LOB_K, 880, clip=(x0, z0, x1, z1)):
            c.clipRect(R(1024, 740, 1116, 884))
            PH.wet_floor_cone(c)
        with photo(c, 920 - 1524 * LOB_K, z0 + 6, LOB_K, 660, clip=(x0, z0, x1, z1)):
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
        wglow(c, 910, 110, 70, "#FFE6B0", 0.3)     # the drinks machine
        wglow(c, 636, 132, 50, "#BFD8FF", 0.35)    # the monitor bank
        wglow(c, 721, 120, 14, "#BFD8FF", 0.4)     # the phone with the match on


def draw_edges(c):
    """The cut: cream edges round every room, the plinth, the parapet, the glass entrance seen edge on."""
    with P2(c) as p:
        if A():
            edge, dark = D.EDGE, D.shade(D.EDGE, 0.78)
            p.rect(-18, -40, 978, 0, fill("#8E877C"))
            p.rect(-18, -6, 978, 0, fill("#A8A094"))
            for z in (280.0, 580.0):
                p.rect(-14, z, 974, z + 20, fill(edge))
                p.rect(-14, z, 974, z + 2.5, fill(dark))
                p.rect(-14, z + 17.5, 974, z + 20, fill(D.shade(edge, 0.9)))
            p.rect(-14, -6, 8, 600, fill(edge))
            p.rect(6, -6, 8, 600, fill(dark))
            p.rect(952, 228, 974, 600, fill(edge))
            p.rect(952, 228, 954, 600, fill(dark))
            p.rect(432, 0, 448, 280, fill(edge))
            p.rect(446, 0, 448, 280, fill(dark))
            p.rect(432, 516, 448, 580, fill(edge))
            p.rect(446, 516, 448, 580, fill(dark))
            p.rect(430, 300, 434, 516, fill("#3A3040"))
            p.rect(446, 300, 450, 520, fill("#3A3040"))
            p.rect(952, 220, 974, 229, fill("#3C3F48"))
            for x in (956.0, 967.0):
                p.rect(x, 0, x + 2.2, 220, fill("#BFE3FF", 0.6))
            p.rect(-20, 600, 980, 640, fill(edge))
            p.rect(-20, 600, 980, 603, fill(dark))
            p.rect(-26, 636, 986, 646, fill("#8C8478"))
        else:
            p.rect(956, 0, 969, 220, fill("#9FC8FF", 0.06))
    put(c, 136, 640, hvac)
    put(c, 880, 640, antenna)
    if A():
        with P2(c) as p:
            for x in (330.0, 690.0):
                p.rect(x - 3, 646, x + 3, 656, fill("#3A3E4A"))
            p.rect(320, 654, 700, 658, fill("#3A3E4A"))
        wtext(c, "HALDEN INNOVATION", 510, 662, 30.0, "#E9E1D0", tracking=2.0)
    else:
        wtext(c, "HALDEN INNOVATION", 510, 662, 30.0, "#FFD58A", tracking=2.0, a=0.9, blur=3.0)
        wtext(c, "HALDEN INNOVATION", 510, 662, 30.0, "#FFE6B8", tracking=2.0, a=0.55)


def draw_world(c):
    """Sky, moon, the city behind, the street, the car park and the North Gate."""
    if A():
        c.drawRect(R(0, 0, W, H), linear((0, 0), (0, H), [(0, "#05070F", 1.0), (0.35, "#0E1430", 1.0), (0.7, "#1C2048", 1.0), (1, "#120E1E", 1.0)]))
        rng = np.random.default_rng(7)
        for _ in range(110):
            x, y = float(rng.uniform(0, W)), float(rng.uniform(0, sy(420)))
            c.drawCircle(x, y, float(rng.uniform(0.5, 1.5)) * P, fill("#DDE6FF", float(rng.uniform(0.2, 0.7))))
        for x, z, r, a in ((80, 690, 170, 0.55), (520, 740, 210, 0.5), (1050, 650, 200, 0.5), (1420, 735, 160, 0.45)):
            cl = fill("#2A3260", a)
            cl.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, r * P * 0.35))
            c.drawOval(R(sx(x - r * 1.6), sy(z + r * 0.45), sx(x + r * 1.6), sy(z - r * 0.45)), cl)
        mx, mz = 1250.0, 700.0
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
        c.drawRect(R(sx(974), sy(0), sx(XMAX), H), D.tex("asphalt", 90.0))
        for k in range(10):
            c.drawRect(R(sx(-40 + k * 170), sy(-46), sx(40 + k * 170), sy(-49)), fill("#C9C2A0", 0.45))
        for bx in (1000.0, 1300.0):   # the bays' white lines, end on
            c.drawRect(R(sx(bx - 3), sy(-2), sx(bx + 3), sy(-30)), fill("#D9D6CE", 0.7))
        for k, (px, pw) in enumerate(((180, 120), (620, 170), (1180, 140))):
            c.drawOval(R(sx(px - pw), sy(-32 - k * 6), sx(px + pw), sy(-50 - k * 6)), fill("#141A36", 0.9))
    else:
        c.save()
        c.clipRect(R(sx(-30), sy(780), sx(990), sy(-40)), skia.ClipOp.kDifference, True)
        Hd.glow(c, sx(1250), sy(700), 230 * P, "#B8C8FF", 0.3)
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
        for k, (px, pw) in enumerate(((180, 120), (620, 170), (1180, 140))):   # the lit rooms in the puddles
            c.drawOval(R(sx(px - pw * 0.8), sy(-34 - k * 6), sx(px + pw * 0.8), sy(-48 - k * 6)), fill("#FFCF6B", 0.13))
    for x, fn in ((-38.0, Hd.bare_tree), (1352.0, Hd.street_lamp)):
        c.save()
        c.translate(sx(x), sy(0))
        c.scale(P, P)
        fn(c)
        c.restore()
    put(c, 1150, -6, car, 150)
    put(c, 1318, -6, visitor_sign)
    put(c, 1392, -6, anpr_pole)
    put(c, 1470, -6, barrier)
    put(c, 1514, -6, gatehouse, 50)
    if A():
        wtext(c, "VISITORS", 1318, 145, 7.0, CREAM, tracking=0.6)
        wtext(c, "NORTH GATE", 1514, 254, 9.0, CREAM, tracking=1.0)


def scene(c):
    draw_world(c)
    for fn in (draw_maker, draw_lobby, draw_lab4, draw_corridor):
        x0, x1, z0, z1 = ROOMS[fn.__name__.replace("draw_", "").replace("lab4", "lab4")]
        if not A():   # a room's own glow never spills over its walls
            c.save()
            c.clipRect(R(sx(x0), sy(z1), sx(x1), sy(z0)))
        fn(c)
        if not A():
            c.restore()
    draw_edges(c)


def light_scene(c):
    c.drawRect(R(0, 0, W, H), fill(lhex((0.84, 0.86, 0.98))))
    c.drawRect(R(sx(-30), sy(780), sx(990), sy(-40)), fill(lhex((0.70, 0.70, 0.78))))
    for name, (x0, x1, z0, z1) in ROOMS.items():
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
    for (x, z, rad, colr) in ((1379, 40, 240, (0.62, 0.52, 0.32)), (1514, 90, 150, (0.50, 0.40, 0.22))):
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
    look = Look(bloom=0.42, bloom_threshold=0.74, halation=0.1, shadow_tint=(0.0, 0.006, 0.024), highlight_tint=(1.04, 1.0, 0.94),
                contrast=1.07, saturation=1.06, fringe=0.25, vignette=0.18, grain=0.014, flicker=0.0)
    img = finish(np.clip(img, 0, 2), 0, look, exposure=1.1)
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)


def world_info():
    """Positions in world cm for the artboards (feet are where a sprite's feet go)."""
    def lab(px, py):
        return round(ROOMS["lab4"][0] - 0.3 + px * LAB_K, 1), round(ROOMS["lab4"][3] - CEIL - (py - 58) * LAB_K, 1)

    def desk(px, py):
        return round(LOB_X + px * LOB_K, 1), round(6 + (816 - py) * LOB_K, 1)

    def wall(px, py):
        return round(LOB_X + px * LOB_K, 1), round(FB + (640 - py) * LOB_K, 1)

    return {
        "extent": [XMIN, XMAX, ZMIN, ZMAX], "plate": [W, H], "px_per_cm": P,
        "rooms": ROOMS,
        "feet": {   # floor z + 6, where put() stands things
            "mei": [165, 306], "priya": [300, 306], "jo": [388, 306],
            "sam": [630, 306], "rena": [800, 306],
            "ali": [600, 6], "ozzy": [748, 40], "squires": [886, 6],
        },
        "halo_tray": [*lab(145, 470), *lab(390, 362)],
        "halo": [*lab(170, 441), *lab(365, 390)],
        "laptop_screen": [200.5, 414.5, 257, 449],
        "lab_door": [432, 306, 448, 516],
        "lab_reader": [524, 418, 534, 440],
        "lobby_reader": [*wall(948, 412), *wall(978, 348)],
        "exit": [952, 0, 974, 220],
        "stairs": {"top": [456, 306], "landing": [548, 156], "foot": [456, 6]},
        "desk_front": [desk(20, 816), desk(594, 816), desk(594, 594), desk(560, 548), desk(426, 548), desk(426, 498), desk(378, 498),
                       desk(374, 548), desk(374, 470), desk(366, 454), desk(338, 454), desk(330, 470), desk(330, 548),
                       desk(266, 548), desk(266, 448), desk(116, 448), desk(116, 548), desk(44, 548), desk(20, 594)],
        "monitors": [*desk(116, 556), *desk(266, 448)],
        "tv_phone": [*desk(378, 566), *desk(426, 498)],
        "vending": [*desk(806, 626), *desk(944, 214)],
        "exit_sign": [898, 245.6, 944.2, 263],
        "glows": {"lab_strip_l": [110, 573], "lab_strip_r": [320, 573], "printers": [118, 80], "laser": [330, 46],
                  "roof_light": [880, 772], "gatehouse": [1514, 163], "anpr": [1332, 324], "lamp": [1379, 389]},
        "car": [1005, -6, 1297, 114],
        "gate": [1384, -6, 1556, 262],
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
