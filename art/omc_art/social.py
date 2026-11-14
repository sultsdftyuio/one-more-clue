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


# The cases a room can be opened for, named as in their case files (src/data/cases/*.ts).
# Keep these in step with the files; the practice case has no poster and uses the main card.
INVITES = (
    ("case-001", "Case 001", "The Last Message"),
    ("case-002", "Case 002", "Dead Air"),
    ("case-003", "Case 003", "The Last Course"),
    ("case-004", "Case 004", "Snowed In"),
)


def rounded(im: Image.Image, radius: int) -> Image.Image:
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, im.width - 1, im.height - 1), radius, fill=255)
    out = im.convert("RGBA")
    out.putalpha(mask)
    return out


def wrap(text: str, font: ImageFont.FreeTypeFont, width: int) -> list[str]:
    lines: list[str] = []
    for word in text.split():
        trial = f"{lines[-1]} {word}" if lines else word
        if lines and ImageDraw.Draw(Image.new("RGBA", (1, 1))).textlength(trial, font=font) <= width:
            lines[-1] = trial
        else:
            lines.append(word)
    return lines


ROOM, CARD, TEAL = "#0B0D12", "#171B21", "#3FB8AF"


def invite_card(case_id: str, code: str, title: str) -> Image.Image:
    """What a room's invite link shows in a chat: a plain ticket to tonight's case, with its poster."""
    canvas = Image.new("RGBA", (W, H), ROOM)
    draw = ImageDraw.Draw(canvas)
    x0, y0, x1, y1 = 60, 85, W - 60, H - 85
    stub_w = 230
    split = x1 - stub_w
    draw.rounded_rectangle((x0, y0, split, y1), 28, fill=CARD)
    draw.rectangle((split - 30, y0, split, y1), fill=CARD)
    draw.rounded_rectangle((split, y0, x1, y1), 28, fill=TEAL)
    draw.rectangle((split, y0, split + 30, y1), fill=TEAL)

    # The case poster down the left edge.
    poster = load(f"poster-{case_id}", 320)
    ph = y1 - y0
    top = max(0, (poster.height - ph) // 2 - 40)
    art = poster.crop((0, top, 300, top + ph))
    mask = Image.new("L", art.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, art.width + 40, art.height - 1), 28, fill=255)
    canvas.paste(art, (x0, y0), mask)

    # A perforated tear line, with a notch top and bottom.
    for yy in range(y0 + 30, y1 - 30, 24):
        draw.line((split, yy, split, yy + 12), fill="#2A3038", width=4)
    for yy in (y0, y1):
        draw.ellipse((split - 20, yy - 20, split + 20, yy + 20), fill=ROOM)

    tx = x0 + 340
    draw.text((tx, y0 + 52), f"{code.upper()}  ·  TONIGHT", font=body(24, 900), fill="#A9AEB8")
    size = 88
    while size > 56:
        font = display(size)
        lines = wrap(title, font, split - tx - 40)
        if len(lines) <= 2:
            break
        size -= 8
    y = y0 + 96
    for line in lines:
        draw.text((tx, y), line, font=font, fill=CREAM)
        y += round(size * 1.04)
    draw.text((tx, y + 14), "Your seat is waiting. Joining is free.", font=body(30, 800), fill="#D9DCE2")

    logo = load("logo-mark", 52)
    canvas.alpha_composite(logo, (tx, y1 - 86))
    brand = display(36)
    more = "One More "
    draw.text((tx + 64, y1 - 80), more, font=brand, fill=CREAM)
    draw.text((tx + 64 + draw.textlength(more, font=brand), y1 - 80), "Clue", font=brand, fill=MUSTARD)

    sx = split + stub_w // 2
    for text, font, fill, yy in (("Admit", display(64), INK, y0 + 110), ("one", display(64), INK, y0 + 180), ("You're invited", body(26, 900), INK, y1 - 110)):
        tw = draw.textlength(text, font=font)
        draw.text((sx - tw / 2, yy), text, font=font, fill=fill)
    return canvas.convert("RGB")


def make_invite_cards():
    for case_id, code, title in INVITES:
        invite_card(case_id, code, title).save(OUT / "social" / f"invite-{case_id}.jpg", quality=88, optimize=True)
