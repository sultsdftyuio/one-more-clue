"""Case 001, The Last Message: the opening film.

    python -m omc_cinema.case001 preview    # 3-second style test: the message being rewritten

The set is Lab 4 at night, built in depth layers so the camera can push
through it: the rainy campus beyond the window (far), the wall with Cabinet B
and the clock, the bench with Priya's laptop (the focus plane), and blurred
glassware in the foreground. The person at the laptop is only ever a
silhouette lit by the screen: the film shows the lie being made, never who
made it.
"""
from __future__ import annotations

import math
import sys
import time

import skia
from omc_art.palette import CORAL, CREAM, INK, MUSTARD

from . import sound
from .film import (FPS, OUT, Camera, Encoder, ease_in_out, ease_out, fill, font, glow, layer, lerp, linear, noise1, poly,
                   radial, render_frame, rgb, rrect, smooth, span, stroke, text, W, H)
from .kit import caption
from .look import Look, finish
from .voice import line

SCREEN = "#E8F0FF"
SCREEN_LIGHT = "#9CC7FF"
SHADOW = "#05060E"
WALL_TOP, WALL_BOTTOM = "#0E1126", "#191D3D"
OUTLINE = 10

ORIGINAL = "Leaving HALO in Cabinet B, locked. Night all"
FORGED = "Taking HALO home tonight"


# ---------------------------------------------------------------------------
# The set

def campus_view(c, t):
    """Far layer: the campus at night through the rain, mostly glow and silhouettes."""
    c.drawRect(skia.Rect.MakeLTRB(-300, -300, 1400, 1500), linear((0, 100), (0, 1150), [(0, "#070A1F", 1), (0.7, "#1A1F4A", 1), (1, "#3A2C4E", 1)]))
    # Far buildings, then nearer ones, each with a few lit windows.
    for row, (base, tone, seed) in enumerate(((930, "#0D1030", 3), (1010, "#090B22", 7))):
        x = -260
        k = seed
        while x < 1300:
            k = (k * 1103515245 + 12345) & 0x7FFFFFFF
            w = 90 + k % 120
            h = 160 + (k >> 8) % 260 - row * 60
            c.drawRect(skia.Rect.MakeLTRB(x, base - h, x + w, base + 600), fill(tone))
            for wy in range(int(base - h + 24), base - 20, 34):
                for wx in range(int(x + 14), int(x + w - 14), 26):
                    k = (k * 1103515245 + 12345) & 0x7FFFFFFF
                    if k % 7 == 0:
                        c.drawRect(skia.Rect.MakeXYWH(wx, wy, 12, 16), fill(MUSTARD if k % 3 else "#7FD3CB", 0.75))
            x += w + 18
    # Street lamps, as soft bokeh.
    for i, (bx, by, r) in enumerate(((140, 990, 46), (420, 1010, 34), (760, 985, 52), (980, 1015, 30))):
        flick = 0.85 + 0.15 * noise1(t * 3, i)
        glow(c, (bx, by), r * 2.2, MUSTARD, 0.35 * flick, blend=skia.BlendMode.kSrcOver)
        c.drawCircle(bx, by, r * 0.5, fill("#FFE2A0", 0.9))


def rain_streaks(c, t):
    """Rain falling past the window: long thin streaks, fast."""
    paint = stroke("#A9BCFF", 2.2, 0.22)
    for i in range(140):
        x0 = (i * 97.3) % 1400 - 200
        speed = 1900 + (i * 37) % 900
        y0 = ((i * 151.7) + t * speed) % 1500 - 300
        c.drawLine(x0, y0, x0 - 22, y0 + 90, paint)


WINDOW = skia.Rect.MakeLTRB(110, 250, 690, 1010)


def wall(c, t, clock_time=(12, 41), cabinet_open=False):
    """The back wall: window (with the campus showing through), Cabinet B, the clock at 9:mm:ss."""
    outer = skia.Path()
    outer.addRect(skia.Rect.MakeLTRB(-500, -500, 1600, 2500))
    hole = skia.Path()
    hole.addRect(WINDOW)
    c.drawPath(skia.Op(outer, hole, skia.PathOp.kDifference_PathOp), linear((0, 0), (0, 1700), [(0, WALL_TOP, 1), (1, WALL_BOTTOM, 1)]))

    # Drops on the glass, slowly sliding.
    c.save()
    c.clipRect(WINDOW)
    for i in range(46):
        x = WINDOW.left() + (i * 73.1) % WINDOW.width()
        y = WINDOW.top() + ((i * 211.3) + t * (12 + (i % 5) * 9)) % WINDOW.height()
        r = 3 + (i % 4) * 2
        c.drawCircle(x, y, r, fill("#C9D6FF", 0.18))
        c.drawCircle(x - r * 0.3, y - r * 0.3, r * 0.35, fill("#FFFFFF", 0.45))
    c.restore()

    # Window frame and mullions, in the house ink-outlined style.
    frame = "#232852"
    for r_ in (skia.Rect.MakeLTRB(WINDOW.left() - 26, WINDOW.top() - 26, WINDOW.right() + 26, WINDOW.top()),
               skia.Rect.MakeLTRB(WINDOW.left() - 26, WINDOW.bottom(), WINDOW.right() + 26, WINDOW.bottom() + 34),
               skia.Rect.MakeLTRB(WINDOW.left() - 26, WINDOW.top(), WINDOW.left(), WINDOW.bottom()),
               skia.Rect.MakeLTRB(WINDOW.right(), WINDOW.top(), WINDOW.right() + 26, WINDOW.bottom()),
               skia.Rect.MakeLTRB(WINDOW.centerX() - 9, WINDOW.top(), WINDOW.centerX() + 9, WINDOW.bottom()),
               skia.Rect.MakeLTRB(WINDOW.left(), WINDOW.centerY() - 9, WINDOW.right(), WINDOW.centerY() + 9)):
        c.drawRect(r_, fill(frame))
    c.drawRect(WINDOW.makeOutset(26, 26), stroke(INK, OUTLINE))
    c.drawRect(WINDOW, stroke(INK, OUTLINE * 0.7))

    clock(c, t, 850, 420, 118, *clock_time)
    plaque(c, 850, 620)
    cabinet(c, t, cabinet_open)


def clock(c, t, x, y, r, minute=12, second0=41):
    """The wall clock at 9:<minute>. The second hand ticks on every whole second."""
    c.drawCircle(x, y + 10, r + 8, fill("#000000", 0.35))
    c.drawCircle(x, y, r, fill(CREAM))
    c.drawCircle(x, y, r, stroke(INK, OUTLINE))
    for i in range(60):
        a = math.radians(i * 6)
        long_ = i % 5 == 0
        r0 = r - (26 if long_ else 14)
        c.drawLine(x + math.sin(a) * r0, y - math.cos(a) * r0, x + math.sin(a) * (r - 10), y - math.cos(a) * (r - 10),
                   stroke(INK, 7 if long_ else 3))

    def hand(angle_deg, length, width, colour):
        a = math.radians(angle_deg)
        c.drawLine(x - math.sin(a) * 16, y + math.cos(a) * 16, x + math.sin(a) * length, y - math.cos(a) * length, stroke(colour, width))

    seconds_ = second0 + math.floor(t)
    tick = ease_out(span(t - math.floor(t), 0, 0.12), 4)  # a quick, slightly springy tick
    sec_angle = (seconds_ - 1 + tick) * 6
    hand((9 + minute / 60) * 30, r * 0.5, 13, INK)
    hand((minute + seconds_ / 60) * 6, r * 0.75, 9, INK)
    hand(sec_angle, r * 0.84, 4, CORAL)
    c.drawCircle(x, y, 9, fill(CORAL))


def plaque(c, x, y):
    c.drawPath(rrect(x - 110, y - 34, x + 110, y + 34, 10), fill("#2C3266"))
    c.drawPath(rrect(x - 110, y - 34, x + 110, y + 34, 10), stroke(INK, 6))
    text(c, "LAB 4", x, y + 15, font("display", 42), fill(CREAM, 0.85), align="center", tracking=6)


def cabinet(c, t, open_=False):
    """Cabinet B: shut at 9:12; at 9:17, wide open and empty, the spare key still in the lock."""
    if open_:
        return open_cabinet(c, t)
    body = rrect(40, 1040, 400, 1620, 14)
    c.drawPath(body, linear((40, 0), (400, 0), [(0, "#3C4860", 1), (0.6, "#4D5B76", 1), (1, "#2A3349", 1)]))
    c.drawLine(220, 1060, 220, 1600, stroke(INK, 6))
    c.drawPath(rrect(250, 1300, 268, 1380, 8), fill("#8D9AB8"))
    c.drawPath(rrect(100, 1090, 190, 1160, 8), fill(CREAM, 0.9))
    text(c, "B", 145, 1146, font("display", 56), fill(INK), align="center")
    c.drawPath(body, stroke(INK, OUTLINE))


def open_cabinet(c, t):
    c.drawPath(rrect(40, 1040, 400, 1620, 14), fill("#2A3349"))
    c.drawPath(rrect(64, 1064, 376, 1596, 8), fill("#0A0C1A"))
    # The shelf, and the foam cradle HALO sat in: a glasses-shaped hollow.
    c.drawRect(skia.Rect.MakeLTRB(64, 1330, 376, 1350), fill("#4D5B76"))
    c.drawPath(rrect(96, 1250, 344, 1332, 18), fill("#2A2F4A"))
    for x in (168, 272):
        c.drawCircle(x, 1290, 34, fill("#0F1224"))
    c.drawRect(skia.Rect.MakeLTRB(196, 1284, 244, 1294), fill("#0F1224"))
    c.drawPath(rrect(160, 1352, 280, 1386, 6), fill(CREAM, 0.9))
    text(c, "HALO", 220, 1378, font("display", 28), fill(INK), align="center", tracking=3)
    # The door, swung open towards us, still carrying its "B".
    door = poly([(40, 1040), (-170, 1000), (-170, 1660), (40, 1620)])
    c.drawPath(door, linear((-170, 0), (40, 0), [(0, "#5A688A", 1), (1, "#3C4860", 1)]))
    c.drawPath(door, stroke(INK, OUTLINE))
    c.drawPath(rrect(-120, 1080, -40, 1146, 8), fill(CREAM, 0.85))
    text(c, "B", -80, 1132, font("display", 50), fill(INK), align="center")
    # The spare key, left in the lock.
    c.drawCircle(400, 1330, 16, fill("#8D9AB8"))
    c.drawPath(rrect(392, 1300, 446, 1316, 6), fill(MUSTARD))
    c.drawCircle(452, 1308, 18, stroke(MUSTARD, 8))
    c.drawPath(rrect(40, 1040, 400, 1620, 14), stroke(INK, OUTLINE))


def bench(c, t):
    """The bench and everything on it, at the focus plane."""
    c.drawRect(skia.Rect.MakeLTRB(-400, 1530, 1500, 2600), fill("#11142C"))
    c.drawPath(poly([(-400, 1490), (1500, 1490), (1500, 1540), (-400, 1540)]), linear((0, 1490), (0, 1540), [(0, "#353C70", 1), (1, "#22274D", 1)]))
    c.drawLine(-400, 1490, 1500, 1490, stroke("#5A63A8", 4, 0.8))
    # A mug and a stack of papers, clear of Cabinet B's shelf.
    c.drawPath(rrect(930, 1400, 1010, 1495, 14), fill("#2E3566"))
    c.drawPath(rrect(930, 1400, 1010, 1495, 14), stroke(INK, 7))
    c.drawPath(poly([(880, 1470), (1060, 1455), (1075, 1490), (890, 1500)]), fill("#C9C2B0", 0.5))


def chat_lines(message: str, f: skia.Font, width: float) -> list[str]:
    words, lines_, cur = message.split(" "), [], ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if f.measureText(trial) > width and cur:
            lines_.append(cur)
            cur = w
        else:
            cur = trial
    lines_.append(cur)
    return lines_


def message_at(t):
    """The words in Priya's message at time t: the original, deleted back, then the forgery typed in."""
    if t < 0.55:
        return ORIGINAL, False
    if t < 1.35:
        keep = round(len(ORIGINAL) * (1 - ease_in_out(span(t, 0.55, 1.35))))
        return ORIGINAL[:keep], True
    if t < 1.45:
        return "", True
    typed = round(len(FORGED) * span(t, 1.45, 2.4))
    return FORGED[:typed], True


SCREEN_RECT = skia.Rect.MakeLTRB(340, 1050, 850, 1420)


def laptop(c, t):
    """Priya's laptop, unlocked, with the lab chat open."""
    lid = rrect(SCREEN_RECT.left() - 22, SCREEN_RECT.top() - 22, SCREEN_RECT.right() + 22, SCREEN_RECT.bottom() + 18, 18)
    c.drawPath(lid, fill("#1A1D33"))
    c.drawPath(lid, stroke(INK, OUTLINE))
    edit_flash = 0.25 * max(0.0, 1 - abs(t - 2.5) * 6)
    c.drawRect(SCREEN_RECT, fill(SCREEN))
    c.save()
    c.clipRect(SCREEN_RECT)
    # Header bar.
    c.drawRect(skia.Rect.MakeLTRB(SCREEN_RECT.left(), SCREEN_RECT.top(), SCREEN_RECT.right(), SCREEN_RECT.top() + 54), fill("#2A2F5C"))
    c.drawCircle(SCREEN_RECT.left() + 30, SCREEN_RECT.top() + 27, 9, fill("#3FB8AF"))
    text(c, "Lab 4 crew", SCREEN_RECT.left() + 52, SCREEN_RECT.top() + 37, font("body", 26), fill(CREAM))
    # An older message, small, for context.
    y = SCREEN_RECT.top() + 78
    c.drawPath(rrect(SCREEN_RECT.left() + 18, y, SCREEN_RECT.right() - 90, y + 64, 16), fill("#D3DBF0"))
    text(c, "Prof. Squires", SCREEN_RECT.left() + 34, y + 25, font("body", 18), fill("#4A4F7A"))
    text(c, "NOBODY touches HALO.", SCREEN_RECT.left() + 34, y + 52, font("body", 24), fill(INK))
    # Priya's message, being rewritten.
    words, editing = message_at(t)
    f = font("body", 33)
    f.setEmbolden(True)
    rows = chat_lines(words, f, SCREEN_RECT.width() - 110) if words else [""]
    y = SCREEN_RECT.top() + 166
    bubble_h = 70 + 44 * len(rows)
    c.drawPath(rrect(SCREEN_RECT.left() + 18, y, SCREEN_RECT.right() - 18, y + bubble_h, 18), fill(MUSTARD))
    text(c, "Priya  ·  8:40 PM", SCREEN_RECT.left() + 38, y + 32, font("body", 20), fill(INK, 0.7))
    for i, row in enumerate(rows):
        text(c, row, SCREEN_RECT.left() + 38, y + 76 + i * 44, f, fill(INK))
    # The cursor: solid while typing, blinking when still.
    last = rows[-1]
    cx = SCREEN_RECT.left() + 40 + f.measureText(last)
    cy = y + 76 + (len(rows) - 1) * 44
    blink = editing or (math.sin(t * math.pi * 3) > 0)
    if blink and t < 2.45:
        c.drawRect(skia.Rect.MakeLTRB(cx, cy - 32, cx + 4, cy + 6), fill(INK))
    if t >= 2.45:
        s = ease_out(span(t, 2.45, 2.62), 4)
        c.save()
        c.translate(SCREEN_RECT.right() - 120, y + 24)
        c.rotate(-8)
        c.scale(lerp(2.2, 1.0, s), lerp(2.2, 1.0, s))
        c.drawPath(rrect(-62, -22, 62, 22, 8), fill(CORAL, s))
        text(c, "EDITED", 0, 11, font("type", 28), fill(CREAM, s), align="center", tracking=2)
        c.restore()
    if edit_flash:
        c.drawRect(SCREEN_RECT, fill("#FFFFFF", edit_flash))
    c.restore()
    # Keyboard deck.
    c.drawPath(poly([(SCREEN_RECT.left() - 40, 1440), (SCREEN_RECT.right() + 40, 1440), (SCREEN_RECT.right() + 90, 1500), (SCREEN_RECT.left() - 90, 1500)]), fill("#262A47"))
    c.drawPath(poly([(SCREEN_RECT.left() - 40, 1440), (SCREEN_RECT.right() + 40, 1440), (SCREEN_RECT.right() + 90, 1500), (SCREEN_RECT.left() - 90, 1500)]), stroke(INK, 7))


def typing(t):
    """How hard the hands are working: on while deleting and typing."""
    return 1.0 if 0.55 <= t < 1.35 or 1.45 <= t < 2.4 else 0.0


def figure(c, t):
    """The person at the laptop: a silhouette, lit only along the edge facing the screen."""
    bob = typing(t) * 3 * math.sin(t * 38)
    body = skia.Path()
    body.moveTo(1240, 2100)
    body.lineTo(1240, 980)
    body.cubicTo(1190, 900, 1080, 880, 1010, 930)   # shoulder
    body.cubicTo(950, 970, 930, 1050, 925, 1150)     # collar
    body.cubicTo(915, 1300, 880, 1500, 860, 2100)
    body.close()
    head = skia.Path()
    head.addOval(skia.Rect.MakeLTRB(930, 690, 1130, 900))
    brim = poly([(900, 760), (1150, 735), (1160, 770), (905, 795)])  # a hat brim shades the face
    arm = skia.Path()
    arm.moveTo(980, 1040)
    arm.cubicTo(880, 1150, 800, 1300, 760 + bob, 1450 + bob)
    arm.lineTo(700 + bob, 1460 + bob)
    arm.cubicTo(760, 1300, 860, 1120, 930, 1010)
    arm.close()
    for p in (body, head, brim, arm):
        c.drawPath(p, fill(SHADOW))
    # Rim light from the screen, on the edges that face it.
    rim = skia.Paint(Color=rgb(SCREEN_LIGHT, 0.75), AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=5)
    rim.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 3))
    for p in (arm, head):
        c.save()
        c.clipPath(p, doAntiAlias=True)
        c.drawPath(p, rim)
        c.restore()
    hand = skia.Rect.MakeLTRB(670 + bob, 1430 + bob, 770 + bob, 1485 + bob)
    c.drawOval(hand, fill("#0B0D1A"))
    c.drawOval(hand, stroke(SCREEN_LIGHT, 3, 0.6))


def screen_light(c, t):
    """The laptop's light falling on the bench, the hand and the figure."""
    pulse = 0.9 + 0.1 * noise1(t * 5, 3) + 0.4 * max(0.0, 1 - abs(t - 2.5) * 6)
    cx, cy = SCREEN_RECT.centerX(), SCREEN_RECT.centerY() + 60
    glow(c, (cx, cy), 760, SCREEN_LIGHT, 0.32 * pulse)


def moonlight(c, t):
    """A cold shaft from the window across the room, with dust turning in it."""
    shaft = poly([(WINDOW.left(), WINDOW.top()), (WINDOW.right(), WINDOW.top()), (1300, 1900), (300, 2000)])
    c.drawPath(shaft, linear((400, 300), (800, 1900), [(0, "#7F95FF", 0.10), (1, "#7F95FF", 0)], blend=skia.BlendMode.kPlus))


def dust(c, t, seed=0, count=60, size=3.0, alpha=0.5):
    for i in range(count):
        k = i * 7.13 + seed
        x = 300 + (k * 131.7) % 700 + 30 * math.sin(t * 0.6 + k)
        y = 1000 + (k * 97.1) % 700 - t * (8 + i % 7) + 20 * math.cos(t * 0.4 + k)
        c.drawCircle(x, y, size * (0.6 + (i % 3) * 0.3), fill("#DCE8FF", alpha * (0.4 + 0.6 * ((i * 13) % 10) / 10), blend=skia.BlendMode.kPlus))


def foreground_glass(c, t):
    """Out-of-focus beakers at the front edge of the bench."""
    for x, w, h in ((-40, 190, 420), (150, 120, 300)):
        p = rrect(x, 2000 - h, x + w, 2120, 24)
        c.drawPath(p, fill("#0A0C1C", 0.92))
        c.drawPath(p, stroke(SCREEN_LIGHT, 6, 0.45))


# ---------------------------------------------------------------------------
# Overlays (not part of the set, so the camera doesn't move them)

def chyron(c, t, full="LAB 4  ·  9:12 PM"):
    """Top-left place and time, typed on like a case file."""
    shown = full[: round(len(full) * span(t, 0.25, 0.85))]
    a = smooth(span(t, 0.25, 0.4)) * (1 - smooth(span(t, 2.75, 3.0)) * 0.6)
    text(c, shown, 72, 150, font("type", 46), fill(CREAM, a), tracking=3)
    c.drawLine(72, 172, 72 + 380 * smooth(span(t, 0.3, 0.9)), 172, stroke(MUSTARD, 4, a))


# ---------------------------------------------------------------------------
# The preview shot

PREVIEW_LINE = "Someone rewrote the last message."
LINE_AT = 0.2


def preview_camera(t):
    push = ease_in_out(span(t, 0.0, 2.6))
    hit = max(0.0, 1 - (t - 2.55) * 5) if t >= 2.55 else 0.0
    return Camera(
        x=lerp(560, 600, push) + noise1(t * 0.9, 1) * 4 + hit * 6 * math.sin(t * 90),
        y=lerp(1150, 1290, push) + noise1(t * 0.8, 2) * 4 + hit * 5 * math.cos(t * 83),
        zoom=lerp(1.0, 1.2, push) + hit * 0.015,
        roll=noise1(t * 0.5, 4) * 0.25,
        focus=lerp(0.78, 1.0, smooth(span(t, 0.2, 1.3))),
        aperture=26,
    )


def preview_frame(c, t):
    cam = preview_camera(t)
    with layer(c, cam, 0.55, extra_blur=3) as lc:
        campus_view(lc, t)
        rain_streaks(lc, t)
    with layer(c, cam, 0.78) as lc:
        wall(lc, t)
        moonlight(lc, t)
    with layer(c, cam, 1.0) as lc:
        bench(lc, t)
        laptop(lc, t)
        figure(lc, t)
        screen_light(lc, t)
    with layer(c, cam, 1.25) as lc:
        dust(lc, t, seed=1, count=40, size=3.5, alpha=0.45)
    with layer(c, cam, 1.55) as lc:
        foreground_glass(lc, t)
        dust(lc, t, seed=9, count=14, size=9, alpha=0.25)
    chyron(c, t)
    caption(c, t, PREVIEW_LINE, LINE_AT, LINE_AT + 1.9)


def preview_sound(duration, voice):
    mix = sound.Mix(duration)
    rng = mix.rng
    mix.add(sound.rain(duration, rng, 0.9), 0, gain=0.55)
    mix.add(sound.drone(duration, 55, rng), 0, gain=0.9, reverb=0.2)
    for s in range(4):
        mix.add(sound.clock_tick(rng, tock=s % 2 == 1), s + 0.0, gain=0.35, pan=0.55, reverb=0.35)
    # A key per character deleted and typed, with a little human jitter.
    for i in range(len(ORIGINAL)):
        at = 0.55 + 0.8 * i / len(ORIGINAL) + rng.uniform(-0.006, 0.006)
        mix.add(sound.key_click(rng, backspace=True), at, gain=0.45, pan=-0.1, reverb=0.15)
    for i in range(len(FORGED)):
        at = 1.45 + 0.95 * i / len(FORGED) + rng.uniform(-0.012, 0.012)
        mix.add(sound.key_click(rng), at, gain=0.5, pan=-0.1, reverb=0.15)
    mix.add(sound.riser(0.9, rng), 1.65, gain=0.35)
    mix.add(sound.impact(rng), 2.5, gain=1.0, reverb=0.5)
    mix.add(voice, LINE_AT, gain=1.25, reverb=0.12)
    return mix.master()


# ---------------------------------------------------------------------------
# The close-up: the message being rewritten, framed for a phone

SCREEN_UP = skia.Rect.MakeLTRB(96, 380, 984, 1150)
DECK_TOP, DECK_BOTTOM = 1236, 2050


def bokeh(c, t, with_clock=True):
    """The lab behind the laptop, far out of focus: campus lights through the rain, the clock, a red standby LED."""
    c.drawRect(skia.Rect.MakeLTRB(-600, -600, 1700, 2600), linear((0, -200), (0, 1500), [(0, "#07091A", 1), (0.6, "#10142E", 1), (1, "#0A0C1E", 1)]))
    lights = ((140, 210, 95, MUSTARD, 0.55), (330, 120, 60, "#7FD3CB", 0.4), (560, 250, 120, MUSTARD, 0.35), (880, 150, 80, CORAL, 0.35),
              (990, 330, 55, MUSTARD, 0.5), (40, 520, 70, "#7FD3CB", 0.3), (760, 60, 45, "#FFE2A0", 0.6), (420, 470, 40, CORAL, 0.25))
    for i, (x, y, r, colour, a) in enumerate(lights):
        flick = 0.8 + 0.2 * noise1(t * 2.3, i * 1.7)
        # A bokeh disc: flat, with a slightly brighter rim, like a real lens wide open.
        c.drawCircle(x, y, r, fill(colour, a * 0.55 * flick, blend=skia.BlendMode.kPlus))
        c.drawCircle(x, y, r, stroke(colour, 6, a * 0.5 * flick))
    # The wall clock, huge and soft over the laptop's shoulder: still readable as 9:12.
    if with_clock:
        clock(c, t, 870, 520, 190)
    rain_streaks(c, t)


def keyboard(c, t):
    """The laptop's keyboard in perspective, lit from above by the screen."""
    def at(u, v):
        top_w, bottom_w = 980, 1700
        wv = lerp(top_w, bottom_w, v)
        return W / 2 + (u - 0.5) * wv, lerp(DECK_TOP, DECK_BOTTOM, v ** 1.15 if v > 0 else v)

    deck = poly([at(0, -0.06), at(1, -0.06), at(1, 1), at(0, 1)])
    c.drawPath(deck, linear((0, DECK_TOP), (0, DECK_BOTTOM), [(0, "#2A2F52", 1), (1, "#14172C", 1)]))
    rows, cols = 5, 13
    pressed = pressed_key(t)
    for r_ in range(rows):
        for k in range(cols):
            u0, u1 = (k + 0.08) / cols, (k + 0.92) / cols
            v0, v1 = (r_ + 0.12) / rows * 0.82 + 0.04, (r_ + 0.88) / rows * 0.82 + 0.04
            key = poly([at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)])
            down = pressed == (r_, k)
            c.drawPath(key, fill("#0C0E1D" if not down else "#20264A"))
            # The top edge of every key catches the screen's light.
            light = 0.55 * (1 - r_ / rows) + 0.15
            c.drawLine(*at(u0, v0), *at(u1, v0), stroke(SCREEN_LIGHT, 2.5, light))
    c.drawLine(*at(0, -0.06), *at(1, -0.06), stroke("#5A63A8", 5, 0.9))


TYPED_TIMES = [0.55 + 0.8 * i / len(ORIGINAL) for i in range(len(ORIGINAL))] + [1.45 + 0.95 * i / len(FORGED) for i in range(len(FORGED))]


def pressed_key(t):
    """Which key is down right now (row, column), if any: each keystroke lights one for a moment."""
    for i, at_ in enumerate(TYPED_TIMES):
        if at_ <= t < at_ + 0.045:
            return (1 + i % 3, 3 + (i * 7) % 8) if i >= len(ORIGINAL) else (0, 12)
    return None


def big_screen(c, t):
    """The lab chat, filling the frame: big enough to read on a phone."""
    s = SCREEN_UP
    lid = rrect(s.left() - 34, s.top() - 34, s.right() + 34, s.bottom() + 70, 30)
    c.drawPath(lid, fill("#191C33"))
    c.drawPath(lid, stroke(INK, 12))
    c.drawRect(s, linear((0, s.top()), (0, s.bottom()), [(0, "#D6E1F8", 1), (1, "#C3D0EE", 1)]))
    c.save()
    c.clipRect(s)
    c.drawRect(skia.Rect.MakeLTRB(s.left(), s.top(), s.right(), s.top() + 104), fill("#232852"))
    c.drawCircle(s.left() + 48, s.top() + 52, 14, fill("#3FB8AF"))
    text(c, "Lab 4 crew", s.left() + 80, s.top() + 66, font("display", 46), fill(CREAM))
    # The status-bar clock: the one detail sharp players can carry into the case.
    text(c, "9:12", s.right() - 40, s.top() + 64, font("body", 30), fill(CREAM, 0.7), align="right")

    y = s.top() + 136
    c.drawPath(rrect(s.left() + 30, y, s.right() - 170, y + 112, 26), fill("#AEBBDD"))
    text(c, "Prof. Squires  ·  6:05 PM", s.left() + 58, y + 40, font("body", 26), fill("#3B4170"))
    bold = font("body", 38)
    bold.setEmbolden(True)
    text(c, "NOBODY touches HALO.", s.left() + 58, y + 88, bold, fill(INK))

    words, editing = message_at(t)
    f = font("body", 60)
    f.setEmbolden(True)
    rows = chat_lines(words, f, s.width() - 150) if words else [""]
    y = s.top() + 290
    h = 92 + 70 * max(len(rows), 1)
    c.drawPath(rrect(s.left() + 30, y, s.right() - 30, y + h, 30), fill(MUSTARD))
    text(c, "Priya  ·  8:40 PM", s.left() + 62, y + 50, font("body", 30), fill(INK, 0.65))
    for i, row in enumerate(rows):
        text(c, row, s.left() + 62, y + 124 + i * 70, f, fill(INK))
    if t < 2.42 and (editing or math.sin(t * math.pi * 3.2) > 0):
        cx = s.left() + 66 + f.measureText(rows[-1])
        cy = y + 124 + (len(rows) - 1) * 70
        c.drawRect(skia.Rect.MakeLTRB(cx, cy - 52, cx + 6, cy + 10), fill(INK))
    if t >= 2.45:
        k = ease_out(span(t, 2.45, 2.6), 4)
        c.save()
        c.translate(s.right() - 190, y - 6)
        c.rotate(-9)
        c.scale(lerp(2.6, 1.0, k), lerp(2.6, 1.0, k))
        c.drawPath(rrect(-128, -44, 128, 44, 12), fill(CREAM, k))
        c.drawPath(rrect(-128, -44, 128, 44, 12), stroke(CORAL, 9, k))
        text(c, "EDITED", 0, 20, font("type", 58), fill(CORAL, k), align="center", tracking=4)
        c.restore()
    # The input bar, and the giveaway: the chat thinks Priya is typing.
    c.drawPath(rrect(s.left() + 30, s.bottom() - 112, s.right() - 30, s.bottom() - 30, 40), fill("#E9EEFA"))
    text(c, "Message", s.left() + 70, s.bottom() - 58, font("body", 32), fill(INK, 0.35))
    if editing and t < 2.42:
        dots = "." * (1 + int(t * 4) % 3)
        italic = font("body", 42)
        italic.setSkewX(-0.2)
        text(c, f"Priya is typing{dots}", s.left() + 44, s.bottom() - 140, italic, fill(INK, 0.8))
    # A faint reflection across the glass.
    c.drawPath(poly([(s.left(), s.top()), (s.left() + 380, s.top()), (s.left() + 80, s.bottom()), (s.left() - 300, s.bottom())]),
               fill("#FFFFFF", 0.05))
    flash = max(0.0, 1 - abs(t - 2.48) * 7)
    if flash:
        c.drawRect(s, fill("#FFFFFF", 0.35 * flash))
    c.restore()


def glove(c, t, mirror=False, phase=0.0):
    """A gloved hand on the keys, seen from behind: the back of the hand, four knuckles, fingers curled down."""
    typing_now = typing(t)
    if mirror:
        c.scale(-1, 1)
    # Sleeve and cuff, running out of frame towards the camera.
    sleeve = skia.Path()
    sleeve.moveTo(-120, 190)
    sleeve.cubicTo(-150, 330, -120, 520, -60, 760)
    sleeve.lineTo(330, 760)
    sleeve.cubicTo(280, 520, 200, 330, 130, 190)
    sleeve.close()
    c.drawPath(sleeve, linear((0, 190), (0, 700), [(0, "#151833", 1), (1, "#07080F", 1)]))
    c.drawPath(rrect(-135, 170, 145, 250, 36), fill("#1A1E3C"))
    c.drawLine(-120, 178, 130, 178, stroke(SCREEN_LIGHT, 4, 0.35))
    # Back of the hand: a leather dome, catching the screen's light near the knuckles.
    back = skia.Path()
    back.moveTo(-150, 10)
    back.cubicTo(-150, -40, 150, -40, 150, 10)
    back.cubicTo(150, 90, 120, 180, 100, 200)
    back.lineTo(-110, 200)
    back.cubicTo(-140, 170, -155, 90, -150, 10)
    back.close()
    c.drawPath(back, fill(SHADOW))
    c.drawPath(back, radial((0, -10), 220, [(0, "#3B4A7A", 0.55), (1, "#3B4A7A", 0)]))
    # Thumb, tucked along the left side.
    thumb = rrect(-215, 40, -130, 175, 42)
    c.save()
    c.rotate(-24, -160, 110)
    c.drawPath(thumb, fill(SHADOW))
    c.restore()
    # Fingers: short and foreshortened, each tapping on its own beat.
    tips = []
    for i, x in enumerate((-108, -38, 34, 104)):
        tap = typing_now * max(0.0, math.sin(t * 31 + i * 2.1 + phase)) * 16
        length = (78, 92, 88, 70)[i]
        finger = rrect(x - 30, -length - 24 + tap, x + 30, 10, 28)
        c.drawPath(finger, fill(SHADOW))
        tips.append(finger)
        c.drawCircle(x, -6, 36, fill(SHADOW))  # knuckle
    # Rim light: the edges facing the screen.
    rim = skia.Paint(Color=rgb(SCREEN_LIGHT, 0.9), AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=6)
    rim.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 3))
    for p in tips:
        c.save()
        c.clipPath(p, doAntiAlias=True)
        c.translate(0, 6)
        c.drawPath(p, rim)
        c.restore()
    sheen = skia.Path()
    sheen.moveTo(-110, -18)
    sheen.cubicTo(-60, -44, 60, -44, 112, -18)
    c.drawPath(sheen, stroke(SCREEN_LIGHT, 5, 0.5))


def hands(c, t):
    c.save()
    c.translate(720, 1500)
    c.rotate(-8)
    c.scale(1.15, 1.15)
    glove(c, t)
    c.restore()
    c.save()
    c.translate(330, 1540)
    c.rotate(10)
    c.scale(1.1, 1.1)
    glove(c, t, mirror=True, phase=1.3)
    c.restore()


def screen_spill(c, t):
    """The screen's light pooling on the keyboard and the glove."""
    pulse = 0.92 + 0.08 * noise1(t * 6, 5) + 0.5 * max(0.0, 1 - abs(t - 2.48) * 6)
    cx, cy = W / 2, SCREEN_UP.bottom() + 40
    glow(c, (cx, cy), 900, SCREEN_LIGHT, 0.28 * pulse)


CLOSEUP_LOOK = Look(bloom=0.32, bloom_threshold=0.8, halation=0.28, contrast=1.16, saturation=1.0, vignette=0.7, grain=0.04)


def closeup_camera(t):
    push = ease_in_out(span(t, 0.0, 2.7))
    hit = max(0.0, 1 - (t - 2.48) * 4) if t >= 2.48 else 0.0
    return Camera(
        x=lerp(540, 560, push) + noise1(t * 0.9, 1) * 5 + hit * 9 * math.sin(t * 95),
        y=lerp(1010, 930, push) + noise1(t * 0.8, 2) * 5 + hit * 7 * math.cos(t * 87),
        zoom=lerp(1.0, 1.13, push) + hit * 0.02,
        roll=noise1(t * 0.5, 4) * 0.35,
        focus=1.0,
        aperture=20,
    )


def closeup_frame(c, t):
    cam = closeup_camera(t)
    with layer(c, cam, 0.45, extra_blur=16) as lc:
        bokeh(lc, t)
    with layer(c, cam, 1.0) as lc:
        big_screen(lc, t)
    with layer(c, cam, 1.08) as lc:
        keyboard(lc, t)
        screen_spill(lc, t)
    with layer(c, cam, 1.3) as lc:
        hands(lc, t)
        dust(lc, t, seed=4, count=30, size=4, alpha=0.4)
    chyron(c, t)
    caption(c, t, PREVIEW_LINE, LINE_AT, LINE_AT + 2.2)


def render(name, draw, duration, audio, look=Look()):
    from scipy.io import wavfile

    OUT.mkdir(parents=True, exist_ok=True)
    wav = OUT / f"{name}.wav"
    wavfile.write(wav, sound.SR, audio)
    out = OUT / f"{name}.mp4"
    enc = Encoder(out, wav)
    frames = round(duration * FPS)
    started = time.time()
    for i in range(frames):
        t = i / FPS
        img = render_frame(draw, t)
        fade = smooth(span(t, 0, 0.35)) * (1 - 0.35 * smooth(span(t, duration - 0.25, duration)))
        enc.write(finish(img, i, look, exposure=fade))
        if i % 15 == 0:
            print(f"  frame {i + 1}/{frames}  ({time.time() - started:.0f}s)", flush=True)
    enc.close()
    print(f"done -> {out}")
    return out


def preview():
    duration = 3.0
    voice = line(PREVIEW_LINE, speed=1.0)
    render("case001-preview", closeup_frame, duration, preview_sound(duration, voice), CLOSEUP_LOOK)


if __name__ == "__main__":
    {"preview": preview}[sys.argv[1] if len(sys.argv) > 1 else "preview"]()
