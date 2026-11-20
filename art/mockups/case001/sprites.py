"""Case 001 sprite sheet at close-up size: the four suspects in the moods the boards use, and the four detectives.

    python sprites.py    # -> sprites.webp, 12 tiles of 400 x 560
"""
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "dollhouse"))
from detectives import detective  # noqa: E402

CAST = r"C:\Users\sulta\one-more-clue\src\assets\art\cast"
TILE = (400, 560)
NAMES = ["priya-shocked", "priya-idle", "squires-nervous", "squires-idle", "ozzy-idle", "ozzy-smug", "rena-smug", "rena-idle"]

tiles = [Image.open(os.path.join(CAST, f"c001-{n}.webp")).convert("RGBA") for n in NAMES]
tiles += [detective("square", "#F2B33D", "scarf"), detective("circle", "#EF5B5B", "camera"),
          detective("triangle", "#9B87F5", "notebook"), detective("rect", "#3FB8AF", "headset")]
sheet = Image.new("RGBA", (TILE[0] * len(tiles), TILE[1]), (0, 0, 0, 0))
for i, t in enumerate(tiles):
    sheet.paste(t.resize(TILE, Image.LANCZOS), (i * TILE[0], 0))
out = os.path.join(HERE, "sprites.webp")
sheet.save(out, "WEBP", quality=92, method=6)
prev = Image.new("RGBA", sheet.size, (24, 20, 40, 255))
prev.alpha_composite(sheet)
prev.convert("RGB").resize((sheet.width // 4, sheet.height // 4)).save(os.path.join(HERE, "sprites-preview.png"))
print(out, sheet.size, os.path.getsize(out))
