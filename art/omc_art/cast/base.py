"""The character kit: the four house shapes as bodies, dressed per character.

A character is a shape (triangle, square, circle or rectangle), a body colour,
a resting attitude and layers of gear: things behind the body (long hair),
things on the body (collars, aprons, lanyards, clipped to the outline), and
things on top (hair, hats, glasses, facial hair). Every character can pull
five expressions:

    idle     their resting face, set by their attitude
    nervous  side glance, worried brows, a wobbly mouth, sweat
    smug     heavy lids, one brow up, a smirk, hands on hips
    shocked  big eyes, brows up, an O mouth, arms up
    cracked  eyes down, sad brows, a frown: the moment they give it up

Coordinates follow the house suspects: a 400 x 520 frame with feet on y=480,
shifted down 40 on a 400 x 560 canvas. No hands: arms end in round nubs.
"""
from dataclasses import dataclass, field
from typing import Callable, Optional

import skia

from ..face import brow, eye, o_mouth, sweat, wobble_mouth
from ..marks import shock_lines
from ..paint import curve, fill, pen, solid
from ..palette import CREAM, INK, SWEAT, WHITE
from ..shapes import oval, poly, rect, rrect
from ..suspects.body import legs

MOODS = ("idle", "nervous", "smug", "shocked", "cracked")


@dataclass(frozen=True)
class Shape:
    name: str
    body: Callable[[], skia.Path]
    eyes: tuple[tuple[float, float], tuple[float, float]]
    eye_r: tuple[float, float]
    brow_y: float
    mouth: tuple[float, float]
    mouth_w: float
    legs: tuple[float, float]
    leg_top: float
    shoulders: tuple[tuple[float, float], tuple[float, float]]
    top: float
    shine: Callable[[], skia.Path]
    # Half the body's width at height y, for arms that rest on the outline.
    half: Callable[[float], float]


def _tri_shine():
    p = skia.Path()
    p.moveTo(194, 112)
    p.quadTo(180, 136, 168, 166)
    return p


def _sq_shine():
    p = skia.Path()
    p.moveTo(106, 204)
    p.quadTo(106, 152, 152, 150)
    return p


def _circ_shine():
    p = skia.Path()
    p.addArc(rect(88, 144, 312, 368), 190, 34)
    return p


def _rect_shine():
    p = skia.Path()
    p.moveTo(144, 104)
    p.lineTo(144, 146)
    return p


SHAPES = {
    "triangle": Shape(
        "triangle", lambda: poly([(200, 60), (348, 392), (52, 392)], 38),
        ((170, 250), (230, 250)), (23, 28), 206, (200, 318), 48, (162, 238), 370,
        ((102, 300), (298, 300)), 60, _tri_shine, lambda y: max(0, (y - 70) * 148 / 322),
    ),
    "square": Shape(
        "square", lambda: rrect(84, 128, 316, 372, 30),
        ((160, 226), (240, 226)), (27, 25), 186, (200, 298), 56, (160, 240), 360,
        ((90, 262), (310, 262)), 128, _sq_shine, lambda y: 116,
    ),
    "circle": Shape(
        "circle", lambda: oval(200, 256, 136),
        ((166, 250), (234, 250)), (24, 24), 212, (200, 318), 46, (166, 234), 372,
        ((72, 290), (328, 290)), 120, _circ_shine, lambda y: max(0, (136 ** 2 - (y - 256) ** 2)) ** 0.5,
    ),
    "rectangle": Shape(
        "rectangle", lambda: rrect(124, 72, 276, 392, 26),
        ((172, 172), (228, 172)), (18, 18), 134, (200, 244), 36, (172, 228), 380,
        ((128, 250), (272, 250)), 72, _rect_shine, lambda y: 76,
    ),
}

NO_GEAR = lambda c, ch, mood: None  # noqa: E731


@dataclass(frozen=True)
class Character:
    key: str
    name: str
    shape: str
    base: str
    dark: str
    # How they rest: calm, tired, smug, worried, stern, cheerful or shifty.
    attitude: str = "calm"
    # Their resting arms: down, akimbo, behind or folded.
    arms: str = "down"
    back: Callable = NO_GEAR  # behind the body: long hair, a scarf's tails
    body: Callable = NO_GEAR  # on the body, clipped to its outline: collars, aprons, badges
    face: Callable = NO_GEAR  # on the face: cheeks, freckles, stubble, moustaches
    top: Callable = NO_GEAR  # over everything: hair, hats, glasses
    # Facial hair that covers the mouth, so the mouth is drawn a little lower and smaller.
    mouth_drop: float = 0
    tags: dict = field(default_factory=dict)

    @property
    def s(self) -> Shape:
        return SHAPES[self.shape]


# ----- arms ---------------------------------------------------------------


def nub(c, x, y):
    c.drawCircle(x, y, 14, fill(CREAM))
    c.drawCircle(x, y, 14, pen(INK, 6))


def limb(c, a, ctrl, b, hand=True):
    curve(c, a, ctrl, b, width=11)
    if hand:
        nub(c, *b)


def arms(c, ch: Character, mood):
    """Arms are drawn behind the body, so only what pokes out shows."""
    s = ch.s
    (lx, ly), (rx, ry) = s.shoulders
    pose = {"idle": ch.arms, "nervous": "tight", "smug": "akimbo", "shocked": "up", "cracked": "limp"}[mood]
    if pose == "behind":
        return
    if pose == "up":
        limb(c, (lx, ly), (lx - 38, ly - 32), (lx - 46, ly - 80))
        limb(c, (rx, ry), (rx + 38, ry - 32), (rx + 46, ry - 80))
    elif pose == "down":
        limb(c, (lx, ly), (lx - 30, ly + 22), (lx - 34, ly + 60))
        limb(c, (rx, ry), (rx + 30, ry + 22), (rx + 34, ry + 60))
    elif pose == "limp":
        limb(c, (lx, ly), (lx - 14, ly + 40), (lx - 10, ly + 84))
        limb(c, (rx, ry), (rx + 14, ry + 40), (rx + 10, ry + 84))
    elif pose == "akimbo":
        for side, (x, y) in ((-1, (lx, ly)), (1, (rx, ry))):
            end_y = y + 76
            end_x = 200 + side * (s.half(end_y) - 6)
            p = skia.Path()
            p.moveTo(x, y)
            p.lineTo(x + side * 40, y + 38)
            p.lineTo(end_x, end_y)
            c.drawPath(p, pen(INK, 11))
    elif pose == "tight":
        # Arms pulled in close, nubs pressed to the body.
        for side, (x, y) in ((-1, (lx, ly)), (1, (rx, ry))):
            end_y = y + 58
            end_x = 200 + side * (s.half(end_y) + 4)
            limb(c, (x, y), (x + side * 16, y + 30), (end_x, end_y))
    elif pose == "folded":
        y = ly + 34
        limb(c, (lx, ly), (lx - 26, y), (200 + 34, y + 4), hand=False)
        limb(c, (rx, ry), (rx + 26, y + 10), (200 - 34, y + 12), hand=False)


def front_arms(c, ch: Character, mood):
    """Arms that cross in front of the body, drawn after it."""
    s = ch.s
    (lx, ly), (rx, ry) = s.shoulders
    pose = {"idle": ch.arms}.get(mood)
    if pose == "folded":
        y = ly + 40
        w = s.half(y) - 4
        bar = rrect(200 - w, y - 16, 200 + w, y + 16, 16)
        c.drawPath(bar, fill(ch.tags.get("sleeve", ch.dark)))
        c.drawPath(bar, pen(INK, 7))
        curve(c, (200 - 10, y - 12), (200 + 4, y), (200 - 10, y + 12), width=5)


# ----- faces --------------------------------------------------------------


def smirk(c, mx, my, w, flip=1):
    curve(c, (mx - w * 0.5 * flip, my - 2), (mx + w * 0.1 * flip, my + 16), (mx + w * 0.5 * flip, my - 14), width=8)
    curve(c, (mx + w * 0.5 * flip, my - 14), (mx + w * 0.62 * flip, my - 16), (mx + w * 0.64 * flip, my - 24), width=6)


def smile(c, mx, my, w, depth=14):
    curve(c, (mx - w / 2, my - 4), (mx, my + depth), (mx + w / 2, my - 4), width=8)


def frown(c, mx, my, w, depth=12):
    curve(c, (mx - w / 2, my + 6), (mx, my - depth), (mx + w / 2, my + 6), width=8)


def express(c, ch: Character, mood):
    s = ch.s
    (lx, ey), (rx, _) = s.eyes
    erx, ery = s.eye_r
    by = s.brow_y
    mx, my = s.mouth
    my += ch.mouth_drop
    mw = s.mouth_w
    gap = (rx - lx) / 2
    bw = erx * 0.95  # half a brow's length
    lid = ch.base

    def brows(lift_in, lift_out, bend=4, y=by):
        brow(c, (lx - bw, y - lift_out), (lx + bw, y - lift_in), bend=bend)
        brow(c, (rx - bw, y - lift_in), (rx + bw, y - lift_out), bend=bend)

    att = ch.attitude
    if mood == "idle":
        if att == "smug":
            mood = "smug"
        elif att == "worried":
            mood = "nervous"
    if mood == "idle":
        look = {"shifty": (-0.85, 0.1), "cheerful": (0.2, -0.1)}.get(att, (0.15, 0.05))
        lids = {"tired": 0.4, "stern": 0.3, "shifty": 0.36, "calm": 0.12, "cheerful": 0.0}.get(att, 0.12)
        tilt = {"stern": 10, "shifty": 6}.get(att, 0)
        eye(c, lx, ey, erx, ery, look=look, pupil=0.44, lid=lids, lid_color=lid, lid_tilt=tilt)
        eye(c, rx, ey, erx, ery, look=look, pupil=0.44, lid=lids, lid_color=lid, lid_tilt=-tilt)
        if att == "stern":
            brows(-6, 4, bend=-2)
            c.drawLine(mx - mw * 0.3, my, mx + mw * 0.3, my, pen(INK, 7))
        elif att == "cheerful":
            brows(4, 2, bend=8, y=by - 4)
            smile(c, mx, my - 4, mw * 1.1, depth=22)
        elif att == "tired":
            brows(4, -2, bend=2)
            curve(c, (mx - mw * 0.3, my + 2), (mx, my - 3), (mx + mw * 0.3, my + 2), width=7)
            for x in (lx, rx):  # bags under the eyes
                curve(c, (x - erx * 0.7, ey + ery + 8), (x, ey + ery + 16), (x + erx * 0.7, ey + ery + 8), width=4, a=150)
        elif att == "shifty":
            brows(-2, 2, bend=2)
            curve(c, (mx - mw * 0.4, my + 2), (mx, my - 1), (mx + mw * 0.45, my - 8), width=7)
        else:
            brows(0, 0, bend=5)
            smile(c, mx, my, mw * 0.8, depth=9)
    elif mood == "nervous":
        eye(c, lx, ey, erx, ery + 2, look=(0.75, -0.15), pupil=0.34)
        eye(c, rx, ey, erx, ery + 2, look=(0.75, -0.15), pupil=0.34)
        brows(12, -2, bend=3)
        wobble_mouth(c, mx - mw * 0.5, mx + mw * 0.5, my, amp=5)
        sweat(c, 200 + gap + erx + 34, ey - ery - 6, 0.85)
    elif mood == "smug":
        eye(c, lx, ey, erx, ery - 2, look=(0.55, 0.15), pupil=0.46, lid=0.5, lid_color=lid)
        eye(c, rx, ey, erx, ery - 2, look=(0.55, 0.15), pupil=0.46, lid=0.5, lid_color=lid)
        brow(c, (lx - bw, by + 4), (lx + bw, by + 8), bend=2)
        brow(c, (rx - bw, by - 4), (rx + bw, by - 14), bend=12)
        smirk(c, mx, my, mw)
    elif mood == "shocked":
        eye(c, lx, ey, erx + 3, ery + 5, pupil=0.26)
        eye(c, rx, ey, erx + 3, ery + 5, pupil=0.26)
        brows(16, 14, bend=8, y=by - 6)
        o_mouth(c, mx, my + 2, mw * 0.3, mw * 0.4)
    elif mood == "cracked":
        eye(c, lx, ey + 2, erx, ery, look=(0, 0.8), pupil=0.4, lid=0.52, lid_color=lid, lid_tilt=-14)
        eye(c, rx, ey + 2, erx, ery, look=(0, 0.8), pupil=0.4, lid=0.52, lid_color=lid, lid_tilt=14)
        brows(14, -4, bend=2, y=by + 2)
        frown(c, mx, my + 4, mw * 0.8)
        # A single tear.
        tx, ty = lx - erx * 0.4, ey + ery + 18
        p = skia.Path()
        p.moveTo(tx, ty - 12)
        p.cubicTo(tx + 9, ty, tx + 9, ty + 9, tx, ty + 9)
        p.cubicTo(tx - 9, ty + 9, tx - 9, ty, tx, ty - 12)
        c.drawPath(p, fill(SWEAT))
        c.drawPath(p, pen(INK, 4))


def effects(c, ch: Character, mood):
    s = ch.s
    if mood == "shocked":
        y = s.top + 30
        shock_lines(c, 200, y, (-150, -90, -30), 60, 92)


# ----- the whole figure ---------------------------------------------------


def draw_character(c, ch: Character, mood: str):
    s = ch.s
    c.translate(0, 40)
    ch.back(c, ch, mood)
    legs(c, s.legs, s.leg_top)
    arms(c, ch, mood)
    body = s.body()
    solid(c, body, ch.base, ch.dark, shine=s.shine())
    c.save()
    c.clipPath(body, doAntiAlias=True)
    ch.body(c, ch, mood)
    c.restore()
    c.drawPath(body, pen(INK, 9))
    front_arms(c, ch, mood)
    express(c, ch, mood)
    ch.face(c, ch, mood)
    ch.top(c, ch, mood)
    effects(c, ch, mood)


# ----- small shared bits of gear -------------------------------------------


def blush(c, ch, mood, colour="#F07A7A", alpha=110):
    s = ch.s
    (lx, ey), (rx, _) = s.eyes
    for x in (lx - 6, rx + 6):
        c.drawOval(rect(x - 16, ey + s.eye_r[1] + 6, x + 16, ey + s.eye_r[1] + 20), fill(colour, alpha))


def freckles(c, ch, mood):
    s = ch.s
    (lx, ey), (rx, _) = s.eyes
    y = ey + s.eye_r[1] + 12
    for x0 in (lx, rx):
        for dx, dy in ((-8, 0), (2, 5), (10, -2)):
            c.drawCircle(x0 + dx, y + dy, 2.6, fill(INK, 170))


def stubble(c, ch, mood):
    s = ch.s
    mx, my = s.mouth
    import random

    rnd = random.Random(ch.key)
    # Only on the chin and jaw, never over the mouth.
    for _ in range(30):
        x = mx + rnd.uniform(-s.mouth_w * 0.8, s.mouth_w * 0.8)
        y = my + rnd.uniform(16, 32)
        c.drawCircle(x, y, 1.7, fill(INK, 110))


def glasses(c, ch, mood, kind="round", colour=INK, lens_alpha=0):
    s = ch.s
    (lx, ey), (rx, _) = s.eyes
    erx, ery = s.eye_r
    r = max(erx, ery) + 7
    for x in (lx, rx):
        if kind == "round":
            shape = oval(x, ey, r)
        elif kind == "square":
            shape = rrect(x - r - 2, ey - r + 4, x + r + 2, ey + r - 4, 8)
        else:  # cat-eye
            shape = poly([(x - r - 6, ey - r + 2), (x + r + 4, ey - r + 8), (x + r, ey + r - 6), (x - r + 4, ey + r - 4)], 12)
        if lens_alpha:
            c.drawPath(shape, fill(WHITE, lens_alpha))
        c.drawPath(shape, pen(colour, 6))
    curve(c, (lx + r, ey - 2), (200, ey - 10), (rx - r, ey - 2), width=6, color=colour)


def collar(c, ch, colour, dark, y, depth=46, width=60):
    """A shirt or coat collar: two points meeting at the middle."""
    for side in (-1, 1):
        p = poly([(200, y + depth), (200 + side * width, y - 4), (200 + side * (width - 34), y + 2)], 6)
        solid(c, p, colour, dark, shadow=(0, 4), outline=6)


def lapels(c, ch, colour, dark, y, bottom=420, open_w=26):
    """An open coat or jacket: two panels from the collar down to the hem."""
    s = ch.s
    for side in (-1, 1):
        w = s.half(bottom) + 20
        p = poly([(200 + side * open_w, y), (200 + side * w, y - 30), (200 + side * w, bottom), (200 + side * (open_w + 8), bottom)], 4)
        solid(c, p, colour, dark, shadow=(side * -8, 0), outline=7)
