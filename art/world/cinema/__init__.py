"""What the building painters borrow from the cinema renderer.

The world painter (art/world/world.py) was first written against omc_cinema, the film renderer in the
one-more-clue-videos repo. These modules are copies of the parts it uses, made on 2026-11-20 (task W0.7 in
docs/world-overhaul.md), so buildings can be painted and changed from this repo alone. Each one keeps the
functions the painter reaches, exactly as they were, and says at the top where it came from and what was left
out. Nothing here is shared with the videos repo any more: a change on either side stays on that side.

Importing this package puts this repo's art/ folder on the import path, so the copies can use the game's
palette (omc_art.palette), as omc_cinema did with ../one-more-clue/art.
"""
import sys
from pathlib import Path

ART = Path(__file__).resolve().parent.parent.parent  # this repo's art/ folder
sys.path.insert(0, str(ART))
