"""Case 002, Dead Air: the opening film.

    python -m omc_cinema.case002_film voices     # record the cast, print how long each line runs
    python -m omc_cinema.case002_film stills     # the risky moments, as a contact sheet
    python -m omc_cinema.case002_film draft      # quick low-res film, to check timing
    python -m omc_cinema.case002_film            # the game copy (720 x 1280)
    python -m omc_cinema.case002_film master     # full size, for trailers

One continuous shot, the opposite of Case 001's cuts, and no narrator: the
station itself tells the story, in real time. We're in the control room,
looking through the glass into Studio A while Vince is live. The camera never
cuts, but it keeps changing how it moves: a macro on the ON AIR sign, a crane
down to the glass, a sideways slide along the desk, a push into the monitors.
When the sound dies the camera stops dead, the only stillness in the film.

What it must not show: anyone touching the fader or the blind. How the show was
cut off is chapter 1's checkpoint, and who lowered the blind is a clue. The
blind simply comes down, the meters simply fall, and Vince is only ever heard
afterwards. Hidden clue: a quiet chuckle just before the silence.
"""
from __future__ import annotations

import math
import sys

import numpy as np
import skia
from omc_art.palette import CREAM, INK

from . import sound
from .film import (DRAFT, FPS, GAME, MASTER, OUT, Camera, ease_in_out, ease_out, fill, font, glow, layer, lerp, linear, noise1, poly,
                   render_frame, render_video, rrect, smooth, span, stroke, text, W, H)
from .kit import caption, contact_sheet, risky_moments, suspect
from .look import Look, finish
from .voice import line

PINK = "#FF5CCD"
TEAL = "#3FB8AF"
RED = "#FF3B4E"
ROOM = "#120F24"
VINCE_TINT = 290

LOOK = Look(bloom=0.5, bloom_threshold=0.7, halation=0.22, shadow_tint=(0.05, 0.02, 0.09), highlight_tint=(1.02, 0.98, 1.02),
            contrast=1.14, saturation=1.08, vignette=0.7, grain=0.035)

# (words, voice, speed, starts at, caption tag; None keeps it off the captions)
LINES = [
    ("You're up late with Vince Valentine, and tonight, someone wins five grand.", "bm_lewis", 1.12, 0.4, "VINCE · ON AIR"),
    ("And the Night Owl jackpot winner is... right after this!", "bm_lewis", 1.0, 4.7, "VINCE · ON AIR"),
    ("Vince? You're off air! Why's the blind down?", "bf_emma", 1.08, 13.5, "TESS · TALKBACK"),
    ("Help! A man in a balaclava! He took the jackpot!", "bm_lewis", 1.08, 15.7, "VINCE · FROM THE CORRIDOR"),
]
LINE_LENGTHS = [4.18, 3.36, 1.92, 3.10]  # measured by `voices`
JINGLE = ("K N H T.", "bf_alice", 1.05)
CHUCKLE = ("Heh heh.", "bm_lewis", 0.95)

BLIND_FROM, BLIND_TO = 4.9, 7.7     # the blind comes down while he's still talking
JINGLE_AT = 8.15
CHUCKLE_AT = 9.8
SILENCE = 10.8                      # the sound dies
ALARM = 13.2                        # the silence alarm trips
TITLE = 19.1
DURATION = 22.2

WINDOW = skia.Rect.MakeLTRB(90, 560, 990, 1180)
MONITOR = skia.Rect.MakeLTRB(150, 1320, 930, 1640)


# ---------------------------------------------------------------------------
# What's on air: the level the meters and the waveform follow

_env = None


def level(t):
    """How loud the programme is at time t, 0 to 1: read from the mix itself, so the meters really follow the sound."""
    global _env
    if _env is None:
        _env = np.load(OUT / "case002-level.npy")
    i = int(t * 100)
    return float(_env[i]) if 0 <= i < len(_env) else 0.0


def save_level(programme: np.ndarray):
    hop = sound.SR // 100
    mono = np.abs(programme).mean(axis=1) if programme.ndim == 2 else np.abs(programme)
    env = np.array([mono[i:i + hop].max() if i < len(mono) else 0.0 for i in range(0, len(mono), hop)])
    env = env / (env.max() + 1e-9)
    # A meter rises fast and falls slowly.
    out = env.copy()
    for i in range(1, len(out)):
        out[i] = max(env[i], out[i - 1] * 0.93)
    OUT.mkdir(parents=True, exist_ok=True)
    np.save(OUT / "case002-level.npy", out.astype(np.float32))


# ---------------------------------------------------------------------------
# Studio A, through the glass

def studio(c, t):
    """The far side of the glass: foam walls, a neon owl, Vince at the mic."""
    c.drawRect(skia.Rect.MakeLTRB(-500, 200, 1600, 1500), linear((0, 300), (0, 1300), [(0, "#1C1038", 1), (1, "#0D0A1E", 1)]))
    # Acoustic foam: rows of dark wedges catching a little pink.
    for row in range(14):
        for col in range(26):
            x, y = -100 + col * 62 + (row % 2) * 31, 280 + row * 62
            c.drawPath(poly([(x, y + 50), (x + 30, y), (x + 60, y + 50)]), fill("#2A1950" if (row + col) % 3 else "#241443"))
    # The Night Owls sign.
    glow(c, (300, 700), 360, PINK, 0.34)
    c.drawCircle(262, 690, 44, stroke(PINK, 10))
    c.drawCircle(342, 690, 44, stroke(PINK, 10))
    c.drawCircle(262, 690, 12, fill(TEAL))
    c.drawCircle(342, 690, 12, fill(TEAL))
    c.drawPath(poly([(302, 712), (284, 736), (320, 736)]), fill(PINK))
    text(c, "NIGHT OWLS", 302, 800, font("display", 54), fill(PINK), align="center", tracking=4)
    # Vince, leaning into it. He sways with his own voice while it's on air.
    sway = level(t) * 7 * math.sin(t * 5.3)
    suspect(c, "square", VINCE_TINT, (690 + sway, 1260), 1.08)
    # His desk, in front of him.
    c.drawPath(rrect(380, 1090, 1040, 1330, 18), linear((0, 1090), (0, 1330), [(0, "#2C2352", 1), (1, "#17122E", 1)]))
    # The mic on its arm, and the jackpot envelope on the desk, in plain sight.
    c.drawLine(930, 700, 760, 840, stroke("#6C6A8C", 12))
    c.drawLine(930, 700, 960, 420, stroke("#6C6A8C", 12))
    c.drawPath(rrect(690, 800, 790, 930, 44), fill("#1A1A2A"))
    c.drawPath(rrect(690, 800, 790, 930, 44), stroke("#6C6A8C", 6))
    c.save()
    c.rotate(-6, 500, 1110)
    c.drawPath(rrect(440, 1072, 590, 1140, 8), fill("#C8323F"))
    c.drawLine(440, 1074, 515, 1112, stroke("#8F2230", 4))
    c.drawLine(590, 1074, 515, 1112, stroke("#8F2230", 4))
    c.restore()


def blind(c, t):
    """The booth blind: nobody in shot touches it. It just starts to come down."""
    k = ease_in_out(span(t, BLIND_FROM, BLIND_TO))
    if k <= 0:
        return
    bottom = lerp(WINDOW.top(), WINDOW.bottom(), k)
    c.save()
    c.clipRect(WINDOW)
    y = bottom
    i = 0
    while y > WINDOW.top() - 40:
        c.drawRect(skia.Rect.MakeLTRB(WINDOW.left(), y - 38, WINDOW.right(), y), linear((0, y - 38), (0, y), [(0, "#3C3360", 1), (1, "#201A3C", 1)]))
        c.drawLine(WINDOW.left(), y, WINDOW.right(), y, stroke("#0D0A1E", 4))
        y -= 40
        i += 1
    c.drawRect(skia.Rect.MakeLTRB(WINDOW.left(), bottom - 6, WINDOW.right(), bottom + 8), fill("#5A5084"))
    c.restore()


def glass(c, t):
    """The window itself: a faint reflection of the control room, and the wall around it."""
    outer = skia.Path()
    outer.addRect(skia.Rect.MakeLTRB(-600, -600, 1700, 2600))
    hole = skia.Path()
    hole.addRRect(skia.RRect.MakeRectXY(WINDOW, 18, 18))
    c.drawPath(skia.Op(outer, hole, skia.PathOp.kDifference_PathOp), linear((0, 0), (0, 1500), [(0, "#17122C", 1), (1, "#1F1838", 1)]))
    c.drawPath(rrect(WINDOW.left(), WINDOW.top(), WINDOW.right(), WINDOW.bottom(), 18), stroke(INK, 18))
    c.drawPath(poly([(WINDOW.left() + 60, WINDOW.top()), (WINDOW.left() + 300, WINDOW.top()), (WINDOW.left() + 120, WINDOW.bottom()), (WINDOW.left() - 120, WINDOW.bottom())]),
               fill("#FFFFFF", 0.035))


def on_air_sign(c, t):
    """ON AIR, above the glass. It's the first thing we see, and it goes dark with the sound."""
    lit = 1.0 if t < SILENCE else 0.0
    if SILENCE <= t < SILENCE + 0.5:  # a dying flicker
        lit = 0.5 if int(t * 22) % 2 else 0.0
    x0, y0, x1, y1 = 300, 300, 780, 470
    c.drawPath(rrect(x0, y0, x1, y1, 22), fill("#23060D"))
    c.drawPath(rrect(x0, y0, x1, y1, 22), stroke(INK, 12))
    if lit:
        glow(c, ((x0 + x1) / 2, (y0 + y1) / 2), 520, RED, 0.5 * lit)
    tone = fill("#FFDCE0", 1.0) if lit else fill("#4A1B26", 1.0)
    text(c, "ON AIR", (x0 + x1) / 2, y1 - 44, font("display", 112), tone, align="center", tracking=6)


def meters(c, t):
    """The desk: two VU meters, and the programme waveform on the big monitor."""
    m = MONITOR
    c.drawRect(skia.Rect.MakeLTRB(-600, 1240, 1700, 2600), linear((0, 1240), (0, 1900), [(0, "#231C42", 1), (1, "#0F0B20", 1)]))
    c.drawLine(-600, 1240, 1700, 1240, stroke(PINK, 3, 0.35))
    c.drawPath(rrect(m.left() - 16, m.top() - 16, m.right() + 16, m.bottom() + 16, 20), fill("#0B0918"))
    c.drawPath(rrect(m.left() - 16, m.top() - 16, m.right() + 16, m.bottom() + 16, 20), stroke(INK, 10))
    c.drawRect(m, fill("#07101C"))
    silent = t >= SILENCE
    alarm = silent and t >= ALARM and math.sin((t - ALARM) * math.pi * 2 / 1.1) > 0
    # Grid.
    for x in range(int(m.left()), int(m.right()), 78):
        c.drawLine(x, m.top(), x, m.bottom(), stroke(TEAL, 1.5, 0.14))
    cy = m.centerY() + 40
    # A row of channel lights along the desk, out with the sound.
    for i in range(16):
        on = not silent and level(t - i * 0.01) > 0.08 + i * 0.05
        c.drawCircle(m.left() + 30 + i * 48, m.bottom() + 66, 7, fill(TEAL if on else "#2A2444"))
    c.drawLine(m.left(), cy, m.right(), cy, stroke(TEAL, 1.5, 0.3))
    # The waveform scrolls in from the right: each column is the level a moment ago.
    path = skia.Path()
    colour = RED if silent else TEAL
    steps = 120
    for i in range(steps + 1):
        x = lerp(m.right(), m.left(), i / steps)
        back = t - i * 0.022
        a = level(back) * 108 * (0.55 + 0.45 * math.sin(i * 1.7 + back * 40))
        y = cy + a
        path.moveTo(x, y) if i == 0 else path.lineTo(x, y)
    c.drawPath(path, stroke(colour, 5))
    head = font("display", 30)
    text(c, "PROGRAMME", m.left() + 26, m.top() + 42, head, fill(TEAL, 0.85))
    text(c, "23:57" if t < 7 else "23:58", m.right() - 26, m.top() + 42, head, fill(CREAM, 0.8), align="right")
    if silent and t >= ALARM - 0.8:
        since = max(0, int(t - SILENCE))
        text(c, f"SILENCE  00:{since:02d}", m.centerX(), m.top() + 92, font("display", 44), fill(RED, 1.0 if alarm else 0.55), align="center", tracking=4)
    # Two VU meters above the monitor, their needles falling with the sound.
    for x, seed in ((300, 0.0), (780, 1.1)):
        y = 1262
        v = level(t) * (0.92 + 0.08 * math.sin(t * 13 + seed))
        c.drawPath(rrect(x - 74, y - 46, x + 74, y + 34, 10), fill("#F4E7C8"))
        c.drawPath(rrect(x - 74, y - 46, x + 74, y + 34, 10), stroke(INK, 6))
        a = math.radians(lerp(-48, 42, v))
        c.drawLine(x, y + 28, x + math.sin(a) * 62, y + 28 - math.cos(a) * 62, stroke(RED, 3.5))
        c.drawCircle(x, y + 28, 7, fill(INK))


def alarm_light(c, t):
    """Once the silence alarm trips, the whole room pulses red."""
    if t < ALARM:
        return
    pulse = max(0.0, math.sin((t - ALARM) * math.pi * 2 / 1.1)) ** 2
    c.drawRect(skia.Rect.MakeWH(W, H), fill(RED, 0.2 * pulse * smooth(span(t, ALARM, ALARM + 0.3)), blend=skia.BlendMode.kScreen))


# ---------------------------------------------------------------------------
# The one take

def path(t):
    """The camera: a list of (time, x, y, zoom), eased between, with a different move for each beat."""
    keys = [
        (0.0, 540, 385, 2.25),      # macro on the ON AIR sign, drifting
        (4.2, 565, 400, 2.0),
        (5.15, 540, 1170, 1.05),    # crane down and back: the sign, the glass, Vince, the monitor
        (7.6, 620, 1170, 1.1),      # slide sideways along the glass as the blind falls
        (9.3, 540, 1440, 1.27),     # push down into the monitor
        (SILENCE, 540, 1450, 1.3),
        (ALARM + 0.1, 540, 1450, 1.3),    # dead still through the silence
        (15.5, 540, 1150, 1.1),     # slow, uneasy pull back to the closed blind
        (TITLE, 540, 1020, 1.0),
        (DURATION, 540, 960, 1.04),
    ]
    for (t0, x0, y0, z0), (t1, x1, y1, z1) in zip(keys, keys[1:]):
        if t <= t1:
            k = ease_in_out(span(t, t0, t1))
            return lerp(x0, x1, k), lerp(y0, y1, k), lerp(z0, z1, k)
    return keys[-1][1:]


def camera(t):
    x, y, zoom = path(t)
    # Alive with a hand on it, except during the silence, when it's frozen.
    hand = 1.0 - smooth(span(t, SILENCE - 0.2, SILENCE)) + smooth(span(t, ALARM, ALARM + 1.0)) * 1.3
    return Camera(x=x + noise1(t * 0.9, 1) * 8 * hand, y=y + noise1(t * 0.8, 2) * 8 * hand, zoom=zoom,
                  roll=noise1(t * 0.5, 3) * 0.5 * hand, focus=1.0 if t > 7.4 and t < 15.0 else 0.85, aperture=16)


def set_frame(c, t):
    cam = camera(t)
    with layer(c, cam, 0.62) as lc:
        studio(lc, t)
    with layer(c, cam, 0.72) as lc:
        blind(lc, t)
    with layer(c, cam, 0.85) as lc:
        glass(lc, t)
        on_air_sign(lc, t)
    with layer(c, cam, 1.0) as lc:
        meters(lc, t)
    alarm_light(c, t)


def title_card(c, t):
    """The flat line on the monitor becomes the title: the sign buzzes on over the darkened room."""
    k = span(t, TITLE, TITLE + 0.7)
    if k <= 0:
        return
    c.drawRect(skia.Rect.MakeWH(W, H), fill("#05040C", 0.9 * smooth(k)))
    on = 1.0 if t > TITLE + 0.9 else (1.0 if int(t * 26) % 3 else 0.3)
    big = font("neon", 190)
    for word, y in (("DEAD", 900), ("AIR", 1110)):
        glow(c, (W / 2, y - 66), 560, PINK, 0.34 * on)
        text(c, word, W / 2, y, big, fill("#FFE3F6", on), align="center", tracking=8)
    a = smooth(span(t, TITLE + 0.1, TITLE + 0.5))
    text(c, "CASE 002", W / 2, 640, font("type", 44), fill(TEAL, a), align="center", tracking=10)
    b = smooth(span(t, TITLE + 1.2, TITLE + 1.8))
    tag = font("body", 44)
    tag.setSkewX(-0.15)
    text(c, "Nine minutes of silence. £5,000 gone.", W / 2, 1270, tag, fill(CREAM, 0.9 * b), align="center")
    text(c, "Four people in the building.", W / 2, 1330, tag, fill(CREAM, 0.9 * b), align="center")


def film_draw(c, t):
    set_frame(c, t)
    text(c, "KNHT 99.1 FM", 72, 150, font("type", 46), fill(CREAM, smooth(span(t, 0.3, 0.7)) * (1 - span(t, 3.6, 4.2))), tracking=3)
    for i, (words, _, _, at, tag) in enumerate(LINES):
        until = LINES[i + 1][3] - 0.05 if i + 1 < len(LINES) else None
        # His opening line sits high: during the macro on the sign, the bottom of the frame is his face.
        caption(c, t, words, at, at + LINE_LENGTHS[i] - 0.1, tag, until, y=530 if i == 0 else None)
    title_card(c, t)


def exposure(t):
    return smooth(span(t, 0, 0.5)) * (1 - smooth(span(t, DURATION - 0.5, DURATION)))


def film_frame(i: int) -> np.ndarray:
    t = i / FPS
    out = finish(render_frame(film_draw, t), i, LOOK, exposure=exposure(t))
    return (out * 255 + 0.5).astype(np.uint8)


# ---------------------------------------------------------------------------
# The sound

def on_air(words, voice, speed, rng):
    """A voice on the radio: bright and pressed, the way a station's processor leaves it."""
    v = line(words, voice=voice, speed=speed)
    v = sound.highpass(v, 140, 2)
    return np.tanh(v * 2.2) * 0.55


def score():
    mix = sound.Mix(DURATION, seed=11)
    rng = mix.rng
    programme = sound.Mix(DURATION, seed=12)  # everything on air: cut dead when the sound dies, and it drives the meters

    bed = sound.funk_bed(SILENCE, rng)
    programme.add(bed, 0, gain=0.55)
    for i, (words, voice, speed, at, tag) in enumerate(LINES[:2]):
        programme.add(on_air(words, voice, speed, rng), at, gain=1.0)
    programme.add(sound.jingle(JINGLE_AT, rng), JINGLE_AT, gain=0.9)
    programme.add(on_air(*JINGLE, rng), JINGLE_AT + 0.25, gain=0.8)
    programme.add(sound.creak(rng), CHUCKLE_AT - 0.45, gain=0.18)
    # The hidden clue: close on the mic, easy to miss.
    programme.add(on_air(*CHUCKLE, rng) * 0.3, CHUCKLE_AT, gain=0.6)

    air = programme.dry[:, :]
    cut = sound.seconds(SILENCE)
    air[cut:] = 0  # dead air: not a fade, a stop
    save_level(air)

    mix.add(air, 0)
    mix.add(sound.room_hum(DURATION, rng), 0, gain=0.02)
    # In the silence, just a faint fridge-hum of a room, and then the alarm.
    for k in range(int((DURATION - ALARM) / 1.1)):
        mix.add(sound.alarm_beep(), ALARM + k * 1.1, gain=0.34 * (1 - k * 0.07), reverb=0.3)

    words, voice, speed, at, _ = LINES[2]
    mix.add(sound.radio(line(words, voice=voice, speed=speed), rng) * 0.8, at, gain=1.0, reverb=0.15)
    for words, voice, speed, at, _ in LINES[3:]:
        # Through a wall and down a corridor: no top end, lots of room.
        far = sound.lowpass(line(words, voice=voice, speed=speed), 1100, 3)
        mix.add(far, at, gain=0.95, pan=-0.35, reverb=0.9)
    mix.add(sound.stinger_tone(5.0, 987.8), ALARM + 0.4, gain=0.08, reverb=0.5)

    mix.add(sound.neon_buzz(), TITLE, gain=0.5)
    mix.add(sound.impact(rng, root=41.2), TITLE + 0.05, gain=1.1, reverb=0.7)
    return mix.master(target_rms_db=-19.0, ceiling_db=-1.0)


def prepare():
    """Renders the soundtrack, which also measures the level the picture follows."""
    return score()


def voices():
    for words, voice, speed in [(w, v, s) for w, v, s, _, _ in LINES] + [JINGLE, CHUCKLE]:
        print(f"{len(line(words, voice=voice, speed=speed)) / sound.SR:.2f}s  {voice}  {words}", flush=True)


CUTS = (BLIND_FROM, SILENCE, ALARM, TITLE)


def stills():
    prepare()
    moments = risky_moments([(at, n) for (_, _, _, at, _), n in zip(LINES, LINE_LENGTHS)], CUTS, extra=(0.8, 3.4, 4.7, 5.5, 6.8, JINGLE_AT + 0.6, 9.0, 11.8, 14.6, TITLE + 2.2))
    print(contact_sheet(film_frame, moments, "case002-film-stills.png"))


def render(scale):
    render_video("case002-film", "omc_cinema.case002_film:film_frame", DURATION, prepare(), sound.SR, scale)


if __name__ == "__main__":
    {"film": lambda: render(GAME), "draft": lambda: render(DRAFT), "master": lambda: render(MASTER), "stills": stills, "voices": voices}[sys.argv[1] if len(sys.argv) > 1 else "film"]()
