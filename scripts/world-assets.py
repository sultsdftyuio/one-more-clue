"""Packs a case's painted world for the game: the plate, a small copy for the zoomed-out map, and the sprite atlas.

    python scripts/world-assets.py    # -> src/assets/world/case-001/{plate,plate-map,sprites}.webp

Phones' GPUs only make mipmaps (smooth zoomed-out pictures) for power-of-two textures, and some can't hold a
texture wider than 4096 px. So:
- plate.webp is the painted building as it is (3240 x 1700 at 2 px per cm, copied unchanged), for the close-up;
- plate-map.webp is the same picture at 2048 x 1024, which the world shows when zoomed out;
- sprites.webp puts the twelve 400 x 560 tiles of the mockup's sprite strip (4800 px wide) on a 2048 x 2048 grid,
  4 across and 3 down, 24 px apart so the smaller mipmaps don't bleed one tile into the next;
- desk.webp is the security desk cut out of the plate along its outline in world.json, drawn over whoever
  stands behind it. Its box is rounded out to whole pixels the way outlineBox() in src/lib/world/geometry.ts does.
The tile order stays the strip's (art/mockups/case001/sprites.py), so frame n is tile n.
"""
import json
import math
import os
import shutil

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "art", "mockups", "case001")
OUT = os.path.join(ROOT, "src", "assets", "world", "case-001")
TILE = (400, 560)
TILES = 12
COLS = 4
GAP = 24  # margin and spacing, in px
ATLAS = 2048
SUPERSAMPLE = 4  # occluder edges are drawn this much bigger, then shrunk, so they're smooth


def save(img, name, quality):
    path = os.path.join(OUT, name)
    img.save(path, "WEBP", quality=quality, method=6)
    print(f"{name}: {img.size[0]} x {img.size[1]}, {os.path.getsize(path) // 1024} KB")


def main():
    os.makedirs(OUT, exist_ok=True)

    plate = Image.open(os.path.join(SRC, "world.webp")).convert("RGB")
    assert plate.size == (3240, 1700), plate.size
    # The plate is copied byte for byte: encoding it again would only lose detail.
    shutil.copyfile(os.path.join(SRC, "world.webp"), os.path.join(OUT, "plate.webp"))
    print(f"plate.webp: {plate.size[0]} x {plate.size[1]}, {os.path.getsize(os.path.join(OUT, 'plate.webp')) // 1024} KB (copied)")
    save(plate.resize((2048, 1024), Image.LANCZOS), "plate-map.webp", 88)

    strip = Image.open(os.path.join(SRC, "sprites.webp")).convert("RGBA")
    assert strip.size == (TILE[0] * TILES, TILE[1]), strip.size
    atlas = Image.new("RGBA", (ATLAS, ATLAS), (0, 0, 0, 0))
    for i in range(TILES):
        tile = strip.crop((i * TILE[0], 0, (i + 1) * TILE[0], TILE[1]))
        col, row = i % COLS, i // COLS
        atlas.paste(tile, (GAP + col * (TILE[0] + GAP), GAP + row * (TILE[1] + GAP)))
    save(atlas, "sprites.webp", 92)

    world = json.load(open(os.path.join(SRC, "world.json")))
    x0, _, _, z1 = world["extent"]
    ppc = world["px_per_cm"]
    outline = [((x - x0) * ppc, (z1 - z) * ppc) for x, z in world["desk_front"]]
    left, top = math.floor(min(p[0] for p in outline)), math.floor(min(p[1] for p in outline))
    right, bottom = math.ceil(max(p[0] for p in outline)), math.ceil(max(p[1] for p in outline))
    w, h = right - left, bottom - top
    mask = Image.new("L", (w * SUPERSAMPLE, h * SUPERSAMPLE), 0)
    ImageDraw.Draw(mask).polygon([((x - left) * SUPERSAMPLE, (y - top) * SUPERSAMPLE) for x, y in outline], fill=255)
    desk = plate.crop((left, top, right, bottom)).convert("RGBA")
    desk.putalpha(mask.resize((w, h), Image.LANCZOS))
    print(f"desk box: x {left}, y {top}, {w} x {h}")
    save(desk, "desk.webp", 92)


if __name__ == "__main__":
    main()
