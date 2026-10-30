"""Case 001, The Last Message: the 21-second opening film.

    python -m omc_cinema.case001_film stills     # the risky moments, as a contact sheet
    python -m omc_cinema.case001_film draft      # quick low-res film, to check timing
    python -m omc_cinema.case001_film            # the game copy (720 x 1280)
    python -m omc_cinema.case001_film master     # full size, for trailers

Five shots, each moving differently, joined on something you see or hear:

  A  0.0  The edit. Slow push-in on Priya's laptop as gloved hands rewrite her
          message. Hidden clue: the screen's clock reads 9:12. Ends with the
          screen collapsing like an old TV switching off.
  B  3.3  9:17. Pitch dark, handheld, lit only by Ozzy's torch: the clock, then a
          snap-zoom onto Cabinet B, open and empty, the spare key in the lock.
          The torch whips into the lens and whites out the frame.
  C  7.9  The lie. A tilted phone: the notification slides in and buzzes. Hard
          cut to Priya, snap-zoomed, lit by her phone: "I didn't write that!"
 C2 10.7
  D 12.5  The lineup. Four silhouettes, each revealed by a flashgun and a snap
          zoom; then the camera pulls back and the lights cut out. All four are
          treated the same: the film never points at the culprit.
  E 17.9  The title, typed, a last hit, and the tagline.
"""
from __future__ import annotations

import math
import sys

import numpy as np
import skia
from omc_art.palette import CORAL, CREAM, INK, MUSTARD

from . import sound
from .case001 import (FORGED, ORIGINAL, bench, big_screen, bokeh, campus_view, chat_lines, chyron, closeup_camera, dust, glove, keyboard,
                      rain_streaks, screen_spill, wall)
from .film import (DRAFT, FPS, GAME, MASTER, Camera, ease_in_out, ease_out, fill, font, glow, layer, lerp, linear, noise1, render_frame,
                   render_video, rrect, smooth, span, stroke, text, W, H)
from .textures import surface, weave
from .kit import box, caption, contact_sheet, darkness, risky_moments, soft_shadow, suspect
from .look import Look, finish
from .voice import line

DURATION = 23.9
A, B, C1, C2, D, E = 0.0, 3.3, 10.5, 13.3, 15.1, 20.5
WHIP = C1 - B - 0.55  # when the torch swings into the lens, in shot B's time

LOOK = Look(bloom=0.28, bloom_threshold=0.84, halation=0.3, contrast=1.16, saturation=1.0, vignette=0.7, grain=0.04)

# Who says what, and when (seconds from the start). Voices: Kokoro, cached by voice.py.
LINES = [
    ("Someone rewrote the last message.", "bm_george", 1.0, 0.2, None),
    ("Nine seventeen.", "bm_george", 0.95, 3.75, None),
    ("Lab four! Cabinet B is wide open. HALO's gone!", "am_puck", 1.08, 5.3, "OZZY · RADIO"),
    ("Three years of work. Gone.", "bm_george", 0.96, 8.0, None),
    ("The last message says Priya took it.", "bm_george", 1.0, 10.65, None),
    ("I didn't write that!", "af_heart", 1.0, 13.45, "PRIYA"),
    ("Four people were in the building.", "bm_george", 0.98, 15.4, None),
    ("One of them is lying.", "bm_george", 0.9, 18.35, None),
]
# How long each line runs, measured once (voice.py caches the takes).
LINE_LENGTHS = [2.37, 1.51, 2.50, 2.3, 2.52, 1.05, 2.12, 1.90]

CAST = [  # (suspect art, tint, name, role): the order they're revealed in, same as the case file.
    ("triangle", 30, "PRIYA TRAN", "PhD researcher"),
    ("square", 310, "PROF. SQUIRES", "Lab director"),
    ("circle", 330, "OZZY REYES", "Night security"),
    ("rectangle", 20, "RENA VOSS", "Visiting engineer"),
]
REVEALS = [0.3, 1.2, 2.1, 3.0]  # seconds into shot D


# ---------------------------------------------------------------------------
# Helpers

def to_screen(cam: Camera, depth: float, x: float, y: float):
    """Where a point of the set at `depth` lands in the frame."""
    s = cam.zoom ** depth
    return (W / 2 + s * (x - W / 2 - (cam.x - W / 2) * depth), H / 2 + s * (y - H / 2 - (cam.y - H / 2) * depth))


def caption_for(c, t, index):
    words, _, _, at, speaker = LINES[index]
    until = LINES[index + 1][3] - 0.05 if index + 1 < len(LINES) else None
    caption(c, t, words, at, at + LINE_LENGTHS[index] - 0.1, speaker, until)


# ---------------------------------------------------------------------------
# A: the edit

def shot_a(c, t):
    cam = closeup_camera(t)
    with layer(c, cam, 0.45, extra_blur=16) as lc:
        bokeh(lc, t)
    with layer(c, cam, 1.0) as lc:
        big_screen(lc, t)
    with layer(c, cam, 1.08) as lc:
        keyboard(lc, t)
        screen_spill(lc, t)
    with layer(c, cam, 1.16) as lc:
        lc.translate(0, -70)
        lc.save()
        lc.translate(720, 1500)
        lc.rotate(-8)
        lc.scale(1.15, 1.15)
        glove(lc, t)
        lc.restore()
        lc.save()
        lc.translate(330, 1540)
        lc.rotate(10)
        lc.scale(1.1, 1.1)
        glove(lc, t, mirror=True, phase=1.3)
        lc.restore()
        dust(lc, t, seed=4, count=30, size=4, alpha=0.4)
    chyron(c, t, "LAB 4  ·  TONIGHT")
    caption_for(c, t, 0)


def tv_off(c, t, draw, start, end):
    """The picture collapses to a line, then a dot, then nothing: an old screen switching off."""
    k = span(t, start, end)
    if k <= 0:
        draw(c, t)
        return
    c.drawRect(skia.Rect.MakeWH(W, H), fill("#000000"))
    sy = max(0.003, 1 - ease_in_out(span(k, 0, 0.55)))
    sx = 1 - ease_in_out(span(k, 0.55, 1.0)) * 0.995
    if k < 1:
        c.save()
        c.translate(W / 2, H / 2)
        c.scale(sx, sy)
        c.translate(-W / 2, -H / 2)
        draw(c, t)
        c.restore()
        glow(c, (W / 2, H / 2), 260 * sx + 40, "#CFE3FF", 0.6 * (1 - span(k, 0.8, 1.0)))


# ---------------------------------------------------------------------------
# B: 9:17, by torchlight

def camera_b(u):
    zoom_in = ease_out(span(u, 1.7, 2.05), 4)
    whip = ease_in_out(span(u, WHIP, WHIP + 0.55))
    return Camera(
        x=lerp(560, 150, zoom_in) + noise1(u * 2.2, 7) * 14 + whip * 520,
        y=lerp(1000, 1290, zoom_in) + noise1(u * 1.9, 8) * 12 - whip * 300,
        zoom=lerp(0.9, 1.38, zoom_in) + noise1(u * 1.1, 9) * 0.01,
        roll=noise1(u * 1.3, 10) * 1.2 + whip * 6,
        focus=0.78,
        aperture=14,
    )


def torch_target(u):
    """Where Ozzy points the torch (in set coordinates): the clock, then down to the cabinet."""
    if u < 1.3:
        return 850 + noise1(u * 3, 1) * 30, 430 + noise1(u * 2.7, 2) * 24
    k = ease_in_out(span(u, 1.3, 1.75))
    return lerp(850, 150, k) + noise1(u * 3, 1) * 20, lerp(430, 1290, k) + noise1(u * 2.7, 2) * 18


def shot_b(c, u):
    cam = camera_b(u)
    with layer(c, cam, 0.55, extra_blur=4) as lc:
        campus_view(lc, u + 5)
        rain_streaks(lc, u + 5)
    with layer(c, cam, 0.78) as lc:
        wall(lc, u, clock_time=(17, 2), cabinet_open=True)
    with layer(c, cam, 1.0) as lc:
        bench(lc, u)
        locked_laptop(lc)
    # The torch: on with a flicker, its beam a soft hole in the dark, warm in the middle.
    on = 0.0 if u < 0.12 else (0.35 if u < 0.2 else (0.0 if u < 0.25 else 1.0))
    tx, ty = to_screen(cam, 0.78, *torch_target(u))
    radius = 440 * cam.zoom ** 0.78
    whip = span(u, WHIP + 0.15, WHIP + 0.55)
    # A little moonlight survives outside the beam, so the room still has a shape.
    darkness(c, (tx + whip * 400, ty - whip * 600), radius * (1 + whip * 3), amount=0.86 if on else 0.97)
    if on:
        glow(c, (tx, ty), radius * 0.95, "#FFE2A0", 0.3)
    if whip:  # the beam swings straight into the lens
        c.drawRect(skia.Rect.MakeWH(W, H), fill("#FFF6DD", ease_in_out(span(u, WHIP + 0.25, WHIP + 0.55))))
    tag = "9:17 PM"
    shown = tag[: round(len(tag) * span(u, 0.45, 0.8))]
    a = smooth(span(u, 0.45, 0.6)) * (1 - span(u, WHIP - 0.2, WHIP + 0.1))
    text(c, shown, 72, 150, font("type", 64), fill(CREAM, a), tracking=4)
    for i in (1, 2, 3):
        caption_for(c, u + B, i)


def locked_laptop(c):
    """By 9:17 the laptop has locked itself (at 9:16): a dark screen and a padlock."""
    lid = rrect(318, 1028, 872, 1438, 18)
    c.drawPath(lid, surface("steel", 0.9))
    c.drawPath(lid, fill("#14183A", 0.6))
    c.drawPath(lid, stroke(INK, 10))
    c.drawRect(skia.Rect.MakeLTRB(340, 1050, 850, 1420), fill("#0E1430"))
    c.drawPath(rrect(568, 1220, 622, 1268, 6), fill("#3B4A7A"))
    arc = skia.Path()
    arc.addArc(skia.Rect.MakeLTRB(574, 1186, 616, 1236), 180, 180)
    c.drawPath(arc, stroke("#3B4A7A", 7))


# ---------------------------------------------------------------------------
# C1: the message on the phone

PHONE = skia.Rect.MakeLTRB(250, 330, 830, 1530)


NOTES = (  # (arrives at, sender, words, tag)
    (0.18, "Priya", "Taking HALO home tonight to fix the battery, don't panic", "edited"),
    (1.15, "Ozzy", "Cabinet B is open and EMPTY. Who has HALO??", ""),
    (1.75, "Prof. Squires", "Priya?! The demo is in twelve hours.", ""),
)


def shot_c1(c, v):
    k = ease_in_out(span(v, 0, C2 - C1))
    cam = Camera(x=540, y=930, zoom=lerp(1.0, 1.1, k), roll=lerp(-5, 2, k), focus=1.0, aperture=18)
    with layer(c, cam, 0.5, extra_blur=14) as lc:
        lc.drawRect(skia.Rect.MakeLTRB(-600, -600, 1700, 2600), surface("wood", 1.5))
        lc.drawRect(skia.Rect.MakeLTRB(-600, -600, 1700, 2600), fill("#08091A", 0.62))
        glow(lc, (250, 380), 560, MUSTARD, 0.22)  # her bedside lamp
    buzz = 0.0
    for at, _, _, _ in NOTES:
        if at <= v < at + 0.4:
            buzz = math.sin(v * 190) * 5
    with layer(c, cam, 1.0) as lc:
        lc.translate(buzz, 0)
        body = rrect(PHONE.left(), PHONE.top(), PHONE.right(), PHONE.bottom(), 70)
        soft_shadow(lc, body, 14, 24, 30, 0.7)
        phone(lc, v)
    glow(c, to_screen(cam, 1.0, 540, 900), 900, "#B9A6FF", 0.14)
    # The flash from the white-out still fading as the shot opens.
    c.drawRect(skia.Rect.MakeWH(W, H), fill("#FFF6DD", 1 - smooth(span(v, 0, 0.35))))
    caption_for(c, v + C1, 4)


def phone(c, v):
    p = PHONE
    body = rrect(p.left(), p.top(), p.right(), p.bottom(), 70)
    c.drawPath(body, surface("steel", 0.8))
    c.drawPath(body, fill("#0B0C18", 0.76))
    c.drawPath(body, stroke(INK, 12))
    screen = rrect(p.left() + 22, p.top() + 22, p.right() - 22, p.bottom() - 22, 52)
    c.drawPath(screen, linear((0, p.top()), (0, p.bottom()), [(0, "#3B2D6B", 1), (0.6, "#1D1E46", 1), (1, "#101229", 1)]))
    c.save()
    c.clipPath(screen, doAntiAlias=True)
    # Her wallpaper: a pencil sketch of HALO.
    for x in (p.centerX() - 120, p.centerX() + 120):
        c.drawCircle(x, p.top() + 880, 96, stroke(CREAM, 5, 0.1))
    c.drawLine(p.centerX() - 24, p.top() + 870, p.centerX() + 24, p.top() + 870, stroke(CREAM, 5, 0.1))
    c.drawPath(rrect(p.centerX() - 74, p.top() + 40, p.centerX() + 74, p.top() + 78, 18), fill("#05060E"))
    text(c, "9:25", p.left() + 66, p.top() + 70, font("body", 28), fill(CREAM, 0.9))
    c.drawPath(rrect(p.right() - 106, p.top() + 48, p.right() - 62, p.top() + 70, 5), stroke(CREAM, 3, 0.8))
    c.drawRect(skia.Rect.MakeLTRB(p.right() - 102, p.top() + 52, p.right() - 92, p.top() + 66), fill(CORAL))
    text(c, "9:25", p.centerX(), p.top() + 262, font("display", 150), fill(CREAM, 0.95), align="center")
    text(c, "Tuesday, 14 November", p.centerX(), p.top() + 318, font("body", 32), fill(CREAM, 0.7), align="center")
    # Each message drops in with a spring, pushing the older ones down.
    y_top = p.top() + 360
    offset = 0.0
    for at, sender, words, tag in reversed(NOTES):
        if v < at:
            continue
        k = ease_out(span(v, at, at + 0.3), 3)
        h = 196 if tag else 150
        y = lerp(y_top - h - 60, y_top + offset, k)
        card = rrect(p.left() + 44, y, p.right() - 44, y + h, 30)
        soft_shadow(c, card, 0, 8, 12, 0.4)
        c.drawPath(card, fill(CREAM, 0.96))
        c.drawPath(rrect(p.left() + 66, y + 22, p.left() + 110, y + 66, 11), fill(MUSTARD))
        text(c, "4", p.left() + 88, y + 58, font("display", 34), fill(INK), align="center")
        text(c, f"Lab 4 crew · {sender}", p.left() + 124, y + 52, font("display", 28), fill(INK))
        body_font = font("body", 31)
        body_font.setEmbolden(True)
        for i, row in enumerate(chat_lines(words, body_font, p.width() - 140)[:3]):
            text(c, row, p.left() + 66, y + 100 + i * 38, body_font, fill(INK, 0.9))
        if tag:
            italic = font("body", 24)
            italic.setSkewX(-0.2)
            text(c, tag, p.right() - 72, y + h - 16, italic, fill("#B23A3A"), align="right")
        offset += k * (h + 14)
    for x in (p.left() + 94, p.right() - 94):
        c.drawCircle(x, p.bottom() - 104, 42, fill("#FFFFFF", 0.14))
    c.drawPath(rrect(p.centerX() - 96, p.bottom() - 42, p.centerX() + 96, p.bottom() - 34, 4), fill(CREAM, 0.7))
    c.restore()


# ---------------------------------------------------------------------------
# C2: Priya

def shot_c2(c, w):
    snap = ease_out(span(w, 0, 0.22), 4)
    cam = Camera(x=540 + noise1(w * 6, 3) * 6 * span(w, 0.1, 0.6), y=lerp(1040, 900, snap), zoom=lerp(1.0, 1.22, snap) + w * 0.02,
                 roll=noise1(w, 5) * 0.6, focus=1.0, aperture=18)
    with layer(c, cam, 0.4, extra_blur=24) as lc:
        lc.drawRect(skia.Rect.MakeLTRB(-600, -600, 1700, 2600), surface("wood", 1.8))
        lc.drawRect(skia.Rect.MakeLTRB(-600, -600, 1700, 2600), fill("#0A0A1E", 0.72))
        # The window, rain on the glass; a corkboard of HALO sketches; a desk lamp.
        lc.drawRect(skia.Rect.MakeLTRB(620, 180, 1040, 800), linear((0, 180), (0, 800), [(0, "#121A3E", 1), (1, "#232C5C", 1)]))
        rain_streaks(lc, w + 8)
        lc.drawRect(skia.Rect.MakeLTRB(600, 160, 1060, 820), stroke("#2A2F5C", 26))
        lc.drawRect(skia.Rect.MakeLTRB(40, 220, 500, 720), fill("#6E5236"))
        for i, (x, y, col) in enumerate(((90, 270, "#E8CF7A"), (250, 250, CREAM), (360, 330, "#F0A8A8"), (120, 460, CREAM), (300, 500, "#E8CF7A"))):
            lc.drawRect(skia.Rect.MakeXYWH(x, y, 130, 150), fill(col, 0.9))
        glow(lc, (250, 1000), 560, MUSTARD, 0.3)
    with layer(c, cam, 1.0) as lc:
        suspect(lc, "triangle", 30, (540, 1480), 1.85, mood="shocked")
        glow(lc, (540, 1420), 650, "#9CC7FF", 0.38)  # her phone, lighting her from below
    caption_for(c, w + C2, 5)
    # The flashgun that opens the lineup, starting to fire.
    c.drawRect(skia.Rect.MakeWH(W, H), fill("#FFFFFF", ease_in_out(span(w, 1.65, 1.8))))


# ---------------------------------------------------------------------------
# D: the lineup

LINEUP_X = [150, 410, 670, 930]
FEET_Y = 1500


def camera_d(d):
    x, y, zoom = 540, 1080, 1.0
    for i, at in enumerate(REVEALS):
        # Snap onto each suspect as the flash fires.
        k = ease_out(span(d, at - 0.05, at + 0.15), 4)
        x, y, zoom = lerp(x, LINEUP_X[i], k), lerp(y, 1250, k), lerp(zoom, 1.7, k)
    back = ease_in_out(span(d, 3.85, 4.5))
    x, y, zoom = lerp(x, 540, back), lerp(y, 1150, back), lerp(zoom, 1.02, back)
    return Camera(x=x + noise1(d * 1.4, 11) * 4, y=y + noise1(d * 1.2, 12) * 4, zoom=zoom, roll=noise1(d, 13) * 0.3, focus=1.0, aperture=16)


def height_chart(c):
    wall = box(-600, -600, 1700, 2600)
    c.drawPath(wall, linear((0, 0), (0, 1900), [(0, "#20243E", 1), (1, "#2E3350", 1)]))
    weave(c, wall, "paper", 3.2)
    weave(c, wall, "linen", 2.2)
    for i, h in enumerate(range(200, 130, -10)):
        y = 650 + i * 125
        c.drawLine(-600, y, 1700, y, stroke(CREAM, 4 if i % 2 == 0 else 2, 0.24))
        for x in (30, 1050):
            text(c, str(h), x, y - 12, font("type", 30), fill(CREAM, 0.42), align="center")
    # The sign above them, screwed to the concrete.
    sign = rrect(170, 380, 910, 520, 8)
    c.drawPath(sign, fill("#E2D8C5"))
    c.drawPath(sign, stroke(INK, 7))
    text(c, "HALDEN UNIVERSITY SECURITY", 540, 438, font("display", 44), fill(INK), align="center", tracking=2)
    text(c, "INCIDENT 21:17  ·  LAB 4", 540, 494, font("type", 36), fill("#B23A3A"), align="center", tracking=2)
    for x, y in ((190, 400), (890, 400), (190, 500), (890, 500)):
        c.drawCircle(x, y, 6, fill("#6C6A7A"))
    floor = box(-600, FEET_Y, 1700, 2600)
    c.drawPath(floor, surface("tile", 2.0))
    c.drawPath(floor, fill("#090B1C", 0.82))
    c.drawLine(-600, FEET_Y, 1700, FEET_Y, stroke("#000000", 10, 0.7))
    for x in LINEUP_X:  # a tape cross where each of them has to stand
        c.drawLine(x - 42, FEET_Y + 26, x + 42, FEET_Y + 62, stroke(MUSTARD, 8, 0.7))
        c.drawLine(x + 42, FEET_Y + 26, x - 42, FEET_Y + 62, stroke(MUSTARD, 8, 0.7))


def shot_d(c, d):
    cam = camera_d(d)
    blackout = span(d, 5.0, 5.35)
    with layer(c, cam, 0.85) as lc:
        height_chart(lc)
    with layer(c, cam, 1.0) as lc:
        for i, (art, tint, name, role) in enumerate(CAST):
            revealed = d >= REVEALS[i]
            spotlight = smooth(span(d, REVEALS[i], REVEALS[i] + 0.1))
            current = revealed and (i == 3 or d < REVEALS[i + 1]) and d < 3.85
            lit = spotlight * (1.0 if current or d >= 3.85 else 0.55)
            if revealed:
                glow(lc, (LINEUP_X[i], FEET_Y - 280), 420, "#FFF1C9", 0.2 * lit, blend=skia.BlendMode.kSrcOver)
                # The hard shadow the flash throws on the wall behind them.
                shade = skia.Paint()
                shade.setAlphaf(0.45 * lit)
                lc.saveLayer(None, shade)
                suspect(lc, art, tint, (LINEUP_X[i] + 44, FEET_Y - 26), 0.84, lit=0)
                lc.restore()
            suspect(lc, art, tint, (LINEUP_X[i], FEET_Y), 0.8, lit=lit)
            if revealed:
                plate(lc, LINEUP_X[i], FEET_Y + 40, name, role, smooth(span(d, REVEALS[i] + 0.05, REVEALS[i] + 0.3)))
    # Each reveal is a flashgun going off.
    for at in REVEALS:
        f = max(0.0, 1 - abs(d - at) / 0.09) if d >= at - 0.03 else 0.0
        if f:
            c.drawRect(skia.Rect.MakeWH(W, H), fill("#FFFFFF", 0.85 * f))
    # Fading in from the flash that ended the last shot.
    c.drawRect(skia.Rect.MakeWH(W, H), fill("#FFFFFF", 1 - smooth(span(d, 0, 0.2))))
    caption_for(c, d + D, 6)
    caption_for(c, d + D, 7)
    # The lights cut: a stutter, then black.
    if blackout:
        stutter = 0.0 if blackout > 0.75 else (1.0 if int(blackout * 9) % 2 else 0.4)
        c.drawRect(skia.Rect.MakeWH(W, H), fill("#000000", 1 - stutter if blackout < 0.75 else 1.0))


def plate(c, x, y, name, role, a):
    """An evidence tag on a string."""
    if a <= 0:
        return
    f = font("display", 27)
    w = 236
    tag = rrect(x - w / 2, y, x + w / 2, y + 84, 12)
    soft_shadow(c, tag, 3, 6, 5, 0.45 * a)
    c.drawPath(tag, fill("#E2D8C5", 0.97 * a))
    c.drawPath(tag, stroke(INK, 5, a))
    c.drawCircle(x - w / 2 + 16, y + 16, 7, fill(INK, a))
    text(c, name, x, y + 36, f, fill(INK, a), align="center")
    text(c, role, x, y + 70, font("body", 23), fill(INK, 0.65 * a), align="center")


# ---------------------------------------------------------------------------
# E: the title

TITLE_1, TITLE_2 = "THE LAST", "MESSAGE"


def shot_e(c, e):
    lamp = 0.0 if e < 0.12 else (0.5 if e < 0.2 else (0.1 if e < 0.26 else 1.0))
    c.drawRect(skia.Rect.MakeWH(W, H), surface("wood", 1.6))
    cam = Camera(x=540, y=960, zoom=1.0 + e * 0.012, roll=-1.5, focus=1.0, aperture=10)
    hit = ease_out(span(e, 1.55, 1.75), 3)
    shake = (1 - span(e, 1.55, 2.0)) * 10 * math.sin(e * 80) if e >= 1.55 else 0.0
    with layer(c, cam, 1.0) as lc:
        lc.translate(shake, 0)
        folder = rrect(90, 420, 990, 1520, 14)
        tab = rrect(90, 340, 430, 470, 18)
        soft_shadow(lc, folder, 14, 22, 26, 0.7)
        lc.drawPath(tab, fill("#B8975C"))
        lc.drawPath(folder, fill("#C9A86A"))
        weave(lc, folder, "paper", 1.2)
        weave(lc, tab, "paper", 1.2)
        lc.drawPath(folder, stroke("#6E5632", 4))
        text(lc, "CASE 001", 260, 412, font("type", 44), fill(INK, 0.9), align="center", tracking=6)
        lc.save()
        lc.rotate(-9, 770, 540)
        lc.drawPath(rrect(590, 500, 950, 590, 8), stroke("#B23A3A", 7, 0.7))
        text(lc, "CONFIDENTIAL", 770, 562, font("type", 42), fill("#B23A3A", 0.7), align="center", tracking=3)
        lc.restore()
        # A paper-clipped photo of the open cabinet.
        lc.save()
        lc.rotate(5, 250, 1300)
        photo = box(140, 1180, 390, 1440)
        soft_shadow(lc, photo, 6, 10, 8, 0.5)
        lc.drawPath(photo, fill(CREAM))
        lc.drawRect(skia.Rect.MakeLTRB(158, 1198, 372, 1380), fill("#0E1226"))
        lc.drawRect(skia.Rect.MakeLTRB(190, 1218, 340, 1360), stroke("#6C7798", 7))
        lc.drawCircle(238, 1290, 22, stroke("#6C7798", 5))
        lc.drawCircle(292, 1290, 22, stroke("#6C7798", 5))
        lc.drawPath(rrect(236, 1160, 268, 1236, 14), stroke("#AEB2BE", 6))
        lc.restore()
        big = font("type", 142)
        t1 = TITLE_1[: round(len(TITLE_1) * span(e, 0.3, 0.8))]
        t2 = TITLE_2[: round(len(TITLE_2) * span(e, 0.88, 1.45))]
        lc.drawLine(170, 700, 910, 700, stroke(INK, 4, 0.35))
        text(lc, t1, W / 2, 840, big, fill("#1B1A22", 0.94), align="center", tracking=6)
        text(lc, t2, W / 2, 1000, big, fill("#1B1A22", 0.94), align="center", tracking=6)
        if hit:
            lc.drawLine(W / 2 - 330 * hit, 1046, W / 2 + 330 * hit, 1046, stroke("#B23A3A", 11))
        tag = font("type", 42)
        text(lc, "The message is lying.", 660, 1320, tag, fill("#1B1A22", 0.85 * smooth(span(e, 2.0, 2.5))), align="center")
    # The desk lamp, and the rain running down the window's shadow.
    darkness(c, (560, 860), 1100, amount=lerp(0.98, 0.5, lamp))
    for i in range(16):
        x = (i * 151) % W
        y = (i * 233 + e * 240) % 2200 - 200
        c.drawLine(x, y, x + 3, y + 150, stroke("#000000", 6, 0.05 * lamp))


# ---------------------------------------------------------------------------
# The cut

def film_draw(c, t):
    if t < B:
        tv_off(c, t, shot_a, 2.95, 3.25)
    elif t < C1:
        shot_b(c, t - B)
    elif t < C2:
        shot_c1(c, t - C1)
    elif t < D:
        shot_c2(c, t - C2)
    elif t < E:
        shot_d(c, t - D)
    else:
        shot_e(c, t - E)


def exposure(t):
    return smooth(span(t, 0, 0.3)) * (1 - smooth(span(t, DURATION - 0.45, DURATION)))


def film_frame(i: int) -> np.ndarray:
    """One finished frame (uint8 RGB), for the render workers."""
    t = i / FPS
    out = finish(render_frame(film_draw, t), i, LOOK, exposure=exposure(t))
    return (out * 255 + 0.5).astype(np.uint8)


# ---------------------------------------------------------------------------
# The score

def score():
    mix = sound.Mix(DURATION, seed=7)
    rng = mix.rng
    rain = sound.rain(DURATION, rng, 0.9)
    rain_level = np.interp(np.arange(len(rain)) / sound.SR, [0, 3.2, 3.4, C1 - 0.1, C1 + 0.1, E - 0.1, E + 0.3, DURATION], [0.55, 0.55, 0.85, 0.85, 0.45, 0.45, 0.3, 0.0])
    mix.add(rain * rain_level[:, None], 0)
    mix.add(sound.drone(DURATION, 55, rng), 0, gain=0.85, reverb=0.25)

    # A: the edit.
    for s in range(3):
        mix.add(sound.clock_tick(rng, tock=s % 2 == 1), s + 0.0, gain=0.3, pan=0.55, reverb=0.35)
    for i in range(len(ORIGINAL)):
        mix.add(sound.key_click(rng, backspace=True), 0.55 + 0.8 * i / len(ORIGINAL) + rng.uniform(-0.006, 0.006), gain=0.42, pan=-0.1, reverb=0.15)
    for i in range(len(FORGED)):
        mix.add(sound.key_click(rng), 1.45 + 0.95 * i / len(FORGED) + rng.uniform(-0.012, 0.012), gain=0.48, pan=-0.1, reverb=0.15)
    mix.add(sound.riser(0.9, rng), 1.65, gain=0.32)
    mix.add(sound.impact(rng), 2.5, gain=0.95, reverb=0.5)
    mix.add(sound.tv_off(rng), 2.96, gain=0.8)

    # B: in the dark, one loud tick, then the torch.
    mix.add(sound.clock_tick(rng), 3.28, gain=0.75, reverb=0.7)
    mix.add(sound.torch_click(rng), 3.42, gain=0.8, pan=0.3, reverb=0.3)
    mix.add(sound.torch_click(rng), 3.55, gain=0.6, pan=0.3, reverb=0.3)
    for s in range(4, 10):
        mix.add(sound.clock_tick(rng, tock=s % 2 == 1), s + 0.28, gain=0.28, pan=0.6, reverb=0.4)
    mix.add(sound.whoosh(rng, 0.35), 4.95, gain=0.8)
    mix.add(sound.impact(rng, root=36.7), 5.05, gain=0.55, reverb=0.4)
    mix.add(sound.squelch(rng), 5.18, gain=0.9, pan=0.25)
    mix.add(sound.squelch(rng, 0.12), 7.85, gain=0.7, pan=0.25)
    mix.add(sound.whoosh(rng, 0.6), C1 - 0.55, gain=1.0)

    # C: the phone and Priya.
    for at, _, _, _ in NOTES:
        mix.add(sound.chime(), C1 + at, gain=0.5, reverb=0.2)
        mix.add(sound.phone_buzz(rng), C1 + at + 0.05, gain=0.75)
    mix.add(sound.whoosh(rng, 0.3), C2 - 0.15, gain=0.9)
    mix.add(sound.impact(rng, root=49.0), C2, gain=0.5, reverb=0.4)
    mix.add(sound.stinger_tone(1.8, 1244.5), C2 + 0.05, gain=0.12, reverb=0.5)

    # D: four flashes over a heartbeat, then the power dies.
    for k, at in enumerate([D - 0.02] + [D + r for r in REVEALS]):
        mix.add(sound.camera_flash(rng), at - 0.2, gain=0.85 if k else 0.6, pan=(-0.5, -0.5, -0.15, 0.15, 0.5)[k], reverb=0.35)
    beat = D
    while beat < E - 0.6:
        mix.add(sound.heartbeat(rng, 0.9), beat, gain=0.9)
        beat += 60 / (72 + (beat - D) * 6)
    mix.add(sound.power_down(rng), D + 4.95, gain=0.9, reverb=0.3)

    # E: a desk lamp, the title on a typewriter, then the last hit.
    mix.add(sound.torch_click(rng), E + 0.1, gain=0.7, reverb=0.3)
    for i in range(len(TITLE_1)):
        if TITLE_1[i] != " ":
            mix.add(sound.type_key(rng), E + 0.2 + 0.55 * i / len(TITLE_1), gain=0.75, reverb=0.25)
    for i in range(len(TITLE_2)):
        mix.add(sound.type_key(rng, heavy=i == len(TITLE_2) - 1), E + 0.85 + 0.6 * i / len(TITLE_2), gain=0.75, reverb=0.25)
    mix.add(sound.impact(rng, root=36.7), E + 1.55, gain=1.1, reverb=0.7)

    # The piano: one lonely motif, a note on each shot, resolving to an uneasy chord on the title.
    for name, at, vel in (("A3", 0.15, 0.8), ("C4", 3.4, 0.7), ("E4", C1 + 0.05, 0.7), ("D#4", C2 + 0.05, 0.8), ("A2", D, 0.9), ("E3", D, 0.6)):
        mix.add(sound.piano(sound.note(name), 3.0, vel), at, gain=0.55, reverb=0.6)
    for name in ("A2", "E3", "A3", "C4", "D#4"):
        mix.add(sound.piano(sound.note(name), 3.5, 0.9), E + 1.55, gain=0.45, reverb=0.7)

    for words, voice, speed, at, speaker in LINES:
        v = line(words, voice=voice, speed=speed)
        if speaker and "RADIO" in speaker:
            v = sound.radio(v, rng)
        mix.add(v, at, gain=1.3 if not speaker else 1.15, reverb=0.12 if not speaker else 0.25, pan=0.15 if speaker else 0.0)
    return mix.master(target_rms_db=-16.5)


# ---------------------------------------------------------------------------

CUTS = (2.95, 3.3, C1, C2, D, E)


def stills():
    """A contact sheet of the risky moments: the end of every line, and both sides of every cut."""
    moments = risky_moments([(at, length) for (_, _, _, at, _), length in zip(LINES, LINE_LENGTHS)], CUTS, extra=(1.2, 2.7, 5.6, 8.6, 11.0, 12.4, 16.2, 17.2, 18.9, 22.6))
    print(contact_sheet(film_frame, moments, "case001-film-stills.png"))


def render(scale):
    render_video("case001-film", "omc_cinema.case001_film:film_frame", DURATION, score(), sound.SR, scale)


if __name__ == "__main__":
    {"film": lambda: render(GAME), "draft": lambda: render(DRAFT), "master": lambda: render(MASTER), "stills": stills}[sys.argv[1] if len(sys.argv) > 1 else "film"]()
