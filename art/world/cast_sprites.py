"""Case 001's characters for the world game (W2.3): every suspect in all five moods, everyone's walk, packed for phones.

    python art/world/cast_sprites.py    # -> src/assets/world/case-001/cast-0.webp, cast-1.webp and art/world/cast.json

The suspects come from the cast kit (art/omc_art/cast), drawn exactly as the evidence cards and films draw them; the
detectives from detectives.py. A walk is three frames, played a, b, a, c: a wide stance with both feet down (the body
dips so they stay on the floor), then the left foot lifted, the stance again, then the right foot lifted. The legs
really move, and never cross. Forward is to the right: the world flips a sprite to walk left. No ground shadows here: the world draws
contact shadows that move with the walk.

Tiles are 300 x 420, three quarters of the 400 x 560 cast frame. That's enough for the close-up (a suspect is about
380 device px tall there), and it fits everything on two 2048 px sheets, which phones mipmap well. They sit 24 px
apart, 6 across and 4 down a sheet, so the small mipmaps don't bleed. cast.json lists the frames in order;
src/lib/world/sprites.ts has the same list and a test keeps the two the same.
"""
from __future__ import annotations

import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, "art"))

import skia  # noqa: E402
from PIL import Image  # noqa: E402

from detectives import GROUND as DET_GROUND, HIPS as DET_HIPS, detective, dip, leg_points  # noqa: E402
from omc_art.cast import CASTS  # noqa: E402
from omc_art.cast import base  # noqa: E402
from omc_art.paint import fill, pen  # noqa: E402
from omc_art.palette import INK  # noqa: E402
from omc_art.post import sticker  # noqa: E402
from omc_art.shapes import rrect  # noqa: E402
from omc_art.suspects.body import GROUND  # noqa: E402

OUT = os.path.join(ROOT, "src", "assets", "world", "case-001")
TILE = (300, 420)
GAP, COLS, ROWS, SHEET = 24, 6, 4, 2048
SCALE = 1.5  # the cast frame (400 x 560) renders at 600 x 840, then shrinks to the tile
MOODS = list(base.MOODS)
STEPS = ["a", "b", "c"]  # wide stance, left foot up, right foot up: played a, b, a, c

SUSPECTS = {"priya": "c001-priya", "squires": "c001-squires", "ozzy": "c001-ozzy", "rena": "c001-rena"}
DETECTIVES = {
    "sam": ("square", "#F2B33D", "scarf"),
    "mei": ("circle", "#EF5B5B", "camera"),
    "ali": ("triangle", "#9B87F5", "notebook"),
    "jo": ("rect", "#3FB8AF", "headset"),
}


def walking_legs(step, down):
    """The cast kit's legs() with a step: lines from the hips, shoes the way the kit draws them, on the floor."""
    floor = GROUND - 10 - down  # the floor, in the lowered frame

    def legs(c, xs, top):
        for i, x in enumerate(xs):
            pts = leg_points(step, i, x, top, floor)
            path = skia.Path()
            path.moveTo(*pts[0])
            for p in pts[1:]:
                path.lineTo(*p)
            c.drawPath(path, pen(INK, 11))
            fx, fy = pts[-1]
            if i == 0:
                c.drawPath(rrect(fx - 40, fy - 10, fx + 6, fy + 10, 10), fill(INK))
            else:
                c.drawPath(rrect(fx - 6, fy - 10, fx + 40, fy + 10, 10), fill(INK))

    return legs


def suspect(ch, mood, step=None) -> Image.Image:
    w, h = 400, 560
    surface = skia.Surface(round(w * SCALE), round(h * SCALE))
    standing = base.legs
    down = dip(step, ch.s.leg_top, GROUND - 10)
    try:
        if step:
            base.legs = walking_legs(step, down)
        with surface as c:
            c.clear(skia.ColorTRANSPARENT)
            c.scale(SCALE, SCALE)
            c.translate(0, down)
            base.draw_character(c, ch, mood)
    finally:
        base.legs = standing
    im = Image.fromarray(surface.makeImageSnapshot().toarray(colorType=skia.kRGBA_8888_ColorType), "RGBA")
    return sticker(im, SCALE)


def frames():
    """(character, pose, picture) in atlas order."""
    cast = {ch.key: ch for ch in CASTS["c001"]}
    for pid, key in SUSPECTS.items():
        ch = cast[key]
        for mood in MOODS:
            yield pid, mood, suspect(ch, mood)
        for step in STEPS:
            yield pid, f"walk-{step}", suspect(ch, "idle", step)
    for pid, (kind, colour, prop) in DETECTIVES.items():
        yield pid, "idle", detective(kind, colour, prop)
        for step in STEPS:
            yield pid, f"walk-{step}", detective(kind, colour, prop, step)


def main():
    per = COLS * ROWS
    listed, sheets = [], []
    for n, (pid, pose, im) in enumerate(frames()):
        if n % per == 0:
            sheets.append(Image.new("RGBA", (SHEET, SHEET), (0, 0, 0, 0)))
        k = n % per
        x, y = GAP + (k % COLS) * (TILE[0] + GAP), GAP + (k // COLS) * (TILE[1] + GAP)
        sheets[-1].paste(im.resize(TILE, Image.LANCZOS), (x, y))
        listed.append([pid, pose])
    os.makedirs(OUT, exist_ok=True)
    for i, sheet in enumerate(sheets):
        path = os.path.join(OUT, f"cast-{i}.webp")
        sheet.save(path, "WEBP", quality=92, method=6)
        print(f"cast-{i}.webp: {os.path.getsize(path) // 1024} KB")
    with open(os.path.join(HERE, "cast.json"), "w") as f:
        json.dump({"tile": TILE, "gap": GAP, "perSheet": per, "frames": listed}, f, indent=1)
    print(f"{len(listed)} frames on {len(sheets)} sheets")
    # A strip of every walk, for checking by eye (not committed).
    walks = [im for pid, pose, im in frames() if pose.startswith("walk") or (pose == "idle")]
    strip = Image.new("RGBA", (TILE[0] * len(walks) // 2, TILE[1] // 2), (24, 20, 40, 255))
    for i, im in enumerate(walks):
        strip.alpha_composite(im.resize((TILE[0] // 2, TILE[1] // 2), Image.LANCZOS), (i * TILE[0] // 2, 0))
    strip.convert("RGB").save(os.path.join(HERE, "cast-walks.png"))


if __name__ == "__main__":
    main()
