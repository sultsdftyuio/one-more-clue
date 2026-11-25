# The world painter

Paints a case's building as one flat 2D cutaway for the walkable world planned in
[docs/world-overhaul.md](../../docs/world-overhaul.md). So far that's Case 001: the Halden Innovation Building
at 12:40 AM.

## Run it

From the repo root:

```
python art/world/world.py          # the plate: 3240 x 1700 at 2 px per cm, about 15 seconds
python art/world/world.py draft    # a quick look at 0.8 px per cm
```

It writes next to `world.py`:

- `world.webp`: the plate (committed)
- `world.json`: the rooms, where everyone stands and the other spots, in world cm (committed)
- `world.png` or `world-draft.png`: a lossless copy for checking (not committed)

Then the front layer, the furniture people can stand behind (W2.1):

```
python art/world/front.py          # front.json and front-mask.png, about 10 seconds
python scripts/world-assets.py     # cuts each piece out of the plate into src/assets/world/case-001/front/
```

`front.py` draws each piece again on its own, with `world.py`'s own code at the same spot, so its mask is the
piece's exact shape, gaps between legs included. Add a piece to `PIECES` there, then copy its outline from
`front.json` into `src/lib/world/plates.ts` (a test checks the two match). Both files are committed.

## What it needs

Python 3 with skia-python, numpy, Pillow and scipy. scipy does the blurs in the film finish and the noise in the
textures. All four are in `art/requirements.txt`:

```
python -m pip install -r art/requirements.txt
```

It doesn't need the videos repo or ffmpeg.

## Where the code came from

`world.py` started as the mockup script `art/mockups/case001/world.py`, which borrowed code from `omc_cinema`, the
film renderer in the one-more-clue-videos repo. On 2026-11-20 (task W0.7) the parts it uses were copied here,
unchanged apart from each file's opening note, which says where it came from and what was left out.

| File | Came from | What it paints |
|---|---|---|
| `world.py` | `art/mockups/case001/world.py` | Case 001's building and its lights; writes `world.json` |
| `halden.py` | `art/mockups/dollhouse/halden.py` | The pass switch, glows, two floor textures, the street lamp and the tree |
| `cinema/film.py` | `omc_cinema/film.py` | Paints, gradients, shapes, glows and text |
| `cinema/look.py` | `omc_cinema/look.py` | The film finish: bloom, grade, vignette and grain |
| `cinema/textures.py` | `omc_cinema/textures.py` | Wood, linen, paper and steel |
| `cinema/dollhouse_film.py` | `omc_cinema/dollhouse_film.py` | Tiled floors and the storybook outline |
| `cinema/case001_photos.py` | `omc_cinema/case001_photos.py` | Lab 4's back wall and the lobby, the same as in the evidence photos |
| `cinema/case001.py` | `omc_cinema/case001.py` | The rainy skyline and the wall clock |
| `cinema/kit.py` | `omc_cinema/kit.py` | A rectangle and a soft shadow |

The palette comes from `art/omc_art` and the fonts from `art/fonts`, both in this repo.

These are copies, so a change on one side doesn't reach the other. The mockup in `art/mockups/case001/` is left as
it was and still needs the videos repo: make changes here.

## Checking a change

The plate is byte-identical to `art/mockups/case001/world.webp`, the one the mockups were made from. A change that
shouldn't alter the picture should keep it that way. This prints nothing when the two files match:

```
git diff --no-index --stat art/world/world.webp art/mockups/case001/world.webp
```

Check any change to the picture against the case's timeline in `src/data/cases/case-001.ts`. Nothing in the
building may hint at something the case file doesn't say (ground rule 4 in the plan).
