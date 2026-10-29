"""Pieces every case poster shares: backdrops, glows, stars, snow, signage
text, and the four suspects as a noir silhouette lineup with glowing eyes.

Posters are key art only. Titles are set by the site in its own font, so the
top quarter of each poster is kept as quiet sky for them to sit on.
"""
import random

import numpy as np
import skia
from PIL import Image

from ..paint import col, fill
from ..palette import CREAM, INK
from ..shapes import rect, sparkle_path
from ..suspects import SUSPECTS

W, H = 600, 900

# Where each suspect's eyes are in its 400 x 560 frame (idle pose).
EYES = {
    "triangle": ((170, 290), (230, 290)),
    "square": ((160, 266), (240, 266)),
    "circle": ((166, 290), (234, 290)),
    "rectangle": ((172, 210), (228, 210)),
}
FEET = 520  # suspects stand on y=480, drawn 40 lower


def backdrop(c, stops, w=W, h=H, horizontal=False):
    """Linear gradient fill; stops are hex colours from top (or left) down."""
    end = (w, 0) if horizontal else (0, h)
    shader = skia.GradientShader.MakeLinear(points=[(0, 0), end], colors=[col(s) for s in stops])
    c.drawRect(rect(0, 0, w, h), skia.Paint(AntiAlias=True, Shader=shader))


def glow(c, x, y, r, colour, a=150):
    shader = skia.GradientShader.MakeRadial(skia.Point(x, y), r, [col(colour, a), col(colour, 0)])
    c.drawCircle(x, y, r, skia.Paint(AntiAlias=True, Shader=shader))


def soft(colour, a, sigma) -> skia.Paint:
    """Fill with a blurred edge, for light spill and haze."""
    return skia.Paint(Color=col(colour, a), AntiAlias=True,
                      MaskFilter=skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, sigma))


def stars(c, seed, count, l, t, r, b, sparkles=6, colours=(CREAM,)):
    rng = random.Random(seed)
    for _ in range(count):
        c.drawCircle(rng.uniform(l, r), rng.uniform(t, b), rng.uniform(0.8, 2.2), fill(CREAM, rng.randint(80, 220)))
    for _ in range(sparkles):
        c.drawPath(sparkle_path(rng.uniform(l, r), rng.uniform(t, b), rng.uniform(5, 10)),
                   fill(rng.choice(colours), 220))


def snow(c, seed, count, l, t, r, b, colour=CREAM, big=0.15):
    rng = random.Random(seed)
    for _ in range(count):
        x, y = rng.uniform(l, r), rng.uniform(t, b)
        if rng.random() < big:
            c.drawCircle(x, y, rng.uniform(3.5, 6), soft(colour, rng.randint(150, 230), 1.2))
        else:
            c.drawCircle(x, y, rng.uniform(1.2, 2.8), fill(colour, rng.randint(110, 220)))


def sign_text(c, text, x, y, size, colour, a=255):
    """Short diegetic signage (ON AIR, 99.1), centred on x with its baseline at y."""
    font = skia.Font(skia.Typeface("Arial Black") or skia.Typeface("Arial", skia.FontStyle.Bold()), size)
    c.drawString(text, x - font.measureText(text) / 2, y, font, fill(colour, a))


def silhouette(c, name, x, y, s, rim, eyes=CREAM, rim_offset=5):
    """One suspect as a flat ink shape with a rim of light up its left side and glowing eyes."""
    draw = SUSPECTS[name]
    for dx, dy, colour in ((-rim_offset, -rim_offset * 0.6, rim), (0, 0, INK)):
        c.saveLayer(None, skia.Paint(ColorFilter=skia.ColorFilters.Blend(col(colour), skia.BlendMode.kSrcIn)))
        c.translate(x + dx, y + dy)
        c.scale(s, s)
        draw(c, "idle")
        c.restore()
    for ex, ey in EYES[name]:
        px, py = x + ex * s, y + ey * s
        c.drawCircle(px, py, 26 * s, soft(eyes, 120, 9 * s))
        c.drawCircle(px, py, 8 * s, fill(eyes))


def lineup(c, cx, ground, height, rim, eyes=CREAM, order=("triangle", "square", "circle", "rectangle"), gap=0.62):
    """The four suspects side by side, feet on `ground`, centred on cx."""
    s = height / FEET
    step = 400 * s * gap
    for i, name in enumerate(order):
        x = cx + (i - (len(order) - 1) / 2) * step - 200 * s
        silhouette(c, name, x, ground - FEET * s, s, rim, eyes)


def poster_post(im: Image.Image, scale: float) -> Image.Image:
    """Vignette and a fine film grain so the flat art reads as a printed poster."""
    a = np.asarray(im.convert("RGB"), dtype=np.float32)
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
    a *= (1 - np.clip(d - 0.75, 0, 1) * 0.45)[..., None]
    a += np.random.default_rng(7).normal(0, 5, (h, w, 1))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")
