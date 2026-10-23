"""Social share card (Open Graph / Twitter), 1200 x 630, used by the site."""
import numpy as np
from PIL import Image, ImageDraw

from .export import OUT
from .palette import CREAM, INK, MUSTARD, NIGHT
from .preview import font, load
from .suspects import SUSPECTS

W, H = 1200, 630


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

    draw = ImageDraw.Draw(canvas)
    for dx, dy, first, second in ((6, 6, INK, INK), (0, 0, CREAM, MUSTARD)):
        draw.text((70 + dx, 70 + dy), "ONE MORE", font=font(96), fill=first)
        draw.text((70 + dx, 176 + dy), "CLUE", font=font(96), fill=second)
    draw.text((74, 306), "Mysteries you crack with friends.", font=font(32, bold=False), fill=CREAM)
    draw.text((74, 350), "Four suspects. One lie.", font=font(32, bold=False), fill=CREAM)
    return canvas.convert("RGB")


def make_social_card():
    social_card().save(OUT / "social" / "og-image.png", optimize=True)
