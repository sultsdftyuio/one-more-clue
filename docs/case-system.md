# Writing a case

A case is one data file in `src/data/cases/`, typed by `CaseFile` in `src/lib/game/types.ts` and listed in `src/data/cases/index.ts`. The engine runs it; you don't write code. `npm test` checks every case for authoring mistakes (missing hotspots, impossible chapters, a culprit who isn't a suspect, and so on). Case 001 (`case-001.ts`) and the practice case (`practice-tip-jar.ts`) are worked examples: its header comment explains the truth and the intended route.

## The shape of a case

**Chapters.** 2–4 of them. Each one except the last ends with a **checkpoint**: a multiple-choice question the group answers by majority vote. Right opens the next chapter and its evidence; wrong counts against the score and they try again. The last chapter ends with the **final report** instead: who did it, why (pick a motive), and two pinned pieces of proof.

Good checkpoints walk the group up the case: *when* did it happen → *whose story breaks* → (final) *who really did it and why*. Each answer should be something the group has to work out together, not something one card says outright.

**Roles and abilities.** Every role has one ability, and abilities are what make people talk:

| Ability | What the player does | How evidence uses it |
| --- | --- | --- |
| `search` | types names, numbers, places | `access: { kind: "search", terms: [...] }` |
| `interview` | spends the team's limited questions | `access: { kind: "interview", suspect, question }` |
| `inspect` | taps into photos and camera stills | `access: { kind: "inspect", scene, hotspot }` |
| `crosscheck` | holds two pieces up against each other | `access: { kind: "crosscheck", pair: [a, b] }` |

Core roles are always dealt (with fewer players some people hold two). Extra roles (`core: false`, usually `ability: "none"`) only join with 5–6 players, so their evidence must be **bonus**, never the only route to the answer.

**Evidence.** Each piece has a `role` (whose desk it belongs to), a `chapter` (when it starts to exist) and an `access` (how it reaches players). `desk` evidence is handed out when its chapter opens; everything else has to be found. Only the role's holder (and whoever found it) can see a piece until someone pins it to the board, which holds 8 things.

## The house standard: show, don't lecture

Players should be tapping through moments, not reading paragraphs. `npm test` enforces this.

- **The story comes in beats.** `story` (the opening), each chapter's `story` (from chapter 2) and `solution.confession` are short pop-up beats: a `title` card, a `narration` caption, a phone `message`, or a character's `line` (with their portrait when `who` is a suspect id). At least 3 beats to open, 2 per later chapter, 2 for the confession, and the culprit must speak in it.
- **One or two sentences per beat** (170 characters at most). The `briefing` paragraph (420 max) is kept only as a reference on the case file.
- **No walls of text in evidence.** Statements 280 characters, documents 340, findings 210, chat messages 170, log rows 95, hints 160. If something is longer, split it into two pieces or two rows.
- **Give every suspect a `role`** ("Lab director") and a voice. They speak in the story and in their answers, so write how they'd talk.
- **End with a payoff.** The confession plays at the reveal, before the scores: the culprit's reason in their own words, plus a last line from someone else for a laugh or a sting.
- **Sound and music are automatic.** Every find, stamp, vote and chapter has its sound, and the music grows tenser chapter by chapter. Nothing to write.

## Rules of thumb

- **Chain the abilities across roles.** The best moments are hand-offs: the Interviewer hears about a camera → tells the Tech what to search → the Tech pins the still → only the Photographer can inspect it. Search terms should come from *other* people's evidence.
- **Every core role needs something to do in every chapter**: a desk item, a search worth making, a question worth spending, a photo worth inspecting or a pair worth comparing.
- **Search terms**: lowercase letters and digits only (`"pageco"`, not `"Page & Co."`). Players' typing is normalised the same way, and a term of 3+ characters also matches inside longer queries ("bookshop camera" finds `"bookshop"`). Give several synonyms.
- **Questions**: write more questions than the `questionBudget` allows (the check enforces it), so the team has to choose. Some should be duds.
- **Scenes**: 4:3 frames built from the house art (`suspect:<id>`, `prop:<name>`), coloured boxes and labels, positioned in percentages. Looks: `cafe`, `street`, `lab`, `office`, `cctv` (greyscale with scanlines). Put a `hotspot` on things worth a closer look, and keep hotspot items clear of decorations. Make sure a detail is *visible* in the picture (the clock reading 8:31) so sharp players can spot it before tapping.
- **Cross-checks**: name the exact pair that contradicts. Make sure both halves can end up visible to the Archivist (usually one is theirs, the other is pinned by someone else).
- **A red herring with a reason.** Someone should look guilty and lie, for a reason that has nothing to do with the crime. The practice case's Lord Squarington lies about when he left because he was secretly paying an old tab.
- **Key evidence** (`solution.keyEvidence`): list every piece that genuinely proves the culprit. A final report earns its proof star when both picks are on that list.
- **Hints**: 2–3 per chapter, from gentle to blunt. The first hint of the whole case is free; after that they cost the "sharp" star.

## Scoring

Out of 5 stars: naming the culprit is worth 2, the motive 1, proof that holds up 1, and 1 for being sharp (at most one hint and one wrong checkpoint answer). Naming the wrong culprit scores 0.

## Test it

1. `npm test`: the case check must pass.
2. Play it alone at `/host` with test bots (they pin their evidence and use their abilities once a chapter, but never answer for you).
3. Then play it with real people. That's the only test that tells you if it's fun.
