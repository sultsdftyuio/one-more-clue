"""Pixel post-processing applied after Skia renders an asset."""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from .palette import CREAM
from .suspects.body import GROUND


def sticker(im: Image.Image, scale: float, radius=7, colour=CREAM) -> Image.Image:
    """Die-cut cream border so a character reads on dark and light backgrounds."""
    r = radius * scale
    blurred = np.asarray(im.getchannel("A").filter(ImageFilter.GaussianBlur(r / 2)), dtype=np.float32)
    mask = (np.clip((blurred - 6) / 10, 0, 1) * 255).astype(np.uint8)
    out = Image.new("RGBA", im.size, colour)
    out.putalpha(Image.fromarray(mask))
    out.alpha_composite(im)
    return out


def suspect_post(im: Image.Image, scale: float) -> Image.Image:
    """Sticker border, then a soft ground shadow underneath."""
    im = sticker(im, scale)
    shadow = Image.new("RGBA", im.size, (0, 0, 0, 0))
    y = (GROUND + 40) * scale
    ImageDraw.Draw(shadow).ellipse((80 * scale, y - 12 * scale, 320 * scale, y + 14 * scale), fill=(0, 0, 0, 55))
    shadow.alpha_composite(im)
    return shadow
