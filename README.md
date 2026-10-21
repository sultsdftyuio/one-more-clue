# One More Clue

Landing page for One More Clue, a cooperative browser mystery game. Next.js 15 (App Router), TypeScript and Tailwind CSS 4. Every illustration is generated in Python.

## Commands

```bash
npm run dev        # http://localhost:3000
npm run build      # production build (stop the dev server first: they share .next)
npm run art:sync   # copy regenerated art into the app
```

## Structure

```
src/
  app/                 routes only: page.tsx composes sections, play/ is the Case 001 placeholder
  components/
    hero/              Hero, CityScene (parallax layers), SuspectLineup, IncomingMessage
    mini-case/         "Who's lying?" warm-up: MiniCase, SuspectCard, EvidenceCard, VerdictPanel, useMiniCase
    sections/          HowItWorks, CaseTeaser, FinalCta
    layout/            SiteHeader, SiteFooter
    play/              CaseRoomSoon
    ui/                Button, ShareButton, SectionHeading, Scallop
  data/                all copy and puzzle content (suspects, mini-case, case-001, ...)
  lib/                 art.ts (image imports), cx.ts
  assets/art/          generated WebP images (do not edit by hand)
art/                   Python generator, see below
scripts/sync-art.mjs   art/out -> src/assets/art and app icons
```

Text lives in `src/data/`, so copy changes don't touch components. The warm-up puzzle is fair by design: the outage report rules out exactly one alibi. Keep it that way when you edit `mini-case.ts`.

## Art

`art/generate.py` draws every image with Skia (`art/omc_art/`: palette, shapes, faces, one module per suspect and prop, scenery, export). It writes high-res PNG masters, WebP web copies, icons and preview sheets to `art/out/`.

```bash
/c/Users/sulta/.venvs/one-more-clue/Scripts/python.exe art/generate.py
npm run art:sync
```

The Python environment is in `C:\Users\sulta\.venvs\one-more-clue` (skia-python, pillow, numpy; see `art/requirements.txt`).
