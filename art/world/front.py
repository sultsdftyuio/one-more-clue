"""The furniture people can stand behind, for the world game's front layer (W2.1 in docs/world-overhaul.md).

    python art/world/front.py    # -> front.json and front-mask.png, next to world.webp

Each piece is drawn again on its own, with the painter's own code at the same spot as in world.py, onto a clear
canvas. Its coverage is the cut-out's exact shape, gaps between legs included, so nothing behind it comes along.
scripts/world-assets.py then cuts each piece out of the plate with that mask, and the world draws the pieces over
anyone standing behind them. The plate itself is not touched.

front.json lists each piece's room and outline in world cm. The outline is the piece's box, except for the security
desk, whose outline (world.json's desk_front) is its real shape: it comes from the lobby photo, not a floor piece.
src/lib/world/plates.ts copies the outlines, and a test keeps the two the same.
"""
from __future__ import annotations

import json
import os
import sys

sys.argv = sys.argv[:1]  # world.py reads "draft" from the command line: the front layer is always full size
import halden as Hd  # noqa: E402
import world as Wd  # noqa: E402
from halden import np, skia  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))

# id, room, and what world.py puts there: (x, floor z as put() takes it, painter function), in today's world cm (the four first
# rooms are drawn shifted: world.py's SHIFT). No shadows: they stay on the floor.
PIECES = [
    ("lab-bench", "lab4", [(813, 300, Wd.lab_bench), (813, 402, Wd.bench_things)]),
    ("lab-chair", "lab4", [(1012, 300, Wd.office_chair)]),
    ("printer-bench", "maker", [(202, 0, Wd.printer_bench)]),
    ("stool", "maker", [(320, 0, Wd.stool)]),
    ("laser-cutter", "maker", [(414, 0, Wd.laser_cutter)]),
    ("corridor-bench", "corridor", [(1368, 300, Wd.bench_seat)]),
    ("water-cooler", "corridor", [(1528, 300, Wd.water_cooler)]),
]


def coverage(draw) -> np.ndarray:
    """What `draw` covers on a clear plate-sized canvas, 0-255."""
    surf = skia.Surface(Wd.W, Wd.H)
    c = surf.getCanvas()
    c.clear(skia.ColorTRANSPARENT)
    Hd.MODE = "albedo"
    draw(c)
    return surf.makeImageSnapshot().toarray(colorType=skia.kRGBA_8888_ColorType)[..., 3].copy()


def to_world(px: float, py: float) -> list[float]:
    return [round(px / Wd.P + Wd.XMIN, 2), round(Wd.ZMAX - py / Wd.P, 2)]


def main():
    assert Wd.P == 2.0, "the front layer has to match the full-size plate"
    world = json.load(open(os.path.join(HERE, "world.json")))
    mask = np.zeros((Wd.H, Wd.W), np.uint8)
    pieces = {}

    for pid, room, parts in PIECES:
        alpha = coverage(lambda c: [Wd.put(c, x, z, fn) for x, z, fn in parts])
        ys, xs = np.nonzero(alpha)
        x0, x1, y0, y1 = int(xs.min()), int(xs.max()) + 1, int(ys.min()), int(ys.max()) + 1
        pieces[pid] = {"room": room, "outline": [to_world(x0, y1), to_world(x1, y1), to_world(x1, y0), to_world(x0, y0)]}
        mask = np.maximum(mask, alpha)
        print(f"{pid}: x {x0}-{x1}, y {y0}-{y1} px")

    # The security desk: its outline from the manifest, filled.
    outline = world["desk_front"]

    def desk(c):
        path = skia.Path()
        path.addPoly([skia.Point(Wd.sx(x), Wd.sy(z)) for x, z in outline], True)
        c.drawPath(path, skia.Paint(AntiAlias=True, Color=skia.ColorWHITE))

    mask = np.maximum(mask, coverage(desk))
    pieces["desk"] = {"room": "lobby", "outline": outline}

    from PIL import Image

    Image.fromarray(mask, "L").save(os.path.join(HERE, "front-mask.png"), optimize=True)
    with open(os.path.join(HERE, "front.json"), "w") as f:
        json.dump(pieces, f, indent=1)
    print(f"front-mask.png and front.json: {len(pieces)} pieces")


if __name__ == "__main__":
    main()
