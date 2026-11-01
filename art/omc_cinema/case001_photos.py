"""Case 001's evidence photos, painted in the same Lab 4 as the opening film.

    python -m omc_cinema.case001_photos           # paints the photos into public/evidence (and a PNG into art/out/photos)
    python -m omc_cinema.case001_photos check     # also writes a sheet of phone size, close-ups and tap areas

A photo has to hold its clues in the picture, not just in the note you get for
tapping it. So every clue here is drawn for real, small enough that it has to be
spotted, and sits among plenty of ordinary lab clutter that means nothing.
AREAS lists where each clue is, in percent of the picture, for the game's tap areas.

Check any change against the case's timeline (src/data/cases/case-001.ts):

- The professor's post, 8:58 PM. Priya left at 8:45, the professor and Rena came
  in at 8:55, and the lab lights are on. The screen's text stays unreadable on
  purpose: it would show Priya's original message and skip the Tech's find.
- Ozzy's incident photo, 9:20 PM. The same room, dark as it is in the film, lit by
  his phone's flash from further back, so the floor under the bench shows. Rena's
  coat and tote have gone, HALO is out of its cradle, and the laptop locked at 9:16.
- Lobby camera 2, 21:19:40. Rena leaves alone, with the tote full and her lanyard
  swinging out of her coat. Ozzy is up at Lab 4, so his desk is empty.
"""
from __future__ import annotations

import math
import random
import sys
from contextlib import contextmanager

import numpy as np
import skia
from omc_art.palette import CORAL, CORAL_DK, CREAM, INK, MUSTARD, MUSTARD_DK, TEAL
from PIL import Image

from .case001 import campus_view, clock, rain_streaks
from .film import ROOT, fill, font, glow, linear, poly, radial, rrect, stroke, text
from .kit import box, soft_shadow, suspect
from .look import Look, finish
from .textures import surface, weave

OUT = ROOT / "out" / "photos"
GAME = ROOT.parent / "public" / "evidence"
W, H = 1600, 1200
SCALE = 1.5
PHOTO_LOOK = Look(bloom=0.1, bloom_threshold=0.9, halation=0.05, contrast=1.06, saturation=1.02, fringe=0.6, vignette=0.2, grain=0.014, flicker=0)

LINE = 5
BENCH_BACK = 790
LENS_GLOW = "#7FE9DD"


@contextmanager
def onto(c, size, corners):
    """Draws a flat `size` (w, h) rectangle in perspective onto four corners: top left, top right, bottom right, bottom left."""
    w, h = size
    m = skia.Matrix()
    m.setPolyToPoly([skia.Point(0, 0), skia.Point(w, 0), skia.Point(w, h), skia.Point(0, h)], [skia.Point(*p) for p in corners])
    c.save()
    c.concat(m)
    try:
        yield
    finally:
        c.restore()


def outlined(c, path, paint, width=LINE):
    c.drawPath(path, paint)
    c.drawPath(path, stroke(INK, width))


def shadowed(c, path, paint, width=LINE, dx=5, dy=8, blur=7, alpha=0.4):
    soft_shadow(c, path, dx, dy, blur, alpha)
    outlined(c, path, paint, width)


def curve_path(*points):
    """A line through the points as one smooth pen stroke: (start, ctrl, end, ctrl, end, ...)."""
    p = skia.Path()
    p.moveTo(*points[0])
    for i in range(1, len(points) - 1, 2):
        p.quadTo(*points[i], *points[i + 1])
    return p


# ---------------------------------------------------------------------------
# The room

def ceiling(c):
    c.drawRect(skia.Rect.MakeLTRB(-120, -60, W + 120, 58), fill("#B9BFCB"))
    weave(c, box(-120, -60, W + 120, 58), "paper", 0.8)
    for x in range(0, W, 200):
        c.drawLine(x, 0, x, 58, stroke("#8D93A3", 3))
    c.drawLine(0, 28, W, 28, stroke("#8D93A3", 3))
    for x0, x1 in ((180, 620), (980, 1420)):
        c.drawPath(rrect(x0, 12, x1, 44, 6), fill("#FFFDF2"))
        c.drawPath(rrect(x0, 12, x1, 44, 6), stroke("#6F7485", 4))
    c.drawRect(skia.Rect.MakeLTRB(-120, 56, W + 120, 66), fill(INK, 0.55))


def back_wall(c):
    wall = box(-120, 58, W + 120, 1000)
    c.drawPath(wall, linear((0, 58), (0, 860), [(0, "#7D8AAB", 1), (0.55, "#66739A", 1), (1, "#4D5880", 1)]))
    weave(c, wall, "paper", 1.4)
    # Old marks and scuffs: nobody repaints a lab.
    rng = random.Random(4)
    for _ in range(26):
        x, y = rng.uniform(0, W), rng.uniform(80, 760)
        c.drawCircle(x, y, rng.uniform(2, 5), fill("#2C3358", rng.uniform(0.08, 0.2)))
    # A trunking run along the wall, with sockets and a cable dropping into it.
    run = rrect(-120, 640, W + 120, 668, 3)
    c.drawPath(run, fill("#D7D3C8"))
    c.drawPath(run, stroke("#3B4170", 3))
    for x in (452, 862, 1212):
        plate = rrect(x, 628, x + 66, 680, 5)
        outlined(c, plate, fill("#ECE8DC"), 3)
        c.drawCircle(x + 22, 654, 8, fill("#6F7485"))
        c.drawCircle(x + 46, 654, 8, fill("#6F7485"))


def window(c):
    glass = skia.Rect.MakeLTRB(444, 118, 846, 560)
    c.save()
    c.clipRect(glass)
    c.translate(glass.left(), glass.top() - 60)
    c.scale(0.4, 0.45)
    campus_view(c, 2.0)
    rain_streaks(c, 2.0)
    c.restore()
    c.save()
    c.clipRect(glass)
    rng = random.Random(9)
    for _ in range(110):  # drops on the glass
        x, y, r = rng.uniform(glass.left(), glass.right()), rng.uniform(glass.top(), glass.bottom()), rng.uniform(1.5, 4.5)
        c.drawCircle(x, y, r, fill("#C9D6FF", 0.22))
        c.drawCircle(x - r * 0.3, y - r * 0.3, r * 0.35, fill("#FFFFFF", 0.55))
    # At night the glass also shows the room: the strip light and a pale wash.
    c.drawPath(poly([(500, 150), (800, 138), (806, 156), (506, 170)]), fill("#FFFDF2", 0.3))
    c.drawRect(glass, fill("#9FB0D8", 0.08))
    c.restore()
    # The blind, pulled part way down.
    for y in range(118, 204, 13):
        c.drawPath(rrect(glass.left() - 3, y, glass.right() + 3, y + 10, 2), linear((0, y), (0, y + 10), [(0, "#EDE9DD", 1), (1, "#AEB0B5", 1)]))
        c.drawLine(glass.left(), y + 11, glass.right(), y + 11, stroke(INK, 1.5, 0.6))
    c.drawLine(828, 204, 828, 330, stroke("#EDE9DD", 3))
    c.drawCircle(828, 336, 6, fill("#EDE9DD"))
    # Frame and mullions, as in the film.
    frame = "#2F3768"
    for r in (skia.Rect.MakeLTRB(428, 102, 862, 118), skia.Rect.MakeLTRB(428, 560, 862, 580), skia.Rect.MakeLTRB(428, 118, 444, 560),
              skia.Rect.MakeLTRB(846, 118, 862, 560), skia.Rect.MakeLTRB(639, 204, 651, 560), skia.Rect.MakeLTRB(444, 372, 846, 384)):
        c.drawRect(r, fill(frame))
    c.drawRect(skia.Rect.MakeLTRB(428, 102, 862, 580), stroke(INK, LINE))
    c.drawRect(glass, stroke(INK, 3))
    sill = rrect(418, 572, 872, 592, 3)
    outlined(c, sill, fill("#C9C6BC"), 4)


def poster(c):
    sheet = box(884, 132, 1022, 332)
    soft_shadow(c, sheet, 4, 7, 6, 0.4)
    c.drawPath(sheet, fill("#E4D8BF"))
    weave(c, sheet, "paper", 0.9)
    c.drawPath(sheet, stroke(INK, 3))
    text(c, "HALO", 953, 184, font("display", 42), fill(INK), align="center", tracking=3)
    for x in (925, 981):
        c.drawCircle(x, 226, 22, stroke(INK, 5))
    c.drawLine(947, 224, 959, 224, stroke(INK, 5))
    text(c, "INVESTOR DEMO", 953, 286, font("type", 15), fill(INK, 0.85), align="center")
    text(c, "TOMORROW 9 AM", 953, 310, font("type", 15), fill("#B23A3A"), align="center")
    c.drawCircle(953, 142, 5, fill(CORAL))


def wall_clock(c, minute):
    """The lab clock at 9:<minute>; 8:58 is minute -2."""
    clock(c, 0, 1146, 150, 78, minute=minute, second0=14)
    plate = rrect(1064, 248, 1228, 298, 8)
    c.drawPath(plate, fill("#2C3266"))
    c.drawPath(plate, stroke(INK, 4))
    text(c, "LAB 4", 1146, 285, font("display", 32), fill(CREAM, 0.9), align="center", tracking=5)


def safety_corner(c):
    # A hazard sticker and the fire extinguisher.
    tri = poly([(1264, 226), (1294, 278), (1234, 278)])
    c.drawPath(tri, fill(MUSTARD))
    c.drawPath(tri, stroke(INK, 3))
    text(c, "!", 1264, 272, font("display", 30), fill(INK), align="center")
    c.save()
    c.translate(-322, -96)
    bottle = rrect(1218, 486, 1272, 648, 22)
    shadowed(c, bottle, linear((1218, 0), (1272, 0), [(0, "#C94545", 1), (0.4, "#EF5B5B", 1), (1, "#A63A3A", 1)]), 4)
    c.drawPath(rrect(1232, 462, 1258, 490, 4), fill("#30354F"))
    c.drawLine(1256, 470, 1286, 462, stroke("#30354F", 7))
    c.drawPath(curve_path((1222, 500), (1190, 560), (1214, 620)), stroke("#20243F", 6))
    label = rrect(1226, 540, 1264, 590, 3)
    c.drawPath(label, fill(CREAM))
    for y in (552, 562, 572):
        c.drawLine(1232, y, 1258, y, stroke(INK, 2, 0.6))
    c.restore()


def binder(c, x, w, top, base, colour, label=None, lean=0):
    c.save()
    c.rotate(lean, x + w / 2, base)
    b = rrect(x, top, x + w, base, 3)
    outlined(c, b, fill(colour), 3)
    c.drawCircle(x + w / 2, base - 26, w * 0.2, stroke(INK, 2.5, 0.7))
    if label:
        c.drawPath(rrect(x + 4, top + 12, x + w - 4, top + 62, 2), fill(CREAM, 0.92))
        c.save()
        c.rotate(90, x + w / 2 - 4, top + 16)
        text(c, label, x + w / 2 - 4, top + 16, font("type", 12), fill(INK))
        c.restore()
    c.restore()


def shelf(c):
    board = rrect(1300, 232, 1598, 248, 2)
    # Binders, boxes and the odds and ends of three years of work.
    x = 1310
    for w, top, colour, label in ((26, 108, "#3FB8AF", "2024"), (30, 100, "#EF5B5B", "GRANTS"), (24, 116, "#2A2F5C", "DATA"), (28, 104, "#F2B33D", "OPTICS"), (24, 112, "#7A66D6", "2025")):
        binder(c, x, w, top, 232, colour, label)
        x += w + 2
    binder(c, x + 4, 24, 110, 232, "#55667B", "SAFETY", lean=7)
    crate = box(1484, 158, 1590, 232)
    outlined(c, crate, surface("wood", 0.32), 4)
    c.drawPath(rrect(1504, 176, 1570, 212, 2), fill(CREAM, 0.9))
    text(c, "LENSES", 1537, 200, font("type", 13), fill(INK), align="center")
    # A cardboard box of parts balanced on the crate, and trailing ivy.
    carton = box(1496, 96, 1578, 158)
    outlined(c, carton, fill("#B98D5C"), 4)
    c.drawLine(1496, 118, 1578, 118, stroke("#E4D8BF", 7, 0.8))
    outlined(c, board, surface("wood", 0.4), 4)
    for x in (1324, 1570):
        c.drawPath(poly([(x, 248), (x + 10, 248), (x, 272)]), fill("#30354F"))


def whiteboard(c):
    board = rrect(1298, 280, 1596, 560, 5)
    soft_shadow(c, board, 4, 8, 7, 0.4)
    c.drawPath(board, linear((1298, 280), (1596, 560), [(0, "#F7F6EF", 1), (0.5, "#E9E8E1", 1), (1, "#F2F1EA", 1)]))
    # The ghosts of old sums that never quite wipe off.
    pen = font("type", 19)
    text(c, "v2 lens 42 g", 1312, 496, pen, fill("#7A7C86", 0.16))
    c.drawPath(board, stroke(INK, 5))
    text(c, "HALO v3", 1318, 322, font("type", 25), fill("#2A4FB0"))
    c.drawLine(1318, 330, 1440, 326, stroke("#2A4FB0", 2.5))
    for i, (s, done) in enumerate((("lens align", True), ("firmware", True), ("hinge", True), ("battery", False))):
        y = 364 + i * 34
        c.drawPath(rrect(1320, y - 16, 1338, y + 2, 2), stroke(INK, 2.5))
        text(c, s, 1348, y, font("type", 20), fill(INK if done else "#B23A3A"))
        if done:
            c.drawPath(poly([(1323, y - 8), (1329, y - 1), (1342, y - 20)], close=False), stroke("#1F8A5B", 3.5))
    # The battery curve that keeps Priya up at night.
    c.drawLine(1466, 318, 1466, 450, stroke(INK, 2.5))
    c.drawLine(1466, 450, 1578, 450, stroke(INK, 2.5))
    c.drawPath(curve_path((1468, 334), (1520, 346), (1540, 400), (1552, 436), (1574, 444)), stroke("#B23A3A", 3.5))
    text(c, "4 h?", 1534, 348, font("type", 20), fill("#B23A3A"))
    text(c, "need 6!", 1400, 512, font("type", 26), fill("#B23A3A"))
    c.drawPath(rrect(1310, 552, 1584, 566, 3), fill("#AEB0B5"))
    c.drawLine(1310, 552, 1584, 552, stroke(INK, 3))
    for x, colour in ((1340, "#2A4FB0"), (1376, "#B23A3A"), (1440, "#1B1F3B")):
        c.drawPath(rrect(x, 544, x + 30, 554, 3), fill(colour))


# ---------------------------------------------------------------------------
# Cabinet B, door open: the professor is showing off the prototype

def halo_glasses(c, x, y, s=1.0):
    """HALO itself: gold-rimmed smart glasses, the left lens lit, a sensor pod on the arm."""
    c.save()
    c.translate(x, y)
    c.scale(s, s)
    for lx in (-46, 46):
        lens = skia.Path()
        lens.addOval(skia.Rect.MakeLTRB(lx - 38, -30, lx + 38, 30))
        c.drawPath(lens, radial((lx - 10, -10), 56, [(0, LENS_GLOW, 0.95), (0.6, "#2E918A", 0.9), (1, "#144B52", 0.95)]))
        c.drawPath(lens, stroke(MUSTARD, 8))
        c.drawPath(lens, stroke(INK, 2))
        c.drawLine(lx - 20, -12, lx - 6, -20, stroke("#FFFFFF", 4, 0.8))
    c.drawPath(curve_path((-10, -8), (0, -18), (10, -8)), stroke(MUSTARD, 8))
    for sign in (-1, 1):
        c.drawLine(sign * 84, -8, sign * 118, -20, stroke(MUSTARD_DK, 8))
    pod = rrect(82, -32, 122, -12, 6)
    c.drawPath(pod, fill("#20243F"))
    c.drawPath(pod, stroke(INK, 2))
    c.drawCircle(112, -22, 4, fill(CORAL))
    c.restore()


def cabinet_b(c, halo=True):
    body = rrect(112, 128, 424, 780, 8)
    soft_shadow(c, body, 10, 8, 14, 0.5)
    c.drawPath(body, surface("steel", 0.9))
    c.drawPath(body, fill("#26304C", 0.28))
    inside = rrect(134, 150, 402, 760, 5)
    c.drawPath(inside, linear((0, 150), (0, 760), [(0, "#2E3757", 1), (1, "#171C33", 1)]))
    c.save()
    c.clipPath(inside, doAntiAlias=True)
    # The light inside the cabinet, falling on the middle shelf.
    glow(c, (268, 340), 300, "#BFD8FF", 0.32)
    for y in (280, 470, 620):
        c.drawRect(skia.Rect.MakeLTRB(134, y, 402, y + 13), surface("steel", 0.6))
        c.drawLine(134, y + 14, 402, y + 14, stroke("#000000", 4, 0.55))
    # Top shelf: labelled boxes of spares.
    for x, w, h, colour, label in ((148, 84, 74, "#C2BCA9", "SCREWS"), (238, 72, 92, "#8E98B5", "CELLS"), (316, 72, 60, "#C2BCA9", "v1")):
        b = box(x, 280 - h, x + w, 280)
        outlined(c, b, fill(colour), 3)
        c.drawPath(rrect(x + 8, 280 - h + 12, x + w - 8, 280 - h + 34, 2), fill(CREAM))
        text(c, label, x + w / 2, 280 - h + 28, font("type", 13), fill(INK), align="center")
    # Middle shelf: HALO in its foam, exactly where Priya left it. Or the hollow it left.
    cradle = rrect(146, 364, 390, 470, 16)
    c.drawPath(cradle, fill("#3B4163"))
    weave(c, cradle, "linen", 0.6)
    c.drawPath(cradle, stroke(INK, 4))
    if halo:
        halo_glasses(c, 268, 416, 0.8)
    else:
        for x in (231, 305):
            c.drawCircle(x, 416, 31, fill("#0F1224"))
            c.drawCircle(x, 416, 31, stroke("#5A6595", 3))
        c.drawRect(skia.Rect.MakeLTRB(258, 410, 278, 418), fill("#0F1224"))
        c.drawLine(174, 402, 202, 410, stroke("#0F1224", 8))
        c.drawLine(362, 402, 334, 410, stroke("#0F1224", 8))
    # Under the shelf edge: the plate that names it.
    c.drawPath(rrect(226, 474, 310, 496, 3), fill(CREAM, 0.95))
    text(c, "HALO", 268, 492, font("display", 17), fill(INK), align="center", tracking=2)
    # Lower shelves: the charging cable, a hard case, foam offcuts.
    coil = skia.Path()
    coil.addOval(skia.Rect.MakeLTRB(160, 556, 262, 618))
    c.drawPath(coil, stroke("#6F7AAC", 7))
    coil2 = skia.Path()
    coil2.addOval(skia.Rect.MakeLTRB(168, 566, 256, 616))
    c.drawPath(coil2, stroke("#5A6595", 5))
    case = rrect(286, 540, 388, 620, 10)
    outlined(c, case, fill("#232850"), 3)
    c.drawPath(rrect(322, 532, 352, 542, 4), fill("#6F7AAC"))
    for x, h in ((150, 70), (232, 50), (312, 88)):
        c.drawPath(rrect(x, 760 - h, x + 72, 760, 6), fill("#3B4163"))
    c.restore()
    c.drawPath(inside, stroke(INK, 3))
    c.drawPath(body, stroke(INK, LINE))
    # The door, swung open towards the camera, still carrying its letter and the professor's note.
    door = poly([(112, 128), (-14, 92), (-14, 830), (112, 780)])
    c.drawPath(door, surface("steel", 1.05))
    c.drawPath(door, fill("#2A3454", 0.34))
    c.drawPath(door, linear((-14, 0), (112, 0), [(0, "#FFFFFF", 0.14), (1, "#000000", 0.3)]))
    c.drawPath(door, stroke(INK, LINE))
    with onto(c, (120, 680), [(0, 112), (108, 134), (108, 776), (0, 816)]):
        c.drawPath(rrect(26, 24, 92, 84, 6), fill(CREAM, 0.92))
        c.drawPath(rrect(26, 24, 92, 84, 6), stroke(INK, 3))
        text(c, "B", 59, 74, font("display", 50), fill(INK), align="center")
        note = rrect(12, 124, 108, 228, 2)
        c.drawPath(note, fill("#E8CF7A"))
        for y, s in ((156, "NOBODY"), (182, "TOUCHES"), (208, "HALO")):
            text(c, s, 60, y, font("type", 17), fill(INK), align="center")
        c.drawPath(rrect(84, 330, 100, 420, 7), fill("#8D9AB8"))
        c.drawPath(rrect(84, 330, 100, 420, 7), stroke(INK, 3))
        if not halo:
            # The spare key, still in the lock, with its paper tag hanging off the ring.
            c.drawCircle(92, 300, 9, fill("#8D9AB8"))
            c.drawCircle(92, 300, 9, stroke(INK, 2.5))
            c.drawLine(92, 300, 92, 326, stroke(MUSTARD, 6))
            c.drawCircle(92, 336, 10, stroke(MUSTARD_DK, 4))
            c.drawLine(92, 346, 76, 364, stroke(INK, 1.5))
            c.save()
            c.rotate(16, 74, 372)
            tag = rrect(38, 362, 90, 386, 3)
            c.drawPath(tag, fill(CREAM))
            c.drawPath(tag, stroke(INK, 2))
            text(c, "SPARE", 64, 379, font("type", 11.5), fill("#B23A3A"), align="center")
            c.restore()


# ---------------------------------------------------------------------------
# The bench

def bench(c):
    top = poly([(-120, BENCH_BACK), (1312, BENCH_BACK), (1470, H + 20), (-120, H + 20)])
    soft_shadow(c, box(-20, BENCH_BACK - 28, 1316, BENCH_BACK + 4), 0, -6, 12, 0.34)
    c.drawPath(top, surface("steel", 1.3))
    c.drawPath(top, linear((0, BENCH_BACK), (0, H), [(0, "#404A6D", 0.5), (1, "#1E2542", 0.34)]))
    # A worn-in surface: scratches, burn marks, an old ring of tape glue.
    rng = random.Random(21)
    c.save()
    c.clipPath(top, doAntiAlias=True)
    for _ in range(70):
        x, y, a, n = rng.uniform(0, 1360), rng.uniform(BENCH_BACK + 8, H), rng.uniform(-0.2, 0.2), rng.uniform(26, 130)
        c.drawLine(x, y, x + math.cos(a) * n, y + math.sin(a) * n, stroke("#D7DCEA", rng.uniform(1, 2), rng.uniform(0.08, 0.26)))
    for x, y, r in ((640, 900, 16), (1210, 880, 12), (88, 830, 11)):
        c.drawCircle(x, y, r, fill("#14182E", 0.4))
    c.restore()
    c.drawPath(poly([(-120, BENCH_BACK), (1312, BENCH_BACK)], close=False), stroke("#AEB6D0", 4, 0.9))
    c.drawPath(top, stroke(INK, LINE))


def cutting_mat(c):
    corners = [(92, 866), (640, 866), (662, 1118), (40, 1118)]
    shape = poly(corners)
    soft_shadow(c, shape, 0, 5, 4, 0.35)
    c.drawPath(shape, fill("#2B7A68"))
    with onto(c, (600, 280), corners):
        for x in range(0, 601, 30):
            c.drawLine(x, 0, x, 280, stroke("#7FD3B8", 1.4, 0.55))
        for y in range(0, 281, 30):
            c.drawLine(0, y, 600, y, stroke("#7FD3B8", 1.4, 0.55))
        for x, s in ((30, "1"), (150, "5"), (300, "10"), (450, "15")):
            text(c, s, x + 4, 22, font("body", 16), fill("#BDEBD8"))
    c.drawPath(shape, stroke(INK, 4))


def breadboard(c):
    corners = [(150, 930), (392, 926), (408, 1040), (140, 1046)]
    shape = poly(corners)
    soft_shadow(c, shape, 3, 7, 5, 0.45)
    c.drawPath(shape, fill("#F0EBDD"))
    with onto(c, (260, 120), corners):
        for row in (12, 22, 32, 44, 54, 70, 80, 96, 106):
            for k in range(6, 256, 10):
                c.drawCircle(k, row, 1.7, fill("#54586A"))
        c.drawLine(6, 6, 254, 6, stroke("#C94545", 2))
        c.drawLine(6, 114, 254, 114, stroke("#2A4FB0", 2))
        chip = box(84, 40, 150, 80)
        c.drawPath(chip, fill("#20243F"))
        for k in range(6):
            c.drawLine(90 + k * 11, 36, 90 + k * 11, 42, stroke("#AEB6D0", 3))
            c.drawLine(90 + k * 11, 78, 90 + k * 11, 84, stroke("#AEB6D0", 3))
        wires = [((16, 14), (60, -30), (110, 22), "#EF5B5B"), ((36, 104), (80, 150), (130, 96), "#2A4FB0"),
                 ((166, 22), (200, -20), (230, 44), "#3FB8AF"), ((176, 96), (220, 130), (244, 74), "#F2B33D"), ((60, 54), (120, 100), (170, 54), "#7A66D6")]
        for a, b, d, colour in wires:
            c.drawPath(curve_path(a, b, d), stroke(colour, 4))
        for x, colour in ((196, "#EF5B5B"), (214, "#3FB8AF"), (232, "#F2B33D")):
            c.drawCircle(x, 92, 6, fill(colour))
            c.drawCircle(x - 2, 90, 2, fill("#FFFFFF", 0.9))
    c.drawPath(shape, stroke(INK, 3))


def oscilloscope(c, probe=True):
    case = rrect(136, 642, 382, 804, 10)
    shadowed(c, case, linear((0, 642), (0, 804), [(0, "#50597F", 1), (1, "#333A5C", 1)]), LINE, 6, 6, 8, 0.45)
    screen = box(152, 658, 288, 762)
    c.drawPath(screen, fill("#06201E"))
    for x in range(152, 289, 22):
        c.drawLine(x, 658, x, 762, stroke("#2E918A", 1, 0.5))
    for y in range(658, 763, 22):
        c.drawLine(152, y, 288, y, stroke("#2E918A", 1, 0.5))
    trace = skia.Path()
    for i in range(62):
        x, y = 154 + i * 2.2, 710 + math.sin(i * 0.55) * 30 * math.sin(i * 0.05)
        trace.moveTo(x, y) if i == 0 else trace.lineTo(x, y)
    c.drawPath(trace, stroke("#5CE0C8", 3))
    glow(c, (220, 710), 90, "#5CE0C8", 0.16)
    c.drawPath(screen, stroke(INK, 3))
    for k in range(3):
        y = 674 + k * 40
        c.drawCircle(326, y, 15, fill("#8D9AB8"))
        c.drawCircle(326, y, 15, stroke(INK, 3))
        c.drawLine(326, y, 326 + 9 * math.sin(k * 2 + 1), y - 9 * math.cos(k * 2 + 1), stroke(INK, 3))
        c.drawCircle(362, y + 4, 5, fill(CORAL if k == 0 else "#F0EBDD"))
    if not probe:
        return
    # The probe lead, snaking off across the bench.
    c.drawPath(curve_path((318, 802), (360, 860), (300, 900), (240, 940), (252, 960)), stroke("#20243F", 5))
    c.drawPath(rrect(242, 956, 262, 996, 3), fill("#F0EBDD"))
    c.drawPath(rrect(242, 956, 262, 996, 3), stroke(INK, 2.5))


def soldering_kit(c):
    # Iron in its stand, a spool of solder, a damp sponge, and the safety goggles nobody wears.
    stand = rrect(446, 858, 590, 884, 8)
    shadowed(c, stand, fill("#30354F"), 3, 3, 5, 4, 0.5)
    c.drawLine(466, 860, 560, 816, stroke("#C4CAD8", 6))
    c.drawLine(556, 818, 590, 802, stroke(CORAL, 12))
    c.drawPath(curve_path((590, 802), (640, 800), (660, 830), (680, 870), (640, 866)), stroke("#20243F", 4))
    side = rrect(452, 912, 512, 958, 6)
    soft_shadow(c, side, 2, 6, 4, 0.4)
    c.drawPath(side, linear((452, 0), (512, 0), [(0, "#8D9AB8", 1), (0.5, "#E3E7F0", 1), (1, "#8D9AB8", 1)]))
    for y in range(918, 954, 5):
        c.drawLine(453, y, 511, y, stroke("#6F7AAC", 1.5, 0.8))
    c.drawPath(side, stroke(INK, 3))
    top, hole = skia.Path(), skia.Path()
    top.addOval(skia.Rect.MakeLTRB(446, 900, 518, 926))
    hole.addOval(skia.Rect.MakeLTRB(470, 908, 494, 918))
    c.drawPath(top, fill("#30354F"))
    c.drawPath(top, stroke(INK, 3))
    c.drawPath(hole, fill("#0C0E1C"))
    c.drawPath(curve_path((512, 950), (540, 980), (526, 990)), stroke("#C4CAD8", 3))
    # A wide one-piece visor with a dip for the nose, and its elastic strap flopped underneath.
    c.drawPath(curve_path((512, 1034), (470, 1092), (540, 1106), (610, 1116), (654, 1040)), stroke("#2A2F5C", 8))
    visor = skia.Path()
    visor.moveTo(510, 1012)
    visor.quadTo(580, 996, 650, 1012)
    visor.quadTo(662, 1050, 640, 1068)
    visor.quadTo(606, 1078, 592, 1050)
    visor.quadTo(580, 1040, 568, 1050)
    visor.quadTo(554, 1078, 520, 1068)
    visor.quadTo(498, 1050, 510, 1012)
    visor.close()
    shadowed(c, visor, fill("#CFE3EE", 0.66), 4, 3, 6, 5, 0.35)
    c.drawLine(528, 1020, 556, 1014, stroke("#FFFFFF", 5, 0.8))


def laptop(c, locked=False):
    """Priya's laptop, turned a little towards the camera: open on the chat, or on the lock screen from 9:16."""
    deck = poly([(722, 872), (1012, 856), (1068, 930), (746, 958)])
    soft_shadow(c, deck, 2, 10, 8, 0.5)
    lid = poly([(726, 668), (1000, 630), (1016, 856), (722, 874)])
    c.drawPath(deck, fill("#4A5175"))
    with onto(c, (300, 80), [(722, 872), (1012, 856), (1068, 930), (746, 958)]):
        for r in range(4):
            for k in range(13):
                c.drawPath(rrect(10 + k * 21.5, 6 + r * 13, 28 + k * 21.5, 17 + r * 13, 2), fill("#1E2240"))
        c.drawPath(rrect(106, 60, 194, 78, 2), fill("#39406A"))
    c.drawPath(deck, stroke(INK, 4))
    outlined(c, lid, fill("#2A2F52"), 4)
    corners = [(740, 684), (988, 650), (1002, 842), (736, 858)]
    c.drawPath(poly(corners), fill("#0E1430" if locked else "#DCE6F8"))
    with onto(c, (500, 340), corners):
        if locked:
            c.drawPath(rrect(226, 132, 274, 176, 6), fill("#6F7AAC"))
            shackle = skia.Path()
            shackle.addArc(skia.Rect.MakeLTRB(232, 102, 268, 146), 180, 180)
            c.drawPath(shackle, stroke("#6F7AAC", 7))
            text(c, "PRIYA-LAPTOP", 250, 216, font("body", 22), fill(CREAM, 0.9), align="center")
            text(c, "Locked at 9:16 PM", 250, 250, font("body", 20), fill(CREAM, 0.65), align="center")
            c.drawPath(rrect(150, 272, 350, 306, 16), stroke("#6F7AAC", 3))
        else:
            unlocked_screen(c)
    c.drawPath(poly(corners), stroke(INK, 3))
    c.drawPath(poly([(742, 686), (830, 674), (780, 856), (736, 858)]), fill("#FFFFFF", 0.1))
    # Priya's sticky note on the bezel, as in the film.
    c.save()
    c.rotate(-6, 760, 850)
    sticky = box(716, 806, 800, 876)
    soft_shadow(c, sticky, 2, 4, 3, 0.45)
    c.drawPath(sticky, fill("#E8CF7A"))
    text(c, "DEMO 9AM!", 758, 834, font("type", 12), fill(INK), align="center")
    text(c, "battery??", 758, 856, font("type", 12), fill("#B23A3A"), align="center")
    c.restore()
    if not locked:
        glow(c, (870, 760), 260, "#BFD8FF", 0.1)


def unlocked_screen(c):
    """The lab chat, with its words too small to read at this distance."""
    c.drawRect(skia.Rect.MakeWH(500, 52), fill("#2A2F5C"))
    c.drawCircle(28, 26, 10, fill(TEAL))
    text(c, "Lab 4 crew", 50, 37, font("body", 28), fill(CREAM))
    text(c, "8:58", 488, 35, font("body", 22), fill(CREAM, 0.75), align="right")
    # Bubbles with their words too small to read at this distance.
    rows = (("#AEBBDD", 18, 370, 70), ("#F2B33D", 18, 460, 150))
    for colour, x0, x1, y in rows:
        c.drawPath(rrect(x0, y, x1, y + 66, 16), fill(colour))
        rng = random.Random(y)
        for line_ in range(2):
            x = x0 + 18
            while x < x1 - 50:
                n = rng.uniform(16, 44)
                c.drawLine(x, y + 24 + line_ * 20, x + n, y + 24 + line_ * 20, stroke(INK, 5, 0.55))
                x += n + 10
    c.drawPath(rrect(18, 276, 482, 322, 22), fill("#F2F5FC"))
    c.drawLine(40, 299, 150, 299, stroke(INK, 5, 0.2))


def mug(c, x, y, s=1.0):
    c.save()
    c.translate(x, y)
    c.scale(s, s)
    soft_shadow(c, rrect(-42, 60, 54, 86, 14), 0, 4, 7, 0.4)
    c.drawPath(curve_path((40, 14), (86, 8), (82, 40), (78, 66), (38, 56)), stroke(INK, 14))
    c.drawPath(curve_path((40, 14), (86, 8), (82, 40), (78, 66), (38, 56)), stroke("#E9E2D0", 7))
    body = rrect(-44, -8, 44, 84, 12)
    outlined(c, body, linear((-44, 0), (44, 0), [(0, "#F4EDDD", 1), (0.6, "#E9E2D0", 1), (1, "#BDB5A3", 1)]), 4)
    top = skia.Path()
    top.addOval(skia.Rect.MakeLTRB(-44, -22, 44, 8))
    c.drawPath(top, fill("#E9E2D0"))
    c.drawPath(top, stroke(INK, 4))
    inner = skia.Path()
    inner.addOval(skia.Rect.MakeLTRB(-36, -16, 36, 4))
    c.drawPath(inner, fill("#3B2416"))
    text(c, "No.1", 0, 34, font("display", 22), fill(CORAL_DK), align="center")
    text(c, "PROF", 0, 56, font("type", 15), fill(INK), align="center")
    c.drawPath(curve_path((-24, -4), (-30, 24), (-20, 60)), stroke("#7A4A28", 3, 0.5))
    c.restore()


def pizza_box(c):
    corners = [(1082, 972), (1316, 962), (1396, 1150), (1100, 1172)]
    shape = poly(corners)
    soft_shadow(c, shape, 0, 8, 7, 0.45)
    c.drawPath(shape, fill("#C9A474"))
    c.save()
    c.clipPath(shape, doAntiAlias=True)
    weave(c, shape, "paper", 1.1)
    c.restore()
    c.drawPath(shape, stroke(INK, 4))
    with onto(c, (340, 220), corners):
        c.drawPath(rrect(30, 22, 310, 198, 12), fill("#B98D5C"))
        slice_ = poly([(84, 64), (240, 88), (120, 180)])
        c.drawPath(slice_, fill("#F2B33D"))
        c.drawPath(curve_path((84, 64), (160, 54), (240, 88)), stroke("#B9762F", 18))
        for x, y in ((134, 92), (178, 104), (132, 132)):
            c.drawCircle(x, y, 13, fill(CORAL_DK))
        c.drawPath(slice_, stroke(INK, 3))
        for x, y in ((262, 150), (246, 170), (272, 176)):
            c.drawCircle(x, y, 3, fill("#7A4A28", 0.7))


def notebook(c):
    corners = [(762, 996), (1010, 990), (1048, 1144), (744, 1152)]
    shape = poly(corners)
    soft_shadow(c, shape, 0, 7, 6, 0.42)
    c.drawPath(shape, fill("#F7F3E5"))
    weave(c, shape, "paper", 0.9)
    with onto(c, (300, 180), corners):
        for y in range(26, 176, 18):
            c.drawLine(10, y, 290, y, stroke("#8FB0D9", 1.5, 0.7))
        c.drawLine(44, 0, 44, 180, stroke("#D98080", 1.5, 0.8))
        for i, s in enumerate(("Lens ok at 40 deg", "Hinge: swap screw", "Charge test again", "Ask E. re room 9am")):
            text(c, s, 52, 22 + i * 36, font("type", 17), fill("#2A2F5C", 0.82))
    c.drawPath(shape, stroke(INK, 3.5))
    for y in range(1006, 1146, 15):
        c.drawCircle(752, y, 3, stroke("#30354F", 2.5))
    # A pen lying across it, and a pencil stub.
    c.save()
    c.rotate(-16, 980, 1094)
    pen_ = rrect(866, 1088, 1086, 1102, 6)
    shadowed(c, pen_, fill("#2A4FB0"), 3, 2, 5, 3, 0.45)
    c.drawPath(poly([(1086, 1089), (1104, 1095), (1086, 1101)]), fill("#E4D8BF"))
    c.restore()


def small_things(c):
    # A jar of screwdrivers, tape and a charger: the bench of someone who works late.
    c.save()
    c.translate(-208, 0)
    jar = rrect(614, 720, 690, 830, 10)
    for x, h, colour in ((626, 68, CORAL), (644, 92, TEAL), (660, 76, MUSTARD), (674, 60, "#7A66D6")):
        tip = x + (x - 650) * 0.12
        c.drawLine(x, 780, tip, 768 - h, stroke("#C4CAD8", 5))
        grip = rrect(tip - 7, 714 - h, tip + 7, 774 - h, 5)
        outlined(c, grip, fill(colour), 2.5)
    soft_shadow(c, jar, 2, 6, 5, 0.35)
    c.drawPath(jar, fill("#DCEAF2", 0.34))
    c.drawPath(jar, stroke(INK, 3.5))
    c.drawLine(626, 730, 626, 818, stroke("#FFFFFF", 4, 0.5))
    c.restore()
    # Roll of gaffer tape.
    outer, hole = skia.Path(), skia.Path()
    outer.addOval(skia.Rect.MakeLTRB(1030, 806, 1116, 868))
    hole.addOval(skia.Rect.MakeLTRB(1054, 824, 1092, 850))
    c.drawPath(outer, fill("#20243F"))
    c.drawPath(outer, stroke(INK, 3))
    c.drawPath(hole, fill("#5A6595"))
    c.drawPath(hole, stroke(INK, 3))
    # A cell on charge, with a tiny green light, and its lead running back to the wall.
    cell = rrect(1140, 862, 1236, 900, 6)
    shadowed(c, cell, fill("#E9E2D0"), 3, 2, 5, 3, 0.4)
    text(c, "CELL 3", 1176, 887, font("type", 13), fill(INK), align="center")
    c.drawCircle(1222, 881, 5, fill("#5CE0A0"))
    c.drawPath(curve_path((1236, 878), (1290, 860), (1262, 812), (1244, 760), (1246, 672)), stroke("#20243F", 4))


# ---------------------------------------------------------------------------
# Rena's things: the coat, and what's in it

def kestrel_mark(c, x, y, s, colour=CORAL):
    """Kestrel's logo: a falcon stooping, wings swept back. A bird and nothing else."""
    c.save()
    c.translate(x, y)
    c.scale(s, s)
    bird = skia.Path()
    bird.moveTo(15, 1)
    bird.quadTo(14, -4, 9, -5)
    bird.quadTo(5, -5, 3, -3)
    bird.lineTo(-9, -15)
    bird.quadTo(-5, -5, -5, -1)
    bird.lineTo(-16, 1)
    bird.lineTo(-13, 6)
    bird.lineTo(-4, 4)
    bird.quadTo(4, 8, 10, 2)
    bird.quadTo(12, 1, 15, 1)
    bird.close()
    c.drawPath(bird, fill(colour))
    c.drawCircle(9.5, -1.5, 1, fill("#101014"))
    c.restore()


def lab_floor(c):
    floor = poly([(1312, BENCH_BACK), (W, BENCH_BACK), (W, H), (1470, H)])
    c.drawPath(floor, surface("tile", 0.5))
    c.drawPath(floor, fill("#3B4170", 0.42))
    c.drawRect(skia.Rect.MakeLTRB(1312, 770, W, 794), fill("#3B4170"))
    c.drawLine(1312, 794, W, 794, stroke(INK, 3))


def chair(c):
    """A five-star base under a padded seat and back."""
    glow(c, (1486, 1140), 150, "#000000", 0.4, blend=skia.BlendMode.kSrcOver)
    c.drawLine(1486, 900, 1486, 1086, stroke("#AEB6D0", 15))
    c.drawLine(1486, 900, 1486, 1086, stroke(INK, 3, 0.5))
    for dx, dy in ((-84, 40), (-40, 62), (46, 62), (88, 40)):
        c.drawLine(1486, 1086, 1486 + dx, 1086 + dy, stroke("#2A2F52", 15))
        wheel = skia.Path()
        wheel.addOval(skia.Rect.MakeLTRB(1486 + dx - 16, 1086 + dy - 6, 1486 + dx + 16, 1086 + dy + 22))
        outlined(c, wheel, fill("#39406A"), 3)
    back = rrect(1396, 610, 1576, 860, 30)
    outlined(c, back, fill("#465081"), 4)
    seat = rrect(1376, 866, 1596, 918, 22)
    outlined(c, seat, fill("#465081"), 4)
    weave(c, seat, "linen", 0.8)


def renas_things(c):
    # Her tote, folded flat and hung off the seat: empty at 8:58, full at 9:19.
    c.drawPath(curve_path((1508, 908), (1534, 842), (1560, 908)), stroke("#A8A8A0", 8))
    tote = poly([(1494, 900), (1578, 900), (1588, 1058), (1484, 1064)])
    shadowed(c, tote, fill("#ADADA5"), 3.5, 3, 6, 5, 0.4)
    c.save()
    c.clipPath(tote, doAntiAlias=True)
    weave(c, tote, "linen", 0.8)
    c.drawLine(1484, 986, 1590, 978, stroke("#7F7F78", 3))
    c.restore()
    # The coat, hung over the chair by its collar.
    coat = skia.Path()
    coat.moveTo(1384, 628)
    coat.cubicTo(1420, 584, 1552, 584, 1588, 628)
    coat.cubicTo(1600, 720, 1602, 820, 1596, 884)
    coat.quadTo(1488, 912, 1380, 888)
    coat.cubicTo(1372, 820, 1372, 720, 1384, 628)
    coat.close()
    soft_shadow(c, coat, 6, 12, 12, 0.45)
    c.drawPath(coat, linear((1372, 0), (1600, 0), [(0, "#8A70A8", 1), (0.5, "#6F5890", 1), (1, "#54416F", 1)]))
    weave(c, coat, "linen", 0.65)
    c.drawPath(coat, stroke(INK, LINE))
    for pts in (((1432, 650), (1418, 770), (1430, 880)), ((1568, 660), (1580, 770), (1566, 884))):
        c.drawPath(curve_path(*pts), stroke("#3B2C52", 4, 0.75))
    c.drawPath(curve_path((1474, 622), (1466, 760), (1476, 898)), stroke(INK, 4))
    for y in (690, 760, 830):
        c.drawCircle(1456, y, 8, fill("#B7A3CC"))
        c.drawCircle(1456, y, 8, stroke(INK, 2.5))
    collar = skia.Path()
    collar.moveTo(1416, 606)
    collar.quadTo(1486, 584, 1556, 606)
    collar.lineTo(1536, 650)
    collar.quadTo(1486, 622, 1436, 650)
    collar.close()
    c.drawPath(collar, fill("#54416F"))
    c.drawPath(collar, stroke(INK, 4))
    # The lanyard: a black strap slipping out from inside the coat, down to a card pushed into
    # the pocket. Only the top of the card shows, and on it only the bird.
    strap = curve_path((1476, 668), (1522, 684), (1526, 746))
    c.drawPath(strap, stroke("#08080C", 8))
    c.drawPath(strap, stroke("#4A4A56", 1.5, 0.9))
    c.save()
    c.rotate(5, 1526, 780)
    card = rrect(1496, 742, 1556, 830, 6)
    soft_shadow(c, card, 3, 4, 3, 0.45)
    c.drawPath(card, fill("#101014"))
    c.drawPath(card, stroke("#000000", 2.5))
    c.drawPath(rrect(1516, 748, 1536, 754, 2), fill("#54416F"))
    kestrel_mark(c, 1526, 773, 1.5)
    c.restore()
    pocket = poly([(1484, 798), (1578, 790), (1582, 866), (1490, 874)])
    c.drawPath(pocket, linear((1484, 0), (1582, 0), [(0, "#7A6398", 1), (1, "#5D4A79", 1)]))
    weave(c, pocket, "linen", 0.65)
    c.drawPath(pocket, stroke(INK, 4))
    c.drawLine(1488, 806, 1578, 798, stroke("#3B2C52", 2.5, 0.8))


def visitor_badge(c, feet, scale):
    """Rena's visitor badge, on the coral clip that turns up under the bench later."""
    x = feet[0] + 26 * scale
    y = feet[1] - 186 * scale
    c.save()
    c.rotate(3, x, y)
    c.drawPath(rrect(x - 6, y - 16, x + 6, y + 2, 3), fill(CORAL))
    c.drawPath(rrect(x - 6, y - 16, x + 6, y + 2, 3), stroke(INK, 2))
    tag = rrect(x - 30, y, x + 30, y + 40, 3)
    c.drawPath(tag, fill(CREAM))
    c.drawPath(tag, stroke(INK, 2.5))
    text(c, "VISITOR", x, y + 16, font("body", 10.5), fill(INK), align="center")
    text(c, "V-117", x, y + 33, font("display", 14), fill(CORAL_DK), align="center")
    c.restore()


# ---------------------------------------------------------------------------
# The photo

def room_light(c):
    """The strip lights from above, the corners falling away, and the flash of a phone that's a bit too close."""
    c.drawRect(skia.Rect.MakeWH(W, 620), linear((0, 40), (0, 620), [(0, "#FFF4D8", 0.07), (1, "#FFF4D8", 0)], blend=skia.BlendMode.kPlus))
    for x in (400, 1200):
        c.drawPath(rrect(x - 216, 14, x + 216, 42, 5), fill("#FFFFFF", 0.9))
        glow(c, (x, 40), 300, "#FFFDF2", 0.1)
    glow(c, (800, 760), 640, "#FFF6E6", 0.04)
    c.drawRect(skia.Rect.MakeWH(W, H), radial((800, 560), 1080, [(0, "#10142E", 0), (0.6, "#10142E", 0), (1, "#10142E", 0.24)], blend=skia.BlendMode.kMultiply))


def lab_wall(c, minute, halo=True):
    back_wall(c)
    ceiling(c)
    window(c)
    poster(c)
    wall_clock(c, minute)
    shelf(c)
    whiteboard(c)
    safety_corner(c)
    cabinet_b(c, halo)


def paint_linkedin(c):
    lab_wall(c, -2)
    # The two people in the picture stand behind the bench. Their feet are out of frame.
    prof = (606, 912)
    rena = (1122, 880)
    glow(c, (prof[0] + 16, 720), 240, "#000000", 0.22, blend=skia.BlendMode.kSrcOver)
    glow(c, (rena[0] + 16, 720), 230, "#000000", 0.22, blend=skia.BlendMode.kSrcOver)
    suspect(c, "square", 310, prof, 1.08)
    suspect(c, "rectangle", 20, rena, 1.08)
    visitor_badge(c, rena, 1.08)
    lab_floor(c)
    chair(c)
    renas_things(c)
    bench(c)
    oscilloscope(c)
    cutting_mat(c)
    breadboard(c)
    small_things(c)
    soldering_kit(c)
    laptop(c)
    notebook(c)
    mug(c, 1010, 900, 0.72)
    pizza_box(c)
    room_light(c)


# ---------------------------------------------------------------------------
# Ozzy's incident photo: further back and lower down, so the bench has a front and an underneath

LOW_BENCH = 930


@contextmanager
def lying_flat(c):
    """Things lying on the bench, seen from low down: the same drawings, squashed towards its back edge."""
    k = (LOW_BENCH - BENCH_BACK) / (H - BENCH_BACK) * 0.98
    c.save()
    c.translate(0, BENCH_BACK)
    c.scale(1, k)
    c.translate(0, -BENCH_BACK)
    try:
        yield
    finally:
        c.restore()


def bench_from_afar(c):
    top = poly([(-120, BENCH_BACK), (1312, BENCH_BACK), (1480, LOW_BENCH), (-120, LOW_BENCH)])
    c.drawPath(top, surface("steel", 1.0))
    c.drawPath(top, fill("#333C5E", 0.42))
    c.drawPath(top, stroke(INK, LINE))
    # Under it: the bench's shadow on the wall, then the floor.
    c.drawRect(skia.Rect.MakeLTRB(-120, LOW_BENCH, 1480, 1012), fill("#141830", 0.82))
    floor = box(-120, 1012, W + 120, H + 20)
    c.drawPath(floor, surface("tile", 0.62))
    c.drawPath(floor, fill("#3B4170", 0.3))
    c.drawLine(-120, 1012, W + 120, 1012, stroke(INK, 5))
    c.drawRect(skia.Rect.MakeLTRB(-120, 1000, W + 120, 1012), fill("#2C3358"))


def under_the_bench(c):
    """The floor nobody sweeps: a bin, a crate of dead kit, a power strip, and the odd thing that got dropped."""
    bin_ = poly([(196, 976), (318, 976), (304, 1126), (210, 1126)])
    shadowed(c, bin_, linear((196, 0), (318, 0), [(0, "#3B4163", 1), (1, "#272C4C", 1)]), 4)
    for x, y, r in ((226, 972, 19), (262, 964, 22), (292, 974, 16)):
        c.drawCircle(x, y, r, fill("#E4DFD0"))
        c.drawCircle(x, y, r, stroke(INK, 2.5))
    crate = box(452, 968, 640, 1100)
    outlined(c, crate, surface("wood", 0.42), 4)
    c.drawPath(rrect(486, 1006, 606, 1048, 2), fill(CREAM, 0.9))
    text(c, "E-WASTE", 546, 1034, font("type", 18), fill(INK), align="center")
    c.drawPath(curve_path((470, 968), (486, 930), (520, 966), (566, 936), (604, 966)), stroke("#20243F", 6))
    strip = rrect(742, 1092, 948, 1126, 7)
    shadowed(c, strip, fill("#D7D3C8"), 3.5, 2, 6, 4, 0.5)
    for x in range(766, 936, 36):
        c.drawCircle(x, 1109, 8, fill("#6F7485"))
    c.drawPath(curve_path((766, 1100), (740, 1044), (800, 1030), (850, 1020), (830, 980)), stroke("#20243F", 6))
    c.drawPath(curve_path((838, 1100), (880, 1064), (936, 1072), (976, 1076), (980, 1010)), stroke("#20243F", 5))
    # Harmless bits on the floor: a pen cap, screws, a ball of paper, a zip tie.
    c.drawPath(rrect(386, 1132, 424, 1146, 6), fill(CORAL_DK))
    c.drawPath(rrect(386, 1132, 424, 1146, 6), stroke(INK, 2.5))
    for x, y in ((688, 1060), (706, 1076), (1162, 1120)):
        c.drawCircle(x, y, 4, fill("#C4CAD8"))
        c.drawCircle(x, y, 4, stroke(INK, 1.5))
    c.drawCircle(1236, 1092, 21, fill("#E4DFD0"))
    c.drawCircle(1236, 1092, 21, stroke(INK, 2.5))
    c.drawPath(curve_path((96, 1110), (122, 1090), (150, 1108)), stroke("#ECE8DC", 4))
    # The clip: fallen off Rena's badge when she bent to the bench.
    c.save()
    c.rotate(-13, 1046, 1060)
    c.translate(1046, 1060)
    c.scale(0.84, 0.84)
    c.translate(-1046, -1060)
    glow(c, (1046, 1072), 70, "#000000", 0.4, blend=skia.BlendMode.kSrcOver)
    c.drawPath(rrect(990, 1050, 1042, 1072, 6), fill(CORAL))
    c.drawPath(rrect(990, 1050, 1042, 1072, 6), stroke(INK, 2.5))
    c.drawCircle(1002, 1061, 4, fill(CORAL_DK))
    tab = rrect(1040, 1046, 1104, 1076, 3)
    c.drawPath(tab, fill(CREAM))
    c.drawPath(tab, stroke(INK, 2.5))
    text(c, "V-117", 1072, 1067, font("display", 15), fill(CORAL_DK), align="center")
    c.restore()


def bench_legs(c):
    for x in (34, 664, 1424):
        leg = box(x, LOW_BENCH, x + 34, 1180)
        c.drawPath(leg, linear((x, 0), (x + 34, 0), [(0, "#6F7AAC", 1), (1, "#3B4170", 1)]))
        c.drawPath(leg, stroke(INK, 4))
        c.drawPath(rrect(x - 8, 1174, x + 42, 1190, 4), fill("#20243F"))
    lip = box(-120, LOW_BENCH, 1480, LOW_BENCH + 28)
    c.drawPath(lip, surface("steel", 0.8))
    c.drawPath(lip, fill("#232B4C", 0.5))
    c.drawPath(lip, stroke(INK, 4))


def flash_light(c):
    """The lab is dark, as the film has it. His phone's flash is all the light there is, hard in the middle and gone by the corners."""
    c.drawPath(rrect(180, 12, 620, 44, 6), fill("#3B3F52"))
    c.drawPath(rrect(980, 12, 1420, 44, 6), fill("#3B3F52"))
    c.drawRect(skia.Rect.MakeLTRB(-200, -200, W + 200, H + 200), radial((800, 620), 1120, [(0, "#FFFFFF", 1), (0.46, "#EEF1F8", 1), (0.76, "#A6AEC8", 1), (1, "#555B7C", 1)], blend=skia.BlendMode.kMultiply))
    glow(c, (800, 640), 620, "#F6F4EC", 0.2)


def paint_incident(c):
    # Taken in a hurry, not quite level.
    c.save()
    c.translate(W / 2, H / 2)
    c.rotate(-1.3)
    c.translate(-W / 2 + 26, -H / 2)
    lab_wall(c, 20, halo=False)
    c.save()
    c.translate(84, 28)
    chair(c)
    c.restore()
    bench_from_afar(c)
    under_the_bench(c)
    bench_legs(c)
    oscilloscope(c, probe=False)
    with lying_flat(c):
        cutting_mat(c)
        breadboard(c)
        soldering_kit(c)
        notebook(c)
        c.save()
        c.translate(104, 0)
        pizza_box(c)
        c.restore()
    small_things(c)
    c.save()
    c.translate(0, -36)
    laptop(c, locked=True)
    c.restore()
    mug(c, 1010, 850, 0.72)
    flash_light(c)
    c.restore()


# ---------------------------------------------------------------------------
# Lobby camera 2: high in a corner, wide, and greyscale by the time it reaches the recorder

FLOOR_TOP = 640
VANISH = (800, 300)


def lobby_room(c):
    c.drawRect(skia.Rect.MakeLTRB(0, 0, W, 66), fill("#D8D8D4"))
    for x in (180, 620, 1060, 1460):
        c.drawCircle(x, 34, 18, fill("#FFFFFF"))
        glow(c, (x, 40), 170, "#FFFFFF", 0.3)
    wall = box(0, 66, W, FLOOR_TOP)
    c.drawPath(wall, linear((0, 66), (0, FLOOR_TOP), [(0, "#A6A9B0", 1), (1, "#7C7F88", 1)]))
    weave(c, wall, "paper", 1.3)
    c.drawRect(skia.Rect.MakeLTRB(0, 500, W, FLOOR_TOP), surface("wood", 0.7))
    c.drawRect(skia.Rect.MakeLTRB(0, 500, W, FLOOR_TOP), fill("#9CA0A8", 0.42))
    c.drawLine(0, 500, W, 500, stroke(INK, 4))
    floor = box(0, FLOOR_TOP, W, H)
    c.drawPath(floor, surface("marble", 1.2))
    c.drawPath(floor, fill("#8C9098", 0.78))
    for x in range(-1600, 3400, 200):
        c.drawLine(VANISH[0] + (x - VANISH[0]) * 0.42, FLOOR_TOP, x, H, stroke("#2E3036", 2.5, 0.65))
    y, step = FLOOR_TOP, 34
    while y < H:
        c.drawLine(0, y, W, y, stroke("#2E3036", 2.5, 0.65))
        y += step
        step *= 1.32
    c.drawLine(0, FLOOR_TOP, W, FLOOR_TOP, stroke(INK, 5))
    text(c, "HALDEN INNOVATION BUILDING", 620, 132, font("display", 44), fill(INK, 0.9), align="center", tracking=4)


def exit_doors(c):
    frame = rrect(986, 158, 1520, 650, 4)
    outside = box(1004, 176, 1502, 640)
    c.drawPath(frame, fill("#3C3F48"))
    c.save()
    c.clipPath(outside)
    c.translate(1004, 120)
    c.scale(0.46, 0.5)
    campus_view(c, 3.0)
    c.restore()
    c.save()
    c.clipPath(outside)
    # The car park: a lamp, and one small hatchback left under it.
    c.drawLine(1400, 640, 1400, 330, stroke("#16171C", 8))
    glow(c, (1400, 326), 110, "#FFFFFF", 0.5)
    c.drawCircle(1400, 326, 13, fill("#FFFFFF"))
    car = skia.Path()
    car.moveTo(1216, 606)
    car.lineTo(1226, 572)
    car.quadTo(1272, 540, 1316, 546)
    car.quadTo(1344, 550, 1362, 576)
    car.lineTo(1396, 584)
    car.lineTo(1400, 606)
    car.close()
    c.drawPath(car, fill("#9CA0A8"))
    c.drawPath(car, stroke("#16171C", 3))
    c.drawPath(poly([(1244, 574), (1272, 556), (1312, 554), (1338, 576)]), fill("#22242B"))
    for x in (1252, 1362):
        c.drawCircle(x, 606, 16, fill("#101014"))
    c.drawRect(skia.Rect.MakeLTRB(1004, 616, 1502, 640), fill("#26282E"))
    c.restore()
    c.save()
    c.clipPath(outside)
    c.translate(1004, 60)
    c.scale(0.5, 0.5)
    rain_streaks(c, 3.0)
    c.restore()
    c.drawRect(skia.Rect.MakeLTRB(1004, 176, 1502, 640), fill("#C8CCD8", 0.08))
    c.drawPath(poly([(1040, 176), (1140, 176), (1040, 640), (1004, 640), (1004, 300)]), fill("#FFFFFF", 0.09))
    c.drawRect(skia.Rect.MakeLTRB(1244, 176, 1262, 650), fill("#3C3F48"))
    for x in (1218, 1270):
        c.drawPath(rrect(x, 350, x + 14, 490, 6), fill("#C4C6CC"))
        c.drawPath(rrect(x, 350, x + 14, 490, 6), stroke(INK, 2.5))
    c.drawPath(frame, stroke(INK, 5))
    # The lit exit sign, the badge reader, the mat and an umbrella stand.
    sign = rrect(1176, 88, 1330, 146, 4)
    c.drawPath(sign, fill("#F4F4F0"))
    c.drawPath(sign, stroke(INK, 4))
    text(c, "EXIT", 1253, 132, font("display", 38), fill("#20242C"), align="center", tracking=4)
    glow(c, (1253, 116), 130, "#FFFFFF", 0.3)
    reader = rrect(948, 348, 978, 412, 4)
    outlined(c, reader, fill("#30343E"), 3)
    c.drawCircle(963, 366, 6, fill("#FFFFFF"))
    c.drawPath(poly([(1000, 652), (1508, 652), (1560, 736), (960, 736)]), fill("#3A3C44"))
    c.drawPath(poly([(1000, 652), (1508, 652), (1560, 736), (960, 736)]), stroke(INK, 3.5))
    stand = rrect(1524, 520, 1584, 660, 8)
    for x, tip in ((1540, -14), (1558, 8), (1570, 18)):
        c.drawLine(x, 560, x + tip, 438, stroke("#20242C", 11))
    outlined(c, stand, fill("#6A6D76"), 3.5)


def security_desk(c):
    # Behind the desk: the key board and a rota. The desk is empty because Ozzy is up at Lab 4.
    board = box(96, 196, 320, 372)
    outlined(c, board, fill("#D9D4C6"), 4)
    for r in range(3):
        for k in range(6):
            x, y = 118 + k * 36, 228 + r * 50
            c.drawCircle(x, y, 4, fill(INK))
            c.drawLine(x, y, x, y + 26, stroke("#6A6D76", 4))
    rota = box(350, 200, 476, 372)
    outlined(c, rota, fill("#F2EFE6"), 3.5)
    text(c, "ROUNDS", 413, 228, font("type", 16), fill(INK), align="center")
    for y in range(248, 360, 16):
        c.drawLine(364, y, 462, y, stroke(INK, 2, 0.5))
    # His chair, turned away with a jacket on it.
    back = rrect(196, 366, 330, 520, 24)
    outlined(c, back, fill("#3A3C44"), 4)
    jacket = poly([(204, 372), (322, 372), (330, 500), (196, 500)])
    c.drawPath(jacket, fill("#54565E"))
    c.drawPath(jacket, stroke(INK, 3))
    c.drawPath(rrect(226, 410, 300, 452, 3), fill("#D8D8D4"))
    text(c, "SECURITY", 263, 437, font("display", 15), fill(INK), align="center")
    # The counter, with what he left on it.
    top = poly([(44, 548), (560, 548), (594, 594), (20, 594)])
    outlined(c, top, fill("#B4B8BE"), 4)
    front = box(20, 594, 594, 816)
    outlined(c, front, surface("wood", 0.9), 5)
    c.drawPath(front, fill("#9CA0A8", 0.34))
    for x in range(130, 590, 110):
        c.drawLine(x, 594, x, 816, stroke(INK, 3))
    plate = rrect(180, 650, 436, 712, 5)
    outlined(c, plate, fill("#E8E6DE"), 3.5)
    text(c, "RECEPTION", 308, 694, font("display", 30), fill(INK), align="center", tracking=3)
    # Monitor bank, a flask, the sign-in clipboard, and a phone left leaning on the flask with the football on.
    screen = rrect(116, 448, 266, 556, 6)
    shadowed(c, screen, fill("#30343E"), 4)
    for i, (x, y) in enumerate(((128, 460), (196, 460), (128, 510), (196, 510))):
        c.drawRect(skia.Rect.MakeLTRB(x, y, x + 60, y + 42), fill("#8C9098" if i != 2 else "#C9CBD0"))
    flask = rrect(330, 470, 374, 566, 12)
    shadowed(c, flask, linear((330, 0), (374, 0), [(0, "#9CA0A8", 1), (0.4, "#E0E2E6", 1), (1, "#7C7F88", 1)]), 3.5)
    c.drawPath(rrect(338, 454, 366, 472, 4), fill("#30343E"))
    phone = rrect(378, 498, 426, 566, 6)
    outlined(c, phone, fill("#101014"), 3)
    c.drawRect(skia.Rect.MakeLTRB(384, 506, 420, 556), fill("#B4B8BE"))
    text(c, "2-1", 402, 536, font("display", 15), fill(INK), align="center")
    with onto(c, (120, 150), [(456, 548), (536, 546), (560, 586), (452, 590)]):
        c.drawRect(skia.Rect.MakeWH(120, 150), fill("#F2EFE6"))
        for y in range(30, 146, 14):
            c.drawLine(10, y, 110, y, stroke(INK, 3, 0.45))
        c.drawPath(rrect(36, 0, 84, 16, 3), fill("#6A6D76"))


def lobby_furniture(c):
    # A drinks machine and a noticeboard.
    machine = rrect(806, 214, 944, 626, 6)
    shadowed(c, machine, fill("#50535C"), 4)
    c.drawRect(skia.Rect.MakeLTRB(822, 232, 928, 470), fill("#D8D8D4"))
    for r in range(4):
        for k in range(3):
            c.drawPath(rrect(832 + k * 32, 244 + r * 56, 860 + k * 32, 288 + r * 56, 5), fill("#6A6D76" if (r + k) % 2 else "#9CA0A8"))
    c.drawPath(rrect(838, 500, 912, 566, 3), fill("#16171C"))
    board = box(624, 214, 782, 384)
    outlined(c, board, surface("wood", 0.3), 4)
    for x, y, w, h, tilt in ((636, 226, 62, 82, -3), (708, 232, 64, 58, 4), (640, 316, 56, 54, 2), (706, 298, 66, 74, -2)):
        c.save()
        c.rotate(tilt, x + w / 2, y)
        c.drawRect(skia.Rect.MakeXYWH(x, y, w, h), fill("#F2EFE6"))
        c.drawRect(skia.Rect.MakeXYWH(x, y, w, h), stroke(INK, 2))
        for k in range(3):
            c.drawLine(x + 8, y + 16 + k * 14, x + w - 8, y + 16 + k * 14, stroke(INK, 2.5, 0.5))
        c.restore()


def wet_floor_cone(c):
    c.drawPath(poly([(1034, 880), (1070, 748), (1106, 880)]), fill("#E8E6DE"))
    c.drawPath(poly([(1034, 880), (1070, 748), (1106, 880)]), stroke(INK, 4))
    text(c, "WET", 1070, 842, font("display", 16), fill(INK), align="center")
    text(c, "FLOOR", 1070, 862, font("display", 13), fill(INK), align="center")
    for x, y, r in ((1000, 760, 38), (1130, 816, 46), (1230, 760, 30)):
        puddle = skia.Path()
        puddle.addOval(skia.Rect.MakeLTRB(x - r * 1.5, y - r * 0.32, x + r * 1.5, y + r * 0.32))
        c.drawPath(puddle, fill("#FFFFFF", 0.14))


def rena_leaving(c, feet, s):
    """Rena crossing the lobby in her coat, the full tote hugged to her chest, the lanyard swung out of her coat."""
    def at(x, y):
        return feet[0] + (x - 200) * s, feet[1] + (y - 520) * s

    shadow = skia.Path()
    shadow.addOval(skia.Rect.MakeLTRB(*at(84, 490), *at(330, 540)))
    c.drawPath(shadow, fill("#000000", 0.32))
    suspect(c, "rectangle", 20, feet, s)
    coat = skia.Path()
    coat.moveTo(*at(114, 286))
    coat.quadTo(*at(200, 268), *at(286, 286))
    coat.lineTo(*at(312, 480))
    coat.quadTo(*at(200, 498), *at(88, 480))
    coat.close()
    c.drawPath(coat, fill("#34363E"))
    weave(c, coat, "linen", 0.7)
    c.drawPath(coat, stroke(INK, LINE))
    c.drawPath(poly([at(166, 282), at(200, 340), at(234, 282)]), fill("#1E2026"))
    c.drawPath(poly([at(166, 282), at(200, 340), at(234, 282)], close=False), stroke(INK, 4))
    # The tote: stuffed, with the hard corners of what's inside pushing at the cloth.
    tote = skia.Path()
    tote.moveTo(*at(122, 326))
    tote.lineTo(*at(266, 326))
    tote.lineTo(*at(278, 462))
    tote.quadTo(*at(194, 478), *at(110, 462))
    tote.close()
    soft_shadow(c, tote, 4, 8, 6, 0.4)
    c.drawPath(tote, fill("#BDBDB6"))
    weave(c, tote, "linen", 0.8)
    c.drawPath(tote, stroke(INK, LINE))
    edge = poly([at(136, 372), at(246, 372), at(254, 448), at(130, 450)])
    c.drawPath(edge, stroke("#7F7F78", 5))
    c.drawPath(poly([at(136, 372), at(152, 354), at(258, 354), at(246, 372)], close=False), stroke("#7F7F78", 4))
    c.drawLine(*at(258, 354), *at(254, 448), stroke("#8F8F88", 3))
    # Her arms round it: the coat's sleeves, drawn over the top of the bag.
    sleeves = rrect(*at(98, 316), *at(300, 356), 20 * s)
    c.drawPath(sleeves, fill("#4A4C55"))
    weave(c, sleeves, "linen", 0.7)
    c.drawPath(sleeves, stroke(INK, LINE))
    # The lanyard, out of the coat and swinging free beside the bag.
    strap = curve_path(at(214, 288), at(300, 296), at(344, 386))
    c.drawPath(strap, stroke("#08080C", 9))
    x, y = at(344, 444)
    c.save()
    c.rotate(-8, x, y - 50)
    card = rrect(x - 48, y - 58, x + 48, y + 54, 7)
    c.drawPath(card, fill("#101014"))
    c.drawPath(card, stroke("#E0E2E6", 2.5))
    c.drawPath(rrect(x - 12, y - 52, x + 12, y - 45, 2), fill("#6A6D76"))
    kestrel_mark(c, x, y - 12, 2.3, "#F4F4F0")
    bold = font("body", 16)
    bold.setEmbolden(True)
    text(c, "KESTREL", x, y + 36, bold, fill("#F4F4F0"), align="center", tracking=1.5)
    c.restore()


def camera_overlay(c):
    """What the recorder burns on: the camera and the time, and a timid signal."""
    c.drawRect(skia.Rect.MakeLTRB(26, 24, 168, 80), fill("#000000", 0.72))
    c.drawRect(skia.Rect.MakeLTRB(W - 256, 24, W - 26, 80), fill("#000000", 0.72))
    text(c, "CAM2", 40, 66, font("type", 40), fill("#FFFFFF"))
    text(c, "21:19:40", W - 40, 66, font("type", 40), fill("#FFFFFF"), align="right")
    rng = random.Random(30)
    for _ in range(9):
        y = rng.uniform(0, H)
        c.drawRect(skia.Rect.MakeLTRB(0, y, W, y + rng.uniform(1, 4)), fill("#FFFFFF", rng.uniform(0.02, 0.07)))


def paint_lobby(c):
    lobby_room(c)
    security_desk(c)
    lobby_furniture(c)
    exit_doors(c)
    wet_floor_cone(c)
    rena_leaving(c, (640, 1040), 1.28)
    c.drawRect(skia.Rect.MakeWH(W, H), radial((800, 600), 1040, [(0, "#000000", 0), (0.6, "#000000", 0), (1, "#000000", 0.4)]))
    camera_overlay(c)


CCTV_LOOK = Look(bloom=0.18, bloom_threshold=0.8, halation=0, contrast=1.1, saturation=0, fringe=0, vignette=0.12, grain=0.028, flicker=0)
FLASH_LOOK = Look(bloom=0.14, bloom_threshold=0.86, halation=0.05, contrast=1.1, saturation=0.92, fringe=0.6, vignette=0.2, grain=0.024, flicker=0)

# name: (painter, look, exposure)
PHOTOS = {
    "case001-linkedin": (paint_linkedin, PHOTO_LOOK, 1.08),
    "case001-incident": (paint_incident, FLASH_LOOK, 1.1),
    "case001-lobby": (paint_lobby, CCTV_LOOK, 1.04),
}

# Where each clue sits, in percent of the picture: x, y, w, h. Keep the "area" items in case-001.ts the same.
AREAS = {
    "case001-linkedin": {
        "halo": (9, 30, 15, 12),
        "clock": (66, 5, 11, 15),
        "laptop": (44, 51, 20, 30),
        "rena": (64, 28, 15, 37),
        "coat": (86, 49, 14, 26),
    },
    "case001-incident": {
        "cabinet": (1, 9, 26, 44),
        "screen": (45, 48, 20, 24),
        "clip": (61, 84, 10, 8),
    },
    "case001-lobby": {
        "rena": (32, 36, 16, 30),
        "bag": (33, 66, 13, 15),
        "lanyard": (47, 71, 8, 13),
    },
}


def render(paint, look, exposure):
    size = round(W * SCALE), round(H * SCALE)
    surf = skia.Surface(*size)
    c = surf.getCanvas()
    c.clear(skia.ColorBLACK)
    c.scale(SCALE, SCALE)
    paint(c)
    rgba = surf.makeImageSnapshot().toarray(colorType=skia.kRGBA_8888_ColorType)
    done = finish(rgba[..., :3].astype(np.float32) / 255.0, 1, look, exposure=exposure)
    return Image.fromarray((done * 255).astype(np.uint8))


def check_sheet(name, img):
    """The picture as a phone shows it, each clue blown up, and the tap areas drawn on."""
    from PIL import ImageDraw

    areas = AREAS[name]
    pw, ph = 360, 270
    rows = (len(areas) + 4) // 3
    sheet = Image.new("RGB", (pw * 3 + 32, (ph + 8) * rows + 8), "#0b0d1a")
    sheet.paste(img.resize((pw, ph), Image.LANCZOS), (8, 8))
    marked = img.resize((pw, ph), Image.LANCZOS)
    draw = ImageDraw.Draw(marked)
    for x, y, w, h in areas.values():
        draw.rectangle([x * pw / 100, y * ph / 100, (x + w) * pw / 100, (y + h) * ph / 100], outline="#ff3b3b", width=2)
    sheet.paste(marked, (pw + 16, 8))
    for i, (x, y, w, h) in enumerate(areas.values(), start=2):
        # Each crop is a 4:3 window around the clue, the shape the game's close-up uses.
        cx, cy = (x + w / 2) / 100 * img.width, (y + h / 2) / 100 * img.height
        half_w = max(w * 0.62 / 100 * img.width, h * 0.62 / 100 * img.height * 4 / 3)
        half_h = half_w * 3 / 4
        cx = min(max(cx, half_w), img.width - half_w)
        cy = min(max(cy, half_h), img.height - half_h)
        crop = img.crop((round(cx - half_w), round(cy - half_h), round(cx + half_w), round(cy + half_h))).resize((pw, ph), Image.LANCZOS)
        sheet.paste(crop, (8 + (i % 3) * (pw + 8), 8 + (i // 3) * (ph + 8)))
    sheet.save(OUT / f"{name}-check.png")


def main(check=False):
    OUT.mkdir(parents=True, exist_ok=True)
    GAME.mkdir(parents=True, exist_ok=True)
    for name, (paint, look, exposure) in PHOTOS.items():
        img = render(paint, look, exposure)
        img.save(OUT / f"{name}.png")
        img.save(GAME / f"{name}.webp", quality=90, method=6)
        if check:
            check_sheet(name, img)
        print(f"painted {name}: {img.width}x{img.height}")


if __name__ == "__main__":
    main("check" in sys.argv[1:])
