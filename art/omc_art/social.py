"""Social share card (Open Graph / Twitter), 1200 x 630, used by the site."""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from .export import OUT
from .palette import CREAM, INK, MUSTARD, NIGHT
from .preview import load
from .suspects import SUSPECTS

W, H = 1200, 630
FONTS = Path(__file__).resolve().parents[1] / "fonts"


def display(size: int) -> ImageFont.FreeTypeFont:
    """Lilita One, the site's title font."""
    return ImageFont.truetype(str(FONTS / "LilitaOne-Regular.ttf"), size)


def body(size: int, weight: int) -> ImageFont.FreeTypeFont:
    """Nunito at a given weight, the site's body font."""
    f = ImageFont.truetype(str(FONTS / "Nunito[wght].ttf"), size)
    f.set_variation_by_axes([weight])
    return f


def place(canvas: Image.Image, im: Image.Image, x: int, y: int):
    """alpha_composite that clips anything hanging off the right or bottom edge."""
    canvas.alpha_composite(im.crop((0, 0, min(im.width, W - x), min(im.height, H - y))), (x, y))


def legibility_wash(canvas: Image.Image):
    """Darken the left side under the title, fading out towards the suspects."""
    alpha = np.clip(np.linspace(190, -60, W), 0, 255).astype(np.uint8)
    wash = Image.new("RGBA", (W, H), NIGHT)
    wash.putalpha(Image.fromarray(np.tile(alpha, (H, 1))))
    canvas.alpha_composite(wash)


def social_card() -> Image.Image:
    canvas = load("sky", W).crop((0, 0, W, H))
    place(canvas, load("moon", 230), 900, 24)
    place(canvas, load("cloud-a", 330), 790, 160)
    place(canvas, load("city-back", W), 0, H - 420)
    place(canvas, load("city-front", W), 0, H - 345)
    legibility_wash(canvas)
    for i, name in enumerate(SUSPECTS):
        place(canvas, load(f"suspect-{name}-idle", 140), 640 + i * 130, 433)

    # Same words and colours as the site's hero: title, then the hook, then who it's for.
    draw = ImageDraw.Draw(canvas)
    title = display(124)
    more = "One More "
    for dx, dy, first, second in ((7, 7, INK, INK), (0, 0, CREAM, MUSTARD)):
        draw.text((70 + dx, 58 + dy), more, font=title, fill=first)
        draw.text((70 + dx + draw.textlength(more, font=title), 58 + dy), "Clue", font=title, fill=second)
    hook = display(46)
    for i, line in enumerate(("Everyone holds different evidence.", "Nobody solves it alone.")):
        y = 222 + i * 56
        draw.text((75, y + 4), line, font=hook, fill=INK)
        draw.text((72, y), line, font=hook, fill=MUSTARD)
    draw.text((74, 352), "A mystery for 2 to 4 friends on their phones.", font=body(30, 700), fill=CREAM)
    return canvas.convert("RGB")


def make_social_card():
    social_card().save(OUT / "social" / "og-image.png", optimize=True)
