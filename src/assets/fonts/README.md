# Fonts

Self-hosted copies of the Google Fonts the site uses, latin subset only. They live
here so a build never has to download them: `next/font/google` failed builds on
Vercel whenever Google returned a font link it couldn't parse.

| File | Font | License |
|---|---|---|
| `lilita-one-400.woff2` | Lilita One 400 | SIL Open Font License 1.1 |
| `nunito-variable.woff2` | Nunito, weights 200–1000 | SIL Open Font License 1.1 |
| `special-elite-400.woff2` | Special Elite 400 | Apache License 2.0 |
| `patrick-hand-400.woff2` | Patrick Hand 400 | SIL Open Font License 1.1 |
| `vt323-400.woff2` | VT323 400 | SIL Open Font License 1.1 |
| `monoton-400.woff2` | Monoton 400 | SIL Open Font License 1.1 |
| `playfair-display-italic-700-900.woff2` | Playfair Display Italic, weights 700–900 | SIL Open Font License 1.1 |
| `mountains-of-christmas-700.woff2` | Mountains of Christmas 700 | Apache License 2.0 |

Downloaded from fonts.gstatic.com on 2026-11-07. License texts: https://github.com/google/fonts
(`ofl/<name>/OFL.txt`, `apache/<name>/LICENSE.txt`). To add a font, take the latin `.woff2`
from the Google Fonts CSS (`https://fonts.googleapis.com/css2?family=...`) and load it with
`next/font/local`.
