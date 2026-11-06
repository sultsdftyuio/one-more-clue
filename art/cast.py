"""Renders the case casts: every character in every expression.

    python cast.py              all casts
    python cast.py c001         one case (any key prefix)

Outputs:
    out/cast/png/<key>-<mood>.png   masters (2.5x)
    out/cast/webp/<key>-<mood>.webp web copies, 640 wide
    out/cast/sheet-<case>.png       a review sheet per case
"""
import sys
from pathlib import Path

import skia
from PIL import Image, ImageDraw

from omc_art.cast import CASTS
from omc_art.cast.base import MOODS, draw_character
from omc_art.post import suspect_post
from omc_art.preview import font

OUT = Path(__file__).resolve().parent / "out" / "cast"
SCALE = 2.5
SIZE = (400, 560)


def render(ch, mood) -> Image.Image:
    w, h = SIZE
    surface = skia.Surface(round(w * SCALE), round(h * SCALE))
    with surface as c:
        c.clear(skia.ColorTRANSPARENT)
        c.scale(SCALE, SCALE)
        draw_character(c, ch, mood)
    im = Image.fromarray(surface.makeImageSnapshot().toarray(colorType=skia.kRGBA_8888_ColorType), "RGBA")
    return suspect_post(im, SCALE)


def sheet(case, cast, images):
    tile, label = 220, 34
    out = Image.new("RGB", (tile * len(MOODS) + 180, (tile + label) * len(cast) + 50), "#2A2F5C")
    d = ImageDraw.Draw(out)
    for j, mood in enumerate(MOODS):
        d.text((180 + j * tile + 70, 14), mood, font=font(20), fill="#FFF4E0")
    for i, ch in enumerate(cast):
        y = 50 + i * (tile + label)
        d.text((14, y + tile // 2 - 10), ch.name, font=font(17, bold=False), fill="#FFF4E0")
        for j, mood in enumerate(MOODS):
            im = images[(ch.key, mood)].copy()
            im.thumbnail((tile - 10, tile - 10), Image.LANCZOS)
            out.paste(im, (180 + j * tile + (tile - im.width) // 2, y), im)
    out.save(OUT / f"sheet-{case}.png")


def one(job):
    """Renders one character in one mood (in a worker process) and saves both copies."""
    case, i, mood = job
    ch = CASTS[case][i]
    im = render(ch, mood)
    im.save(OUT / "png" / f"{ch.key}-{mood}.png")
    web = im.resize((640, round(im.height * 640 / im.width)), Image.LANCZOS)
    web.save(OUT / "webp" / f"{ch.key}-{mood}.webp", "WEBP", quality=88, method=6)
    return job


def main():
    from concurrent.futures import ProcessPoolExecutor

    only = sys.argv[1:]
    for d in ("png", "webp"):
        (OUT / d).mkdir(parents=True, exist_ok=True)
    cases = [case for case in CASTS if not only or any(case.startswith(o) for o in only)]
    jobs = [(case, i, mood) for case in cases for i in range(len(CASTS[case])) for mood in MOODS]
    with ProcessPoolExecutor() as pool:
        list(pool.map(one, jobs))
    for case in cases:
        cast = CASTS[case]
        images = {(ch.key, m): Image.open(OUT / "png" / f"{ch.key}-{m}.png") for ch in cast for m in MOODS}
        sheet(case, cast, images)
        print(f"{case}: {len(cast)} characters x {len(MOODS)} moods")


if __name__ == "__main__":
    main()
