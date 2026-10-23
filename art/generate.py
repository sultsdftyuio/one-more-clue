"""One More Clue - illustration generator.

Every image on the landing page is drawn with Skia by the omc_art package.
Change a colour in omc_art/palette.py or a shape in its module, then re-run:

    python generate.py

Outputs (transparent unless noted):
    out/png/      full-resolution masters
    out/webp/     web-sized copies for the site
    out/icons/    favicon and app icons
    out/social/   link-preview card for Open Graph / Twitter
    out/preview/  contact sheets and a hero composite for review
"""
from omc_art.catalog import ASSETS
from omc_art.export import OUT, export_webp, make_icons, prepare_dirs, render
from omc_art.palette import CREAM, DUSK, INK
from omc_art.preview import contact_sheet, hero_preview
from omc_art.social import make_social_card


def main():
    prepare_dirs()
    for asset in ASSETS:
        web = export_webp(render(asset), asset.web_width)
        w, h = asset.size
        print(f"  {asset.name:28s} master {round(w * asset.scale)}x{round(h * asset.scale)}"
              f"  web {web.width}x{web.height}")
    make_icons()
    make_social_card()
    hero_preview()
    sheet = [a.name for a in ASSETS if not a.name.startswith(("sky", "city"))]
    contact_sheet(sheet, DUSK, CREAM, "contact-sheet-dark.png")
    contact_sheet(sheet, CREAM, INK, "contact-sheet-light.png")
    print(f"done -> {OUT}")


if __name__ == "__main__":
    main()
