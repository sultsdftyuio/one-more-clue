"""Rendering to PNG masters, WebP web copies and icons."""
from pathlib import Path

import skia
from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "out"
ICON_SIZES = (("favicon-32.png", 32), ("favicon-48.png", 48), ("apple-touch-icon.png", 180),
              ("icon-192.png", 192), ("icon-512.png", 512))


def prepare_dirs():
    for d in ("png", "webp", "icons", "preview", "social"):
        (OUT / d).mkdir(parents=True, exist_ok=True)


def png_path(name: str) -> Path:
    return OUT / "png" / f"{name}.png"


def render(asset) -> Path:
    w, h = asset.size
    surface = skia.Surface(round(w * asset.scale), round(h * asset.scale))
    with surface as c:
        c.clear(skia.ColorTRANSPARENT)
        c.scale(asset.scale, asset.scale)
        asset.draw(c)
    path = png_path(asset.name)
    surface.makeImageSnapshot().save(str(path), skia.kPNG)
    if asset.post:
        asset.post(Image.open(path).convert("RGBA"), asset.scale).save(path)
    return path


def export_webp(png: Path, width: int) -> Image.Image:
    im = Image.open(png).convert("RGBA")
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(OUT / "webp" / f"{png.stem}.webp", "WEBP", quality=90, method=6)
    return im


def make_icons():
    icon = Image.open(png_path("app-icon")).convert("RGBA")
    for name, size in ICON_SIZES:
        icon.resize((size, size), Image.LANCZOS).save(OUT / "icons" / name)
    icon.save(OUT / "icons" / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
