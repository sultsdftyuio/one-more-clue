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
from .kit import caption, contact_sheet, darkness, risky_moments, suspect
from .look import Look, finish
from .voice import line

DURATION = 21.3
A, B, C1, C2, D, E = 0.0, 3.3, 7.9, 10.7, 12.5, 17.9

LOOK = Look(bloom=0.34, bloom_threshold=0.78, halation=0.3, contrast=1.16, saturation=1.0, vignette=0.7, grain=0.04)

# Who says what, and when (seconds from the start). Voices: Kokoro, cached by voice.py.
LINES = [
    ("Someone rewrote the last message.", "bm_george", 1.0, 0.2, None),
    ("Nine seventeen.", "bm_george", 0.95, 3.75, None),
    ("Lab four! Cabinet B is wide open. HALO's gone!", "am_puck", 1.08, 5.3, "OZZY · RADIO"),
    ("The last message says Priya took it.", "bm_george", 1.0, 8.05, None),
    ("I didn't write that!", "af_heart", 1.0, 10.85, "PRIYA"),
    ("Four people were in the building.", "bm_george", 0.98, 12.8, None),
    ("One of them is lying.", "bm_george", 0.9, 15.75, None),
]
# How long each line runs, measured once (voice.py caches the takes).
LINE_LENGTHS = [2.37, 1.51, 2.50, 2.52, 1.05, 2.12, 1.90]

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
    whip = ease_in_out(span(u, 4.05, 4.6))
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
    whip = span(u, 4.2, 4.6)
    # A little moonlight survives outside the beam, so the room still has a shape.
    darkness(c, (tx + whip * 400, ty - whip * 600), radius * (1 + whip * 3), amount=0.86 if on else 0.97)
    if on:
        glow(c, (tx, ty), radius * 0.95, "#FFE2A0", 0.3)
    if whip:  # the beam swings straight into the lens
        c.drawRect(skia.Rect.MakeWH(W, H), fill("#FFF6DD", ease_in_out(span(u, 4.3, 4.6))))
    tag = "9:17 PM"
    shown = tag[: round(len(tag) * span(u, 0.45, 0.8))]
    a = smooth(span(u, 0.45, 0.6)) * (1 - span(u, 3.9, 4.2))
    text(c, shown, 72, 150, font("type", 64), fill(CREAM, a), tracking=4)
    caption_for(c, u + B, 1)
    caption_for(c, u + B, 2)


def locked_laptop(c):
    """By 9:17 the laptop has locked itself (at 9:16): a dark screen and a padlock."""
    lid = rrect(318, 1028, 872, 1438, 18)
    c.drawPath(lid, fill("#1A1D33"))
    c.drawPath(lid, stroke(INK, 10))
    c.drawRect(skia.Rect.MakeLTRB(340, 1050, 850, 1420), fill("#0E1430"))
    c.drawPath(rrect(568, 1220, 622, 1268, 6), fill("#3B4A7A"))
    arc = skia.Path()
    arc.addArc(skia.Rect.MakeLTRB(574, 1186, 616, 1236), 180, 180)
    c.drawPath(arc, stroke("#3B4A7A", 7))


# ---------------------------------------------------------------------------
# C1: the message on the phone

PHONE = skia.Rect.MakeLTRB(250, 330, 830, 1530)


def shot_c1(c, v):
    cam = Camera(x=540, y=930, zoom=lerp(1.0, 1.14, ease_in_out(span(v, 0, 2.8))), roll=lerp(-5, 2, ease_in_out(span(v, 0, 2.8))), focus=1.0, aperture=18)
    with layer(c, cam, 0.4, extra_blur=22) as lc:
        bokeh(lc, v + 2, with_clock=False)
    buzz = 0.0
    for at in (0.25, 0.85):
        if at <= v < at + 0.4:
            buzz = math.sin(v * 190) * 5
    with layer(c, cam, 1.0) as lc:
        lc.translate(buzz, 0)
        phone(lc, v)
    glow(c, to_screen(cam, 1.0, 540, 900), 900, "#B9A6FF", 0.18)
    # The flash from the white-out still fading as the shot opens.
    c.drawRect(skia.Rect.MakeWH(W, H), fill("#FFF6DD", 1 - smooth(span(v, 0, 0.35))))
    caption_for(c, v + C1, 3)


def phone(c, v):
    p = PHONE
    body = rrect(p.left(), p.top(), p.right(), p.bottom(), 70)
    c.drawPath(body, fill("#0B0C18"))
    c.drawPath(body, stroke(INK, 12))
    screen = rrect(p.left() + 22, p.top() + 22, p.right() - 22, p.bottom() - 22, 52)
    c.drawPath(screen, linear((0, p.top()), (0, p.bottom()), [(0, "#3B2D6B", 1), (0.6, "#1D1E46", 1), (1, "#101229", 1)]))
    c.save()
    c.clipPath(screen, doAntiAlias=True)
    text(c, "9:25", p.centerX(), p.top() + 300, font("display", 190), fill(CREAM, 0.95), align="center")
    text(c, "Tuesday, 14 November", p.centerX(), p.top() + 368, font("body", 34), fill(CREAM, 0.7), align="center")
    # The notification drops in with a spring.
    k = ease_out(span(v, 0.18, 0.5), 3)
    over = math.sin(span(v, 0.18, 0.7) * math.pi) * 18 * (1 - span(v, 0.5, 0.7))
    y = lerp(p.top() - 300, p.top() + 470, k) + over
    card = rrect(p.left() + 44, y, p.right() - 44, y + 300, 36)
    c.drawPath(card, fill(CREAM, 0.96))
    c.drawPath(rrect(p.left() + 74, y + 30, p.left() + 134, y + 90, 14), fill(MUSTARD))
    text(c, "4", p.left() + 104, y + 78, font("display", 46), fill(INK), align="center")
    text(c, "Lab 4 crew", p.left() + 156, y + 60, font("display", 38), fill(INK))
    text(c, "8:40 PM", p.right() - 74, y + 60, font("body", 26), fill(INK, 0.5), align="right")
    bold = font("body", 38)
    bold.setEmbolden(True)
    rows = chat_lines("Priya: Taking HALO home tonight to fix the battery, don't panic", bold, p.width() - 160)
    for i, row in enumerate(rows[:3]):
        text(c, row, p.left() + 74, y + 140 + i * 46, bold, fill(INK))
    italic = font("body", 26)
    italic.setSkewX(-0.2)
    text(c, "edited", p.right() - 74, y + 278, italic, fill(INK, 0.45), align="right")
    c.restore()


# ---------------------------------------------------------------------------
# C2: Priya

def shot_c2(c, w):
    snap = ease_out(span(w, 0, 0.22), 4)
    cam = Camera(x=540 + noise1(w * 6, 3) * 6 * span(w, 0.1, 0.6), y=lerp(1040, 900, snap), zoom=lerp(1.0, 1.22, snap) + w * 0.02,
                 roll=noise1(w, 5) * 0.6, focus=1.0, aperture=18)
    with layer(c, cam, 0.4, extra_blur=24) as lc:
        lc.drawRect(skia.Rect.MakeLTRB(-600, -600, 1700, 2600), fill("#0B0A1A"))
        for i, (x, y, r, col) in enumerate(((150, 380, 120, MUSTARD), (900, 300, 90, CORAL), (760, 700, 70, MUSTARD), (240, 900, 60, "#7FD3CB"))):
            lc.drawCircle(x, y, r, fill(col, 0.3))
    with layer(c, cam, 1.0) as lc:
        suspect(lc, "triangle", 30, (540, 1480), 1.85, mood="shocked")
        glow(lc, (540, 1420), 650, "#9CC7FF", 0.38)  # her phone, lighting her from below
    caption_for(c, w + C2, 4)
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
    c.drawRect(skia.Rect.MakeLTRB(-600, -600, 1700, 2600), linear((0, 0), (0, 1900), [(0, "#0C0F24", 1), (1, "#151935", 1)]))
    for i, h in enumerate(range(200, 130, -10)):
        y = 650 + i * 125
        c.drawLine(-600, y, 1700, y, stroke(CREAM, 3, 0.16))
        for x in (30, 1050):
            text(c, str(h), x, y - 12, font("type", 30), fill(CREAM, 0.3), align="center")
    c.drawRect(skia.Rect.MakeLTRB(-600, FEET_Y, 1700, 2600), fill("#090B1C"))


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
    caption_for(c, d + D, 5)
    caption_for(c, d + D, 6)
    # The lights cut: a stutter, then black.
    if blackout:
        stutter = 0.0 if blackout > 0.75 else (1.0 if int(blackout * 9) % 2 else 0.4)
        c.drawRect(skia.Rect.MakeWH(W, H), fill("#000000", 1 - stutter if blackout < 0.75 else 1.0))


def plate(c, x, y, name, role, a):
    if a <= 0:
        return
    f = font("display", 27)
    w = 236
    c.drawPath(rrect(x - w / 2, y, x + w / 2, y + 84, 12), fill(CREAM, 0.95 * a))
    c.drawPath(rrect(x - w / 2, y, x + w / 2, y + 84, 12), stroke(INK, 5, a))
    text(c, name, x, y + 36, f, fill(INK, a), align="center")
    text(c, role, x, y + 70, font("body", 23), fill(INK, 0.65 * a), align="center")


# ---------------------------------------------------------------------------
# E: the title

TITLE_1, TITLE_2 = "THE LAST", "MESSAGE"


def shot_e(c, e):
    c.drawRect(skia.Rect.MakeWH(W, H), fill("#05060D"))
    cam = Camera(x=540, y=960, zoom=1.0 + e * 0.012, focus=1.0, aperture=10)
    with layer(c, cam, 0.5, extra_blur=20, opacity=0.55) as lc:
        rain_streaks(lc, e + 12)
    hit = ease_out(span(e, 1.55, 1.75), 3)
    shake = (1 - span(e, 1.55, 2.0)) * 10 * math.sin(e * 80) if e >= 1.55 else 0.0
    c.save()
    c.translate(shake, 0)
    a = smooth(span(e, 0.05, 0.3))
    text(c, "CASE 001", W / 2, 700, font("type", 44), fill(MUSTARD, a), align="center", tracking=10)
    big = font("type", 150)
    t1 = TITLE_1[: round(len(TITLE_1) * span(e, 0.2, 0.75))]
    t2 = TITLE_2[: round(len(TITLE_2) * span(e, 0.85, 1.45))]
    # Flicker like a failing sign as it lands.
    flick = 1.0 if e < 1.55 or e > 1.9 else (0.55 if int(e * 40) % 3 == 0 else 1.0)
    text(c, t1, W / 2, 900, big, fill(CREAM, flick), align="center", tracking=6)
    text(c, t2, W / 2, 1060, big, fill(CREAM, flick), align="center", tracking=6)
    if hit:
        c.drawLine(W / 2 - 330 * hit, 1110, W / 2 + 330 * hit, 1110, stroke(CORAL, 12))
        glow(c, (W / 2, 980), 700, CORAL, 0.18 * (1 - span(e, 1.75, 2.6)))
    tag = font("body", 46)
    tag.setSkewX(-0.15)
    text(c, "The message is lying.", W / 2, 1220, tag, fill(CREAM, 0.85 * smooth(span(e, 2.0, 2.5))), align="center")
    c.restore()


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
    rain_level = np.interp(np.arange(len(rain)) / sound.SR, [0, 3.2, 3.4, 7.8, 8.0, 17.8, 18.2, 21.3], [0.55, 0.55, 0.85, 0.85, 0.45, 0.45, 0.3, 0.0])
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
    for s in range(4, 8):
        mix.add(sound.clock_tick(rng, tock=s % 2 == 1), s + 0.28, gain=0.28, pan=0.6, reverb=0.4)
    mix.add(sound.whoosh(rng, 0.35), 4.95, gain=0.8)
    mix.add(sound.impact(rng, root=36.7), 5.05, gain=0.55, reverb=0.4)
    mix.add(sound.squelch(rng), 5.18, gain=0.9, pan=0.25)
    mix.add(sound.squelch(rng, 0.12), 7.85, gain=0.7, pan=0.25)
    mix.add(sound.whoosh(rng, 0.6), 7.35, gain=1.0)

    # C: the phone and Priya.
    mix.add(sound.chime(), 8.1, gain=0.6, reverb=0.2)
    mix.add(sound.phone_buzz(rng), 8.15, gain=0.8)
    mix.add(sound.phone_buzz(rng), 8.75, gain=0.7)
    mix.add(sound.whoosh(rng, 0.3), 10.55, gain=0.9)
    mix.add(sound.impact(rng, root=49.0), 10.7, gain=0.5, reverb=0.4)
    mix.add(sound.stinger_tone(1.8, 1244.5), 10.75, gain=0.12, reverb=0.5)

    # D: four flashes over a heartbeat, then the power dies.
    for k, at in enumerate([D - 0.02] + [D + r for r in REVEALS]):
        mix.add(sound.camera_flash(rng), at - 0.2, gain=0.85 if k else 0.6, pan=(-0.5, -0.5, -0.15, 0.15, 0.5)[k], reverb=0.35)
    beat = D
    while beat < E - 0.6:
        mix.add(sound.heartbeat(rng, 0.9), beat, gain=0.9)
        beat += 60 / (72 + (beat - D) * 6)
    mix.add(sound.power_down(rng), D + 4.95, gain=0.9, reverb=0.3)

    # E: the title on a typewriter, then the last hit.
    for i in range(len(TITLE_1)):
        if TITLE_1[i] != " ":
            mix.add(sound.type_key(rng), E + 0.2 + 0.55 * i / len(TITLE_1), gain=0.75, reverb=0.25)
    for i in range(len(TITLE_2)):
        mix.add(sound.type_key(rng, heavy=i == len(TITLE_2) - 1), E + 0.85 + 0.6 * i / len(TITLE_2), gain=0.75, reverb=0.25)
    mix.add(sound.impact(rng, root=36.7), E + 1.55, gain=1.1, reverb=0.7)

    # The piano: one lonely motif, a note on each shot, resolving to an uneasy chord on the title.
    for name, at, vel in (("A3", 0.15, 0.8), ("C4", 3.4, 0.7), ("E4", 7.95, 0.7), ("D#4", 10.75, 0.8), ("A2", 12.5, 0.9), ("E3", 12.5, 0.6)):
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
    moments = risky_moments([(at, length) for (_, _, _, at, _), length in zip(LINES, LINE_LENGTHS)], CUTS, extra=(1.2, 2.7, 19.9))
    print(contact_sheet(film_frame, moments, "case001-film-stills.png"))


def render(scale):
    render_video("case001-film", "omc_cinema.case001_film:film_frame", DURATION, score(), sound.SR, scale)


if __name__ == "__main__":
    {"film": lambda: render(GAME), "draft": lambda: render(DRAFT), "master": lambda: render(MASTER), "stills": stills}[sys.argv[1] if len(sys.argv) > 1 else "film"]()
