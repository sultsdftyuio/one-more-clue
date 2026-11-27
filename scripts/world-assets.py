"""Packs a case's painted world for the game: the plate, a small copy for the zoomed-out map, and the front layer.
The characters are packed by art/world/cast_sprites.py.

    python scripts/world-assets.py    # -> src/assets/world/case-001/{plate,plate-map}.webp and front/

Phones' GPUs only make mipmaps (smooth zoomed-out pictures) for power-of-two textures, and some can't hold a
texture wider than 4096 px. So:
- plate-0.webp, plate-1.webp, ... are the painted building (6320 x 1700 at 2 px per cm) cut into tiles no wider
  than TILE px, left to right, for the close-up. The cuts fall on walls (CUTS, in world cm), so no object's close-up
  is split; src/data/cases/case-001.building.ts lists the same tiles (plate.tiles) and a test checks them;
- plate-map.webp is the whole picture at 4096 x 1024, which the world shows when zoomed out;
- front/<id>.webp is each piece of furniture people can stand behind (art/world/front.json), cut out of the plate
  with its exact shape from art/world/front-mask.png (python art/world/front.py makes both). The world draws them over
  whoever stands behind. Each box is the outline's, rounded out to whole pixels the way outlineBox() in
  src/lib/world/geometry.ts does.
"""
import glob
import json
import math
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAINTED = os.path.join(ROOT, "art", "world")  # the plate and its front layer
OUT = os.path.join(ROOT, "src", "assets", "world", "case-001")
TILE = 4096  # the widest texture every phone can hold
CUTS = [1668.0]  # where the tiles meet, in world cm: the wall between the corridor and the kitchen


def save(img, name, quality):
    path = os.path.join(OUT, name)
    img.save(path, "WEBP", quality=quality, method=6)
    print(f"{name}: {img.size[0]} x {img.size[1]}, {os.path.getsize(path) // 1024} KB")


def main():
    os.makedirs(OUT, exist_ok=True)

    plate = Image.open(os.path.join(PAINTED, "world.webp")).convert("RGB")
    world = json.load(open(os.path.join(PAINTED, "world.json")))
    assert list(plate.size) == world["plate"], (plate.size, world["plate"])
    # Tiles cut on walls, each no wider than TILE.
    for path in glob.glob(os.path.join(OUT, "plate*.webp")):
        os.remove(path)
    x0, ppc = world["extent"][0], world["px_per_cm"]
    edges = [0] + [round((x - x0) * ppc) for x in CUTS] + [plate.size[0]]
    for k in range(len(edges) - 1):
        assert edges[k + 1] - edges[k] <= TILE, (k, edges)
        tile = plate.crop((edges[k], 0, edges[k + 1], plate.size[1]))
        path = os.path.join(OUT, f"plate-{k}.webp")
        tile.save(path, "WEBP", quality=92, method=6)
        print(f"plate-{k}.webp: x {edges[k]}, {edges[k + 1] - edges[k]} wide, {os.path.getsize(path) // 1024} KB")
    save(plate.resize((4096, 1024), Image.LANCZOS), "plate-map.webp", 88)

    old = os.path.join(OUT, "sprites.webp")  # the mockup's twelve stills, before art/world/cast_sprites.py
    if os.path.exists(old):
        os.remove(old)

    front = json.load(open(os.path.join(PAINTED, "front.json")))
    mask = Image.open(os.path.join(PAINTED, "front-mask.png")).convert("L")
    assert mask.size == plate.size, mask.size
    x0, _, _, z1 = world["extent"]
    ppc = world["px_per_cm"]
    os.makedirs(os.path.join(OUT, "front"), exist_ok=True)
    old = os.path.join(OUT, "desk.webp")  # the desk alone, before the front layer
    if os.path.exists(old):
        os.remove(old)
    for pid, piece in front.items():
        points = [((x - x0) * ppc, (z1 - z) * ppc) for x, z in piece["outline"]]
        left, top = math.floor(min(p[0] for p in points)), math.floor(min(p[1] for p in points))
        right, bottom = math.ceil(max(p[0] for p in points)), math.ceil(max(p[1] for p in points))
        cut = plate.crop((left, top, right, bottom)).convert("RGBA")
        cut.putalpha(mask.crop((left, top, right, bottom)))
        save(cut, os.path.join("front", f"{pid}.webp"), 92)

if __name__ == "__main__":
    main()
