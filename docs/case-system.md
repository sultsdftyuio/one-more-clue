# Writing a case

A case is one data file in `src/data/cases/`, typed by `CaseFile` in `src/lib/game/types.ts` and listed in `src/data/cases/index.ts`. The engine runs it; you don't write code. `npm test` checks every case for authoring mistakes (missing hotspots, impossible chapters, a culprit who isn't a suspect, and so on). Case 001 (`case-001.ts`) and the practice case (`practice-tip-jar.ts`) are worked examples: its header comment explains the truth and the intended route.

## The shape of a case

**Chapters.** 2–4 of them. Each one except the last ends with a **checkpoint**: a question the group answers by presenting one piece from the board, by majority vote. `proves` lists every piece that really proves it. Real proof opens the next chapter and its evidence; anything else costs time and they try again. It's the same move as the confrontation, so the team has practised it before the climax. The last chapter ends with naming who did it and why, then the confrontation.

Good checkpoints walk the group up the case: *when* did it happen → *whose story breaks* → (final) *who really did it and why*. Word the question so it doesn't state the answer, and try to make it need a find rather than something already on a desk. List every piece that is honestly true proof, even an easy one: refusing real proof feels unfair.

**Roles and abilities.** Every role has one ability, and abilities are what make people talk. Each ability turns that player's phone into a tool, with one main action, a few side actions and a three-step tutorial (`src/components/game/desk/roles/`):

| Ability | The tool | Main action, then side actions | How evidence uses it |
| --- | --- | --- | --- |
| `search` | the computer | **Search** records; tap words in any evidence to search them; crack **locked** files | `access: { kind: "search", terms }`, plus `lock` |
| `interview` | the interrogation room | **Ask** a question; **show** a suspect something from the board to crack them; play back | `access: { kind: "interview", suspect, question }` and `{ kind: "press", ... }` |
| `inspect` | the camera | **Shoot** a framed detail; torch for dark scenes; scrub footage | `access: { kind: "inspect", scene, hotspot }` |
| `crosscheck` | the evidence wall | **Tie** a string between two things that can't both be true; arrange the wall | `access: { kind: "crosscheck", pair: [a, b], quotes }` |

Every piece of evidence can also be pinned, read out, and shown on everyone's phone for a few seconds (**Show everyone**: one player can do it once every 12 seconds).

Core roles are always dealt (with fewer players some people hold two). Extra roles (`core: false`, usually `ability: "none"`) only join with 5–6 players, and cases are capped at 4 for now because those roles have almost nothing to do, so their evidence must be **bonus**, never the only route to the answer.

**Evidence.** Each piece is shown as the object it really is, so pick the `body` type that fits: `statement` (signed witness form), `chat` (a phone), `log` (a printout), `document` (a typed sheet), `finding` (a notebook page, or a discrepancy slip for a cross-check), `scene` (a print), `footage` (a CCTV monitor), `recording` (a cassette). Each piece has a `role` (whose desk it belongs to), a `chapter` (when it starts to exist) and an `access` (how it reaches players). `desk` evidence is handed out when its chapter opens; everything else has to be found. Only the role's holder (and whoever found it) can see a piece until someone pins it to the board, which holds 8 things.

## The house standard: show, don't lecture

Players should be tapping through moments, not reading paragraphs. `npm test` enforces this.

- **The story comes in beats.** `story` (the opening), each chapter's `story` (from chapter 2) and `solution.confession` are short pop-up beats: a `title` card, a `narration` caption, a phone `message`, or a character's `line` (with their portrait when `who` is a suspect id). At least 3 beats to open, 2 per later chapter, 2 for the confession, and the culprit must speak in it.
- **One or two sentences per beat** (170 characters at most). The `briefing` paragraph (420 max) is kept only as a reference on the case file.
- **No walls of text in evidence.** Statements 280 characters, documents 340, findings 210, chat messages 170, log rows 95, hints 160. If something is longer, split it into two pieces or two rows.
- **Let the picture say it.** A photo find is shown as its close-up, cut from the painting, with its text as the one-line caption under the print. So the caption says what's in the shot ("Lab clock: 8:58."), never what it means ("taken seven minutes before it was posted"): working that out is the team's moment. Keep the words another role needs (a badge number, a name to search).
- **Let both sides of a contradiction speak.** Give every cross-check `quotes`: for each side, words taken exactly from that piece (a chat message, a log row, a sentence someone said), or `null` for a side that is a picture, which then shows its close-up. The slip puts the two side by side, so its own `text` is only the short version for small cards: "Chat, 8:40: Priya took HALO home. Dock: HALO lifted off at 9:13." `npm test` checks that every quote really is in its piece, and that every case quotes all of its contradictions.
- **Let each answer play back as the night.** Give every checkpoint a `replay`: three to five `moments` (a time, the piece, and words quoted exactly from it, or no quote for a picture) and one short `say` line. When the team proves the checkpoint, every phone plays the moments onto a timeline in order, credits whoever turned each piece up, stamps the piece they presented (or both sides of a contradiction they presented), and closes on `say`. The `reveal` paragraph is then kept for screen readers only. Everyone sees every moment, found or not, so only use pieces the `reveal` already tells or that are in `proves`. `npm test` checks the moments exist by then, run forward in time and quote their pieces, and that every chapter proof has a replay.
- **Give every suspect a `role`** ("Lab director") and a voice. They speak in the story and in their answers, so write how they'd talk.
- **End with a payoff.** The confession plays at the reveal, before the scores: the culprit's reason in their own words, plus a last line from someone else for a laugh or a sting.
- **Sound and music are automatic.** Every find, stamp, vote and chapter has its sound, and the music grows tenser chapter by chapter. Nothing to write.

## Make every case its own world

Each case should look, sound and play differently from the others.

- **Theme** (`theme`): `noir` (rain, typewriter titles, noir jazz), `radio` (neon, radio waves, synth funk), `bistro` (candlelight, steam, a café waltz) or `frost` (falling snow, a music-box waltz). It sets the title font, accent colour, background weather and the whole music set, including the tension under votes. New themes go in `src/components/game/themes.ts`, `game.css` and the music sets in `audio/sound.ts`.
- **Opening film** (`cinematic`): about 20 seconds, rendered by `one-more-clue-videos/omc_cinema` and played when the host starts. Give each case's film its own structure, vary the shots inside it, and hide one real clue. Never show a checkpoint's answer or the culprit: the film ends where the case's first question begins. Check `stills` and `draft` before the full render.
- **Story clock** (`deadline`): a real deadline from the story, the night's start and end, and an ending for running out of time. See [Time is the only cost](#time-is-the-only-cost).
- **Voices**: cast by ear, character by character. See `one-more-clue-videos/omc_cinema/voice_lab.py`. Until recorded voices land, each suspect's answers play a synthesised voice blip.
- **Cast colours** (`tint` on a suspect): recolours a house character (a hue rotation in degrees) so each case's cast looks like new people.
- **Effect beats** (`{ kind: "effect", effect }`): `blackout`, `static`, `flash` or `candles`, a full-screen moment with a sound. Use one or two per case, at the turning points.
- **Footage** (`type: "footage"`): camera frames players play or scrub through. Hotspots can sit in any frame, so the clue can be *when* something changes (an empty chair, a plate gone).
- **Recordings** (`type: "recording"`): a tape with timed captions and synthesised sounds (`speech`, `music`, `jingle`, `static`, `click`, `creak`, `breath`, `beep`, `door`, `silence`). Great for "listen for what's missing".
- **Dark scenes** (`dark: true` on a scene): pitch black until the Photographer turns on the camera's torch and sweeps it across.
- **Clue chains** (`after` on a piece of evidence): a clue stays hidden until the evidence it names is found, and whoever holds it is told who to ask, not what to look for. `afterAny` opens it when any one of several finds turns up, for two different routes to the same place. Build chains that cross roles, so the Photographer's find sends the Tech to a record, which gives the Interviewer a question, which gives the Archivist a contradiction. Questions opened by a lead are free, so a team can't spend itself out of a chain. Let the Tech start chains as well as follow them, or they spend chapters waiting: give the Photographer, Interviewer and Tech an opening move in most chapters. The Archivist reacts to what the others find. `checkCase` proves everything is reachable.
- **The confrontation** (`interrogation` on the case): every case ends here. The team names who did it and why, by majority, with one shot. Name the wrong person and the case is over. Name the right one and they tell their story claim by claim: only the Interviewer hears it, and anyone can call a lie by presenting something from the board. The team then gets 5 seconds to object before the call lands, so one fast player can't spend a strike alone. Three wrong calls and they walk out. Catch every lie and they confess. Mix in true claims, because a true claim is a trap: Ruth really didn't mean to hurt the critic. Every lie needs at least one piece of evidence the team can reach, and `cases.test.ts` proves it by playing the whole thing.
- **A signature mechanic.** Each case should also have one thing to *do* that no other case has, as a mini-game inside a chapter.
- **Vary the culprit.** Don't let the nervous one always be innocent, or one shape always be guilty.
- **Don't name the culprit at the second checkpoint.** Ask *how* or *when* instead of *who*, or point the group at the wrong person first.

## Rules of thumb

- **Chain the abilities across roles.** The best moments are hand-offs: the Interviewer hears about a camera → tells the Tech what to search → the Tech pins the still → only the Photographer can inspect it. Search terms should come from *other* people's evidence.
- **Every core role needs something to do in every chapter**: a desk item, a search worth making, a question worth spending, a photo worth inspecting or a pair worth comparing.
- **Search terms**: lowercase letters and digits only (`"pageco"`, not `"Page & Co."`). Players' typing is normalised the same way, and a term of 3+ characters also matches inside longer queries ("bookshop camera" finds `"bookshop"`). Give several synonyms.
- **Questions**: write more questions than a team should ask. Every open question costs time (questions opened by a lead are free), so the team has to choose. Some should be duds.
- **Scenes**: 4:3 frames built from the house art (`suspect:<id>`, `prop:<name>`), coloured boxes and labels, positioned in percentages. Looks: `cafe`, `street`, `lab`, `office`, `cctv` (greyscale with scanlines). Put a `hotspot` on things worth a closer look, and keep hotspot items clear of decorations. Make sure a detail is *visible* in the picture (the clock reading 8:31) so sharp players can spot it before tapping.
- **Painted photos** (`image` on a scene): a 4:3 picture from `public/evidence`, seen through the Photographer's camera, with invisible `kind: "area"` items as the clue areas. Draw every clue into the painting among harmless clutter, and check it against the case's timeline. Export a double-size copy to `public/evidence/hd/` with the same name: the camera loads it past 2× zoom, so close-ups stay sharp. `one-more-clue-videos/omc_cinema/case001_photos.py` is the worked example.
- **Cross-checks**: name the exact pair that contradicts. Make sure both halves can end up visible to the Archivist (usually one is theirs, the other is pinned by someone else). On the wall, a found pair stays tied with red string for the whole team.
- **A red herring with a reason.** Someone should look guilty and lie, for a reason that has nothing to do with the crime. The practice case's Lord Squarington lies about when he left because he was secretly paying an old tab.
- **Key evidence** (`solution.keyEvidence`): list every piece that genuinely proves the culprit.
- **Keep the clock honest**: nothing a team reads may be timed after the moment the story clock can show, and nobody may mention a morning that hasn't happened yet.
- **Hints**: 2–3 per chapter, from gentle to blunt. The first hint of the whole case is free; after that they cost the "sharp" star.

## Time is the only cost

Every case has a story clock (`deadline`), and every wasted move spends some of the night. Costs are shares of the night, so a two-hour case and a nine-hour case feel the same; each case shows them in its own minutes (`src/lib/game/clock.ts`).

| Move | Costs |
| --- | --- |
| A wrong checkpoint answer | a quarter of the night |
| An open question (one no lead has pointed to) | 5% |
| A miss: a shot of nothing, a string between two things that agree, showing a suspect something that doesn't shake them, a wrong password | 2% |
| Searching, following a lead, pinning, Show everyone, arranging the wall | free |

When the night runs out, the case ends with `lost`. Make the night at least an hour long. `cases.test.ts` holds every case to the same tuning: three wrong answers, ten misses and every open question run the night out; two wrong answers and a few misses don't; and the five-star script finishes with more than half the night left.

## What each tool needs from a case

**The camera.** A shot needs at least 1.5× zoom (5× at most). It catches the clue that fills the most of the frame, as long as the clue's centre is in the frame, it fills at least 8% of the frame, and at least 60% of it is in shot (or it fills half the frame). Nothing hints before the shot. Keep clue areas apart, so a frame aimed at one never catches another. `cases.test.ts` aims a frame at every clue in every case and checks that it catches that clue, at 5× or less.

**Cracks** (`access: { kind: "press", suspect, against, breaks }`). Once a suspect has said something (`against`, one of their own statements), the Interviewer can show them a pinned piece from `breaks`. They crack, and the crack is a new statement in their voice: a smaller truth they were hiding. Write 1 or 2 per chapter, each checked against the timeline. A crack is never the culprit's confession: save that for the confrontation. Cracks can open leads (`after`), and can be checkpoint proof when listed in `proves`. `cases.test.ts` cracks every one.

**Locked files** (`lock: { hint, answers }` on a record the Tech searches for). One per case, on the main route, so every team meets one. The file turns up with only its title and the hint; it opens nothing and proves nothing until the Tech types the password. The password must be in another core role's evidence by the file's chapter (`checkCase` checks this), so the Tech has to read the hint out. Capitals, spaces and dashes don't matter: `S-42`, `s42` and `S 42` are the same. Add other natural answers to `answers` ("Table 9" and "Table nine").

**Search notes** (`searchNotes` on the case). A search that finds nothing can still point at a teammate: "Visitors are signed in on paper at the security desk." Matched like search terms; a real record always wins.

**The wall.** Nothing extra to write: the pins are the wall, and every cross-check pair is a string waiting to be tied.

## The map of the night

Give a case a `nightMap` and the Archivist can switch the wall to a map: the place as a plan, with everyone in it minute by minute, as the team's pinned pieces put them.

- **The plan.** `rooms` sit on a plan 100 wide and `height` tall, each with a short `note`. `outdoor` is open air on the plan (a car park); `away` is somewhere off it (gone home, across town). `things` move like people do (a stolen prototype).
- **Sightings.** Each says where one piece puts someone (`who` is a suspect id or a thing) from `at` until `until`. Without an `until` it's a moment, shown five minutes either side. Mark a story with `says: true`; records, cameras and witnesses count as seen. One piece can place several people, several times (the badge log does).
- **Clashes.** The map only shows what the Archivist's visible pieces say, so it fills in as the team pins things. When two pieces put one person in two rooms at once and those two are a cross-check in the case, a red line joins them, and tying it is that cross-check, exactly as on the wall. So every lie about where someone was should be a cross-check. Any other overlap just shows the surer place: seen beats a crack, a crack beats a story.
- **Absence is a place too.** A record that someone wasn't where they claim (an empty armchair, a boiler room nobody entered, a door nobody came through) puts them in an `away` room such as "Unaccounted for" or "Never came in", so the story and the record clash. A thing can be invented: Case 002's masked man only exists in Vince's story.
- **Moments.** A sighting without an `until` shows five minutes either side; a fast night sets `moment` lower (Case 004's countdown uses one).
- `npm test` checks every sighting's piece, room, person and time, and pins down each case's clashes, so a change to a case can't quietly add or lose one.

## Voices

Suspects and the narrator are heard, not only read. Every line a case speaks gets a recording: interview answers and cracks, the confrontation (opening, claims, caught lies, walkout), the chapter openings' `line` and `narration` beats, the confession (with "It was me."), each replay's `say`, and five stock shrugs per suspect. The briefing beats are only voiced for a case without an opening film. `scripts/voice-lines.ts <case>` lists them.

- **Recording.** `art/voices.py` records them: suspects in Chatterbox voices copied from a reference clip (made on Kaggle's GPU), the narrator in Kokoro, as in the films. Cast each suspect by ear first (`audition`, `wait`, `sheet`), put the picks in `CAST`, then `act`, `wait`, `reel` to listen, `keep`. `draft` makes a plain Kokoro stand-in on this PC to build and test with.
- **Feeling.** Flat reads were the first complaint, so lines are acted. Each character first reads a short speech in character (`WARMUPS`), and that read becomes the reference their lines copy, since Chatterbox copies delivery as well as voice. Every line has a mood (`MOOD_BY_PLACE`, with `LINE_MOODS` for the lines that need their own: smug claims, a rattled crack, a broken confession), which sets how hard it's played. Each line is recorded a few times, and the take kept is the one that moves most while Whisper still hears the right words. Clock times are read as words ("nine seventeen"), because voices stumble on "9:17".
- **Files.** Each take is `public/voices/<case>/<key>.mp3`, listed with its length in `src/lib/voice-lines.ts`. The key comes from who speaks and their exact words, so **changing a line's words means recording it again**. Until then that line falls back to the blips, and `npm test` fails on a recording whose line no longer exists.
- **Which phone speaks.** The suspect in the interrogation room, and the claims in the confrontation, are heard on the Interviewer's phone, so a table hears them at once. Story beats, the replay's closing line and a caught lie play on the phone that carries the sound: the host's in Same room, every phone when Apart. A crack plays on the other phones only when Apart. The words always type at the recording's pace, and the music dips while someone speaks.

## Scoring

Out of 5 stars: naming the culprit is worth 2, the motive 1, breaking their story 1 (catching every lie before they walk out), and 1 for being sharp (no wrong checkpoint answers, at most one hint, no walkout). Naming the wrong culprit scores 0.

Never rely on where an answer sits in the list: motives are shuffled per room. Don't let a tagline or film answer a checkpoint.

## Test it

1. `npm test`: the case check must pass.
2. Play it alone at `/host` with test bots (they pin their evidence and use their tools once a chapter: they shoot, ask, show, tie and unlock, but never answer for you).
3. Then play it with real people. That's the only test that tells you if it's fun. [`playtest.md`](playtest.md) is the checklist.
