"""Review images: contact sheets and a rough hero composite. Not used by the site."""
import math

from PIL import Image, ImageDraw, ImageFont

from .export import OUT, png_path
from .palette import CREAM, INK, MUSTARD
from .suspects import SUSPECTS


def font(size, bold=True):
    for name in (("ariblk.ttf", "arialbd.ttf") if bold else ("arial.ttf",)):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default(size=size)


def load(name, width) -> Image.Image:
    im = Image.open(png_path(name)).convert("RGBA")
    return im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)


def hero_preview():
    W, H = 1600, 900
    canvas = Image.open(png_path("sky")).convert("RGBA").resize((W, H), Image.LANCZOS)
    canvas.alpha_composite(load("moon", 300), (1130, 50))
    canvas.alpha_composite(load("cloud-b", 300), (300, 150))
    canvas.alpha_composite(load("cloud-a", 440), (960, 240))
    canvas.alpha_composite(load("city-back", W), (0, H - 560))
    canvas.alpha_composite(load("city-front", W), (0, H - 460))
    for i, name in enumerate(SUSPECTS):
        canvas.alpha_composite(load(f"suspect-{name}-idle", 190), (820 + i * 170, 880 - 247))
    draw = ImageDraw.Draw(canvas)
    for dx, dy, fill_ in ((6, 6, INK), (0, 0, CREAM)):
        draw.text((90 + dx, 120 + dy), "ONE MORE", font=font(104), fill=fill_)
        draw.text((90 + dx, 232 + dy), "CLUE", font=font(104), fill=MUSTARD if fill_ == CREAM else fill_)
    draw.text((94, 372), "Four suspects. One lie. Can your group crack it?", font=font(30, bold=False), fill=CREAM)
    canvas.convert("RGB").save(OUT / "preview" / "hero-preview.png")


def contact_sheet(names, background, label_colour, filename):
    cols, tile, label_h = 6, 300, 40
    rows = math.ceil(len(names) / cols)
    sheet = Image.new("RGBA", (cols * tile, rows * (tile + label_h)), background)
    draw = ImageDraw.Draw(sheet)
    for i, name in enumerate(names):
        r, cl = divmod(i, cols)
        im = Image.open(png_path(name)).convert("RGBA")
        im.thumbnail((tile - 30, tile - 30), Image.LANCZOS)
        x0, y0 = cl * tile, r * (tile + label_h)
        sheet.alpha_composite(im, (x0 + (tile - im.width) // 2, y0 + (tile - im.height) // 2))
        draw.text((x0 + 14, y0 + tile + 6), name, font=font(18, bold=False), fill=label_colour)
    sheet.convert("RGB").save(OUT / "preview" / filename)
