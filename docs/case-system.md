# Writing a case

A case is one data file in `src/data/cases/`, typed by `CaseFile` in `src/lib/game/types.ts` and listed in `src/data/cases/index.ts`. The engine runs it; you don't write code. `npm test` checks every case for authoring mistakes (missing hotspots, impossible chapters, a culprit who isn't a suspect, and so on). Case 001 (`case-001.ts`) and the practice case (`practice-tip-jar.ts`) are worked examples: its header comment explains the truth and the intended route.

## The shape of a case

**Chapters.** 2–4 of them. Each one except the last ends with a **checkpoint**: a question the group answers by presenting one piece from the board, by majority vote. `proves` lists every piece that really proves it. Real proof opens the next chapter and its evidence; anything else costs time and they try again. It's the same move as the confrontation, so the team has practised it before the climax. The last chapter ends with naming who did it and why, then the confrontation.

Good checkpoints walk the group up the case: *when* did it happen → *whose story breaks* → (final) *who really did it and why*. Word the question so it doesn't state the answer, and try to make it need a find rather than something already on a desk. List every piece that is honestly true proof, even an easy one: refusing real proof feels unfair.

**Roles and abilities.** Every role has one ability, and abilities are what make people talk:

| Ability | What the player does | How evidence uses it |
| --- | --- | --- |
| `search` | types names, numbers, places | `access: { kind: "search", terms: [...] }` |
| `interview` | spends the team's limited questions | `access: { kind: "interview", suspect, question }` |
| `inspect` | taps into photos and camera stills | `access: { kind: "inspect", scene, hotspot }` |
| `crosscheck` | holds two pieces up against each other (only 3 empty compares per chapter) | `access: { kind: "crosscheck", pair: [a, b] }` |

Core roles are always dealt (with fewer players some people hold two). Extra roles (`core: false`, usually `ability: "none"`) only join with 5–6 players, and cases are capped at 4 for now because those roles have almost nothing to do, so their evidence must be **bonus**, never the only route to the answer.

**Evidence.** Each piece is shown as the object it really is, so pick the `body` type that fits: `statement` (signed witness form), `chat` (a phone), `log` (a printout), `document` (a typed sheet), `finding` (a notebook page, or a discrepancy slip for a cross-check), `scene` (a print), `footage` (a CCTV monitor), `recording` (a cassette). Each piece has a `role` (whose desk it belongs to), a `chapter` (when it starts to exist) and an `access` (how it reaches players). `desk` evidence is handed out when its chapter opens; everything else has to be found. Only the role's holder (and whoever found it) can see a piece until someone pins it to the board, which holds 8 things.

## The house standard: show, don't lecture

Players should be tapping through moments, not reading paragraphs. `npm test` enforces this.

- **The story comes in beats.** `story` (the opening), each chapter's `story` (from chapter 2) and `solution.confession` are short pop-up beats: a `title` card, a `narration` caption, a phone `message`, or a character's `line` (with their portrait when `who` is a suspect id). At least 3 beats to open, 2 per later chapter, 2 for the confession, and the culprit must speak in it.
- **One or two sentences per beat** (170 characters at most). The `briefing` paragraph (420 max) is kept only as a reference on the case file.
- **No walls of text in evidence.** Statements 280 characters, documents 340, findings 210, chat messages 170, log rows 95, hints 160. If something is longer, split it into two pieces or two rows.
- **Give every suspect a `role`** ("Lab director") and a voice. They speak in the story and in their answers, so write how they'd talk.
- **End with a payoff.** The confession plays at the reveal, before the scores: the culprit's reason in their own words, plus a last line from someone else for a laugh or a sting.
- **Sound and music are automatic.** Every find, stamp, vote and chapter has its sound, and the music grows tenser chapter by chapter. Nothing to write.

## Make every case its own world

Each case should look, sound and play differently from the others.

- **Theme** (`theme`): `noir` (rain, typewriter titles, noir jazz), `radio` (neon, radio waves, synth funk), `bistro` (candlelight, steam, a café waltz) or `frost` (falling snow, a music-box waltz). It sets the title font, accent colour, background weather and the whole music set, including the tension under votes. New themes go in `src/components/game/themes.ts`, `game.css` and the music sets in `audio/sound.ts`.
- **Opening film** (`cinematic`): about 20 seconds, rendered by `art/omc_cinema` and played when the host starts. Give each case's film its own structure, vary the shots inside it, and hide one real clue. Never show a checkpoint's answer or the culprit: the film ends where the case's first question begins. Check `stills` and `draft` before the full render.
- **Story clock** (`deadline`): what's coming, and the time at the start and after each wrong answer. Three wrong answers and the case is lost, so it needs a real deadline from the story and an ending for running out of time. Voices are cast by ear, character by character: see `art/omc_cinema/voice_lab.py`.
- **Cast colours** (`tint` on a suspect): recolours a house character (a hue rotation in degrees) so each case's cast looks like new people.
- **Effect beats** (`{ kind: "effect", effect }`): `blackout`, `static`, `flash` or `candles`, a full-screen moment with a sound. Use one or two per case, at the turning points.
- **Footage** (`type: "footage"`): camera frames players play or scrub through. Hotspots can sit in any frame, so the clue can be *when* something changes (an empty chair, a plate gone).
- **Recordings** (`type: "recording"`): a tape with timed captions and synthesised sounds (`speech`, `music`, `jingle`, `static`, `click`, `creak`, `breath`, `beep`, `door`, `silence`). Great for "listen for what's missing".
- **Dark scenes** (`dark: true` on a scene): pitch black until the Photographer sweeps a flashlight across it.
- **Clue chains** (`after` on a piece of evidence): a clue stays hidden until the evidence it names is found, and whoever holds it is told who to ask, not what to look for. Build chains that cross roles, so the Photographer's find sends the Tech to a record, which gives the Interviewer a question, which gives the Archivist a contradiction. Questions opened by a lead are free, so a team can't spend itself out of a chain. Let the Tech start chains as well as follow them, or they spend chapters waiting: give the Photographer, Interviewer and Tech an opening move in most chapters. The Archivist reacts to what the others find. `checkCase` proves everything is reachable.
- **The confrontation** (`interrogation` on the case): every case ends here. The team names who did it and why, by majority, with one shot. Name the wrong person and the case is over. Name the right one and they tell their story claim by claim: only the Interviewer hears it, and anyone can call a lie by presenting something from the board. The team then gets 5 seconds to object before the call lands, so one fast player can't spend a strike alone. Three wrong calls and they walk out. Catch every lie and they confess. Mix in true claims, because a true claim is a trap: Ruth really didn't mean to hurt the critic. Every lie needs at least one piece of evidence the team can reach, and `cases.test.ts` proves it by playing the whole thing.
- **A signature mechanic.** Each case should also have one thing to *do* that no other case has, as a mini-game inside a chapter.
- **Vary the culprit.** Don't let the nervous one always be innocent, or one shape always be guilty.
- **Don't name the culprit at the second checkpoint.** Ask *how* or *when* instead of *who*, or point the group at the wrong person first.

## Rules of thumb

- **Chain the abilities across roles.** The best moments are hand-offs: the Interviewer hears about a camera → tells the Tech what to search → the Tech pins the still → only the Photographer can inspect it. Search terms should come from *other* people's evidence.
- **Every core role needs something to do in every chapter**: a desk item, a search worth making, a question worth spending, a photo worth inspecting or a pair worth comparing.
- **Search terms**: lowercase letters and digits only (`"pageco"`, not `"Page & Co."`). Players' typing is normalised the same way, and a term of 3+ characters also matches inside longer queries ("bookshop camera" finds `"bookshop"`). Give several synonyms.
- **Questions**: write more questions than the `questionBudget` allows (the check enforces it), so the team has to choose. Some should be duds.
- **Scenes**: 4:3 frames built from the house art (`suspect:<id>`, `prop:<name>`), coloured boxes and labels, positioned in percentages. Looks: `cafe`, `street`, `lab`, `office`, `cctv` (greyscale with scanlines). Put a `hotspot` on things worth a closer look, and keep hotspot items clear of decorations. Make sure a detail is *visible* in the picture (the clock reading 8:31) so sharp players can spot it before tapping.
- **Cross-checks**: name the exact pair that contradicts. Make sure both halves can end up visible to the Archivist (usually one is theirs, the other is pinned by someone else).
- **A red herring with a reason.** Someone should look guilty and lie, for a reason that has nothing to do with the crime. The practice case's Lord Squarington lies about when he left because he was secretly paying an old tab.
- **Key evidence** (`solution.keyEvidence`): list every piece that genuinely proves the culprit.
- **Keep the clock honest**: nothing a team reads may be timed after the moment the story clock can show, and nobody may mention a morning that hasn't happened yet.
- **Hints**: 2–3 per chapter, from gentle to blunt. The first hint of the whole case is free; after that they cost the "sharp" star.

## Scoring

Out of 5 stars: naming the culprit is worth 2, the motive 1, breaking their story 1 (catching every lie before they walk out), and 1 for being sharp (no wrong checkpoint answers, at most one hint, no walkout). Naming the wrong culprit scores 0.

Never rely on where an answer sits in the list: motives are shuffled per room. Don't let a tagline or film answer a checkpoint.

## Test it

1. `npm test`: the case check must pass.
2. Play it alone at `/host` with test bots (they pin their evidence and use their abilities once a chapter, but never answer for you).
3. Then play it with real people. That's the only test that tells you if it's fun. [`playtest.md`](playtest.md) is the checklist.
