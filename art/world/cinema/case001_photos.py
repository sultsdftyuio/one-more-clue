"""Case 001's evidence-photo painters, reused so the world shows the objects the players see in the photos.

Lab 4's back wall (the window, poster, clock, shelf, whiteboard and Cabinet B) and its oscilloscope, and the
lobby's reception desk, drinks machine, noticeboard, exit doors and wet-floor cone are painted here in photo
space (1600 x 1200 units); world.py places and clips them.

Copied from omc_cinema/case001_photos.py in the one-more-clue-videos repo (last changed there in a51707b,
2026-11-03), keeping the functions those pieces need. Left out: the people, the bench and what's on it, the
incident photo's floor, the lobby camera's room and overlay, and the photo renderer.

Check any change against the case's timeline (src/data/cases/case-001.ts): the world shows Lab 4 and the lobby
at 12:40 AM, after HALO has gone from Cabinet B.
"""
from __future__ import annotations

import math
import random
from contextlib import contextmanager

import skia
from omc_art.palette import CORAL, CREAM, INK, MUSTARD, MUSTARD_DK

from .case001 import campus_view, clock, rain_streaks
from .film import fill, font, glow, linear, poly, radial, rrect, stroke, text
from .kit import box, soft_shadow
from .textures import surface, weave

W, H = 1600, 1200

LINE = 5
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
# The room (Lab 4)

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
# Cabinet B, door open

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


# ---------------------------------------------------------------------------
# The photo

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


# ---------------------------------------------------------------------------
# Lobby camera 2

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
