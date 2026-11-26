# The world overhaul

**Status: approved by the owner on 2026-11-20, with the recommended pick for all seven decisions (section 7).** Phase 0 is under way: see the ticks and the log.

This is the plan for turning One More Clue from a set of screens into a living world: a building you walk through, people who do things, a night you can rewind, roles that act on real objects, and small side games that help a bit. It's written so any future session can pick up the next task without rereading the chat that produced it.

- Visual reference: the design canvas <https://claude.ai/artifact/TMQ7nxTF6igQV2FwECvV8Q>. The boards to follow are "001 · Close-up", "001 · Whole building" and the eight "Mini ·" boards. The older A/B/C boards are only history.
- Mockup scripts: [art/mockups/case001/](../art/mockups/case001/) (`world.py` paints the building, `boards.py` writes the boards, `sprites.py` builds the sprite sheet, `polish.py` the mini-game details) and [art/mockups/dollhouse/](../art/mockups/dollhouse/). The building painter itself now lives in [art/world/](../art/world/) (W0.7).
- Case writing guide: [case-system.md](case-system.md). Playtests: [playtest.md](playtest.md).

---

## 1. Why we're changing it

Players and the owner found the current game reads like a website: tabs, cards and lists. The owner wants it to feel alive and premium, with more on screen, the story shown instead of told, and better play. After a demo and three mockup rounds, the agreed direction is:

- **A world per case, drawn as a flat 2D cutaway of the building** (the "Dollhouse" look), never 3D.
- **A close-up camera that follows you room to room**, with a pinch or tap out to the whole building as a map. Characters are drawn at 80% of the mockup's first size.
- **A rewind**: drag the night back and ghosts walk where the evidence you've found puts people. The rest of the night stays foggy.
- **Roles that act in the world**: the Photographer, the Tech, the Interviewer and the Archivist each get something only they can do to real objects in the building.
- **Side mini-games that help a bit**: short, visual, wordless, once per chapter, with the help going to the whole team.

## 2. What stays, what changes, what's new

| Stays | Changes | New |
|---|---|---|
| The rules engine: `applyAction`, `viewFor`, `mapFor`, `checkCase`, scoring ([engine.ts](../src/lib/game/engine.ts)) | The in-game screens ([Investigation.tsx](../src/components/game/Investigation.tsx), the desk panels, the evidence shelf as the main surface) become the world plus overlays | A `world` section in every case file |
| Case files, evidence, chapters, checkpoints, the interrogation ending ([src/data/cases](../src/data/cases)) | The map of the night becomes the rewind, drawn inside the building | A Phaser world scene with a React HUD on top |
| The four roles and their core abilities (search, interview, inspect, crosscheck) | Moving between tools: you walk to an object instead of switching tabs | Live presence: see teammates move, ping a spot |
| Voices, films, the cast art, the Python painters | Syncing positions: a live channel instead of the 2-second poll (the game state itself keeps its current sync) | Side jobs and the help economy (Coffee, Lightbulb, Sore spot) |
| Auth, billing, rooms in Redis, LiveKit voice | Each case's look: one painted building instead of separate scene photos | Walk cycles, moods in place, room lighting on people, ambience and sound effects |
| The design rules in [case-system.md](case-system.md) | | World checks in the case tests, and a layered art pipeline |

## 3. Ground rules (they override convenience)

1. **Nothing names the culprit.** Abilities and helps speed the team up but never say who did it. The Sore spot shows the topic that makes a suspect uneasy (every suspect has one, innocent ones too), not whether they're lying. Interviewer pressure follows topics, not where someone is searching. The Tech's logs show badge numbers and times, not names. A Lightbulb lights a room, not the clue. Ghosts only walk where found evidence puts them.
2. **Puzzles stay easy and generous.** Mini-games can't fail you: a miss just gives less. Nothing blocks progress.
3. **Flat 2D only.** No drawn human hands anywhere (the cast's stubby arms are fine).
4. **The world has to match the case.** Every prop, ghost and line is checked against the case's timeline. No unofficial clues: if it isn't in the case file, it can't hint at the answer.
5. **Mini-games are short (10–30 s), visual, one thumb, one-word prompts**, once per chapter each, and the help goes to the team.
6. **Before building a new look, show options as distinct mockups** (palette, light and type, not just ideas), and get a pick.
7. **Text the player must read lives in the DOM**, not the canvas, so it stays crisp, translatable and screen-reader friendly.

## 4. Target architecture

### Client

- The Next.js shell stays: landing, lobby, auth, account, checkout.
- The game screen mounts two layers:
  - **`WorldCanvas`**: a Phaser game in a client-only component (dynamic import, no server rendering). It owns the building, camera (follow, swipe, pinch out to the map), sprites and animation, hotspots, ghosts and ambient effects.
  - **React overlays**: the title and chapter question, team, minimap, rewind timeline, speech bubbles placed from world coordinates, the role tools (today's React panels reused as sheets), reward cards and the mini-games.
- **A small client store** (zustand or an event bus) bridges the two: the player view from the server, the camera, the selected object and presence. Phaser reads it to draw; React reads it to show panels.
- **Why both, not all Phaser:** most of the game is still text, inputs and lists, and the tools already exist in React. Phaser does the one thing DOM can't do well: a big, moving, scrolling world with many animated sprites.

### Server

- The engine stays the single source of truth for the game. New actions (names indicative): `enterRoom`, `useSpot` (gated by role), `finishSideJob` and `spendHelp`, plus team event triggers.
- `viewFor` gains a world view per player: visible spots and their role icons, the ghost tracks this player may see (from found sightings), and the team's helps.
- `checkCase` gains `checkWorld` (see phase 1).

### Live presence

- Today, phones poll every 2 seconds and LiveKit sends a "room changed" nudge ([live.ts](../src/lib/rooms/live.ts), [useLive.ts](../src/components/game/live/useLive.ts)). That's fine for actions, too slow for walking.
- Plan: a separate, throwaway presence channel per room for positions, the current room, "Jo · searching the laptop" status, pings and the Archivist's shared rewind cursor. Engine state keeps going through REST and the nudge.
- Send at most 5–10 position updates per second per player and smooth them on the other phones. If the channel drops, fall back to showing each player in their last known room.
- Capacity is a known risk: today's free plans won't hold heavy traffic (see decision 6).

### Data: the `world` section of a case (the first sketch; the settled shape is `CaseWorld` in [types.ts](../src/lib/game/types.ts))

```ts
world: {
  plate: { layers: string[]; widthCm: number; heightCm: number; pxPerCm: number }; // painted art, back to front
  floors: { id: string; z0: number; z1: number }[];
  rooms: { id: string; floor: string; x0: number; x1: number; kind: "inside" | "outside" | "away" }[]; // ids match nightMap.rooms
  links: { from: string; to: string; kind: "door" | "stairs" | "lift" | "gate"; path: [number, number][] }[];
  spots: { id: string; room: string; x: number; z: number; evidence?: string; roles?: string[]; kind: "object" | "device" | "person" | "sidejob" }[];
  people: Record<string, { room: string; x: number; mood: string }>; // where each suspect waits now
  sideJobs: { id: string; game: string; spot: string; help: "coffee" | "lightbulb" | "sore-spot"; suspect?: string }[];
  soreSpots: Record<string, string>; // suspect id -> topic, one each
  ambience: { weather: string; time: string; lights: Record<string, string> };
}
```

Ghost routes need no hand animation: they come from the existing `nightMap.sightings` (who, room, at, until) walked along `links` paths.

### Art and assets

- The painter (Python, in [art/world/](../art/world/), moved out of `omc_cinema` in W0.7) exports each building as layers: sky and city, the building, foreground and occluders (so people can step behind desks), at 2 px per cm, as WebP, with a manifest of rooms, floor lines and spots.
- Characters come from the cast kit: idle, walk and the five moods for each suspect, plus the four detectives, packed into one sprite atlas per case.
- Budget: about 3 MB for a case's first load on a phone, with the other cases loaded later.

## 5. Phases

Tasks are numbered (`W0.1` …) so sessions can claim them. Size is a rough count of sessions: S = one, M = two or three, L = four or more. Each phase ends with a "done when" check.

### Phase 0 · Foundations (no change players can see) · M

- [x] **W0.1** The owner approves this plan and the decisions in section 7. *(Done 2026-11-20: approved with the recommended picks.)*
- [x] **W0.2** Put the world behind a flag: a per-room `world` flag and a hidden route, so the current game stays the default. *(Done 2026-11-20: `RoomState.world`, set only for rooms opened from `/world/<caseId>`, and only for cases with a painted building (Case 001, listed in `src/lib/world/plates.ts`). `/r/<code>/world` shows a world room in the building; classic or missing rooms go to `/r/<code>`, and the same room still plays classic there. Nothing links to either page.)*
- [x] **W0.3** Phaser spike: Phaser 4 inside Next 15 and React 19, client only. Show the Case 001 plate with swipe, pinch and DPR handling, holding 60 fps with 8 sprites on a mid-range phone. Measure the bundle size. *(Done 2026-11-20 with Phaser 4.2.1, see the log for numbers. Phaser's own input is off: it drops a finger's moves while it's over the HUD, so gestures come from DOM pointer events. `scripts/world-assets.py` packs the art for phones: the 4800 px sprite strip as a 2048 px grid, a 2048 × 1024 copy of the plate for zoomed-out views (both mipmapped), and the security desk cut out so Ozzy stands behind it. Still to try on real phones.)*
- [x] **W0.4** The `WorldCanvas` shell and the client store bridging Phaser and React. *(Done 2026-11-20: `src/components/world/` (WorldCanvas, WorldRoom, HUD, name tags placed from world coordinates) and a zustand store, `src/lib/world/store.ts`, holding the player's view, the camera, the zoom range, camera requests, the selection and frame stats. Presence goes in the same store in W0.5/W3.)*
- [x] **W0.5** Presence spike on Supabase Realtime (decision 2): a broadcast and presence channel per room, measured for latency on phones, cost and free-tier limits. Keep LiveKit data messages as the fallback if Supabase falls short, and write what you measured into section 7. *(Done 2026-11-20, measured from a laptop: Supabase falls short and the owner chose LiveKit instead, see section 7. The real-phone run still needs the owner.)*
- [ ] **W0.6** Run the real-player playtest of today's Case 001 (decision 5), using [playtest.md](playtest.md). The owner runs this with friends. It runs alongside phase 0 and must finish before phase 8.
- [x] **W0.7** Move the world painter into this repo's `art/` (scripts that import `omc_cinema` read it from `../one-more-clue-videos`). *(Done 2026-11-20: [art/world/](../art/world/) paints Case 001's plate with no videos repo.)*

**Done when** a flagged room opens the painted Case 001 building and four phones can pan and pinch it smoothly.

### Phase 1 · World data and checks · M

- [x] **W1.1** Add `CaseWorld` and friends to [types.ts](../src/lib/game/types.ts). *(Done 2026-11-25. The shape changed from the sketch in section 4: rooms have a `box` (x and z), and away rooms have none. Floors are a single floor line `z`. Spots can hold several pieces, and `kind` is `object`, `device`, `view` or `sidejob`. Suspects stand in `people`, not at spots. Records that aren't in the building go in `elsewhere`. Each sore spot names the evidence it comes from in `about`.)*
- [x] **W1.2** Add `checkWorld` to `checkCase` ([world.ts](../src/lib/game/world.ts)). It must confirm that:
  - every `nightMap` room has a world room
  - every physical evidence item has a spot
  - every inside room is reachable through links
  - every sighting's room exists
  - every side job points at a real spot
  - every suspect has a sore spot
- [x] **W1.3** Write Case 001's world from the mockup ([world.json](../art/mockups/case001/world.json)) into `src/data/cases/case-001.world.ts`.
- [x] **W1.4** Tests in [cases.test.ts](../src/lib/game/cases.test.ts) for the world checks.
- [x] **W1.5** Add "The world" section to [case-system.md](case-system.md): how to lay out a building, place spots and pick sore spots.

**Done when** `npm test` passes and Case 001 has a complete, checked world.

### Phase 2 · The world scene · L

- [x] **W2.1** Plate layers and occluders, so people stand behind desks and benches. *(Done 2026-11-25: a front layer of eight pieces (the reception desk, Lab 4's bench and chair, the maker space's printer bench, stool and laser cutter, and the corridor's bench and water cooler), each cut from the plate with its exact shape by [front.py](../art/world/front.py) and drawn over whoever stands behind. The sky and city as their own layer, for parallax, is left to W2.5.)*
- [x] **W2.2** Camera: follow you, swipe between rooms, pinch or tap out to the whole building, and the minimap. *(Done 2026-11-25. Looking at someone ("Find me", arriving, a teammate's name) follows them until a finger, the wheel or another target takes over. In close-up a quick swipe pages to the next room, and a slow drag still pans freely. Upright phones already show both floors, so paging up and down only happens when the view would move. Letting go of a pinch past halfway out settles on the whole building. Double-tap and the buttons already went out and back. The minimap sits under the title card: the plate shrunk down, a frame for the view, the room you're in, a dot for everyone, and each room as a button.)*
- [x] **W2.3** Characters at 80% scale: atlas, idle and walk, facing, moods, a room-light tint and contact shadows. *(Done 2026-11-25. [cast_sprites.py](../art/world/cast_sprites.py) draws the suspects in all five moods from the cast kit, and the detectives from [detectives.py](../art/world/detectives.py). Everyone gets a three-frame front-on walk, played a, b, a, c: a wide stance where the body dips, then each foot lifted in turn, with the legs never crossing. 48 frames fit on two 2048 px sheets. The scene walks people along their floor, flips them to face the way they go, shows their mood when standing, tints them with their room's light (easing as they cross a door) and draws a soft two-ellipse contact shadow. For now a tap on your floor walks your detective there, on this phone only, until W3 shares it.)*
- [x] **W2.4** Spots: a soft pulse and the role icon of who can open each one. Tapping opens that role's existing tool as a sheet. *(Done 2026-11-26. The server decides which spots show: `PlayerView.spots`, from `spotsFor` in [world.ts](../src/lib/game/world.ts), lists those holding evidence that exists by this chapter, marked only with the roles that evidence belongs to, and only during the investigation. Side-job spots wait for W6. [WorldSpots](../src/components/world/WorldSpots.tsx) draws them as labelled DOM buttons with a pulse and role icons, ringed in mustard when one of your roles can use them, fading out when zoomed out. [WorldSheets](../src/components/world/WorldSheets.tsx) opens your role's own tool from the classic screens in a sheet, or, if the spot isn't yours, says who to ask. Spots got names for screen readers, and a test keeps every spot clear of anyone standing in the building.)*
- [x] **W2.5** Room tags and ambient motion: rain on windows, flicker, steam, LEDs, the clock, parallax. *(Done 2026-11-26. [ambience.ts](../src/components/world/ambience.ts) draws, from the plate's `ambience` data:
  - rain outside and over the roof, and drops running down the Lab 4 and maker space windows
  - the corridor's right-hand strip light stuttering every few seconds, dimming the corridor
  - steam off Ozzy's flask
  - seven blinking LEDs
  - red second hands ticking on both wall clocks
  - clouds in a sky layer that scrolls at 70% of the camera, for parallax

  It all holds still with reduced motion. [WorldRoomTags](../src/components/world/WorldRoomTags.tsx) labels the rooms as the camera pulls back, while the name tags fade. The sky as its own painted layer wasn't needed: the clouds give the depth.)*
- [x] **W2.6** React HUD: title, chapter question, team, minimap, the timeline bar and the reward chip. *(Done 2026-11-26. The [HUD](../src/components/world/WorldHud.tsx) shows:
  - the chapter pill and question (tap it to solve)
  - the night clock as a chip, with room for the helps (W6)
  - the team (tap a name to find them) and the minimap

  [WorldGame](../src/components/world/WorldGame.tsx) brings the classic game's own pieces over the building: the dock and its panels (Evidence, Board, Solve, Team, Notes), the vote bar, teammates' news, find moments, cracks, lie calls and chapter stories. A [timeline bar](../src/components/world/TimelineBar.tsx) above the dock puts a dot on every timed moment in your evidence, and tapping one opens its piece. The frame meter now only shows with `?fps` in the address. Chapter 1 can now be played from inside the world.)*

**Done when** you can walk Case 001's building, see everyone and open today's tools from real objects.

### Phase 3 · Presence and movement · M

- [x] **W3.1** The presence channel: position, room, status and pings (hold on a spot to ping it, and the ping shows on the minimap). *(Done 2026-11-26.
  - **The channel:** every world room gets its own data-only LiveKit room, `omc-<CODE>-world`, through `/api/rooms/<code>/presence`. A separate room means a player's voice connection never collides with it, since LiveKit allows one identity per room. The identity is the player id, and receivers check each packet's sender.
  - **Walks:** [presence.ts](../src/lib/world/presence.ts) sends a walk as where you're heading, so other phones play the same walk at the same pace. Corrections go out at up to 4 a second while you move, plus your final spot.
  - **Statuses:** "at Priya's laptop", "solving" and so on show on your name tag.
  - **Pings:** holding a spot for half a second pings it. The ping shows in the building, on the minimap and, when off-screen, at the screen's edge with an arrow. Tapping it flies the camera there.)*
- [x] **W3.2** Smoothing, reconnects and the last-known-room fallback. *(Done 2026-11-26.
  - **Smoothing:** shared walk targets do it, and a teammate far from where they say they are is moved there at once.
  - **Reconnects:** LiveKit handles short drops. [usePresence](../src/components/world/usePresence.ts) starts again after a lost channel, waiting 2, 5, 10, then 30 s, and so does a connection that can't even load.
  - **Fallback:** without the channel, teammates stand at their saved place (W3.3), and hellos put everyone right on reconnecting.)*
- [x] **W3.3** Engine actions for meaningful moves (entering a room, using a spot) where the game needs them. *(Done 2026-11-26. A `move` action saves the room and x where your walk ended, sent only when you walk into a new room. It's checked against the building, costs nothing, and shows as `place` on each player. Using a spot needed no action of its own: the tools a spot opens already send theirs, and what you're doing is a presence status.)*

**Done when** four phones see each other walk smoothly, and a dropped connection degrades gracefully.

### Phase 4 · The rewind · M

- [x] **W4.1** A pure, tested function that turns found sightings plus link paths into ghost tracks. *(Done 2026-11-26. `ghostsAt` in [rewind.ts](../src/lib/world/rewind.ts) works from `rewindFor` on the server, which is the night as the whole team knows it, so every phone shows the same ghosts:
  - a sighting covering the minute puts a ghost in its room: solid if seen, an outline if it's only someone's story
  - two places at once give two ghosts
  - gaps stay foggy, except a walk through the doors and stairs in the last few minutes before a sighting close behind the last
  - rooms off the building are listed as elsewhere

  It's tested on Case 001's real night.)*
- [x] **W4.2** Rewind mode: the world goes blue-grey, the living fade to outlines, ghosts glow and the rain freezes. *(Done 2026-11-26. The plate and furniture are tinted blue-grey and the living fade to 22%. Ghosts are the suspects' own sprites, pale blue when seen and faint lilac when only said, with a glow, and labelled "seen", "says so" or "on the way". Things like HALO get a glowing label. The ambience stops where it is.)*
- [x] **W4.3** The Archivist drags, everyone sees (shared cursor), and Freeze stops the night on one moment for the team. *(Done 2026-11-26. Anyone can open the rewind and drag it on their own phone. The Archivist's slider goes out on the live channel (`cursor` messages, at up to 10 a second) and pulls everyone's open rewind along. Freeze opens the rewind on every phone at that minute and locks it until the Archivist lets go.)*
- [x] **W4.4** Clashes ("can't both be true") from today's map-of-the-night logic, shown in the building. *(Done 2026-11-26. A clash shows as a red dashed line between the two places, or, when one place is off the building, as "also gone home" under the ghost that's here. The Archivist ties it on the spot, as on the wall. The tie only appears when they can see both pieces; otherwise the label says to pin them.)*

**Done when**, in chapter 1, Priya walking out at 8:45 and HALO on its dock until 9:13 appear only after those pieces are found.

### Phase 5 · Roles in the world · L

- [x] **W5.1** Photographer: the flash lights dark spots, plus "then and now" (hold an old photo over the live room). *(Done 2026-11-26. At the spot where a photo was taken, "Then and now" flies the camera to that room and lays the photo over it, live, with a slider between the two; "Shoot it" opens the camera on it. A Flash button floods the room your detective is in with light on every phone (a `flash` message on the live channel). It's light, not a clue: nothing is found by it.)*
- [x] **W5.2** Tech: laptops, badge readers, the security desk and the gate camera. Logs show numbers, not names. *(Done 2026-11-26. A `probe` engine action pulls a spot's records the way a search for the right word would: one record per pull, in the spot's order, still waiting on its leads and still locked behind its password. A pull before the lead says whose move opens it, for free. Any log you hold that covers the night has "Play it in the building", which steps the rewind through its rows. The full computer is one tap away in the same sheet. The case's logs already show badge numbers, not names, for the visitor.)*
- [x] **W5.3** Interviewer: talk to suspects where they stand, with their recorded voices. Pressure follows topics. Showing evidence breaks a story. *(Done 2026-11-26. Tap someone in the building: the Interviewer gets "Question them", which opens the interrogation room with them in the chair (their recorded voice plays there, as on the classic screens); everyone else is told who can. Their name tag shows "?" for questions waiting and "!" for a lead. Answers come out of the suspect as a speech bubble on every phone: the words only where that player can read them, "talking to …" elsewhere. A crack is in everyone's bubble and cracks their face; a shrug makes them smug. Activities now carry `who`, the suspect they're about. Pressure on topics comes with the sore spots in W6.2.)*
- [x] **W5.4** Archivist: the rewind, Freeze and the red-string wall. *(Done 2026-11-26. Rewind and Freeze came in W4; an Archivist spot now opens "Rewind the night", what's there, and the wall.)*
- [x] **W5.5** Make the hand-offs physical: for example, the Photographer sees the password the Tech needs. *(Done 2026-11-26. Each spot in the view now lists the pieces you hold there and says whether one of your roles can pull something new (`fresh`). When a teammate's find opens something at a spot, it wears a "New" badge and your phone pings it: "Ali's find: new at Priya's laptop". Case 001's password (the guard's badge number on the visitor sheet) is a chapter 2–3 hand-off and works the same way.)*

**Done when** chapter 1 can be solved entirely from inside the world.

### Phase 6 · Side mini-games and helps · L

- [x] **W6.1** The side-job frame: spot, sheet, result, help. Once per chapter, shared with the team, no fail state. *(Done 2026-11-26. [WorldJobs](../src/components/world/WorldJobs.tsx) marks each job's spot with the help it wins, bobbing, and greys it with a tick once someone has done it. [SideJobFrame](../src/components/world/jobs/frame.tsx) is the mockups' frame: the way back, the job's name and where it is ("Favour · Ozzy", "Odd job · Maker space"), the help chip, a few-word prompt, and one win card with 1–3 stars. The help goes to the team the moment the game ends. Every game ends with at least a star, and the slow one (Rewire) offers "Fix it for me" after 25 s.)*
- [x] **W6.2** Helps in the engine:
  - Coffee: the next question or search costs no time.
  - Lightbulb: a room glows.
  - Sore spot: one topic per suspect.

  *(Done 2026-11-26, in [helps.ts](../src/lib/game/helps.ts) with a `sideJob` action. Searches already cost nothing, so a Coffee keeps the next costly move off the clock: a question, or a shot, show or password that misses. Three stars make two cups. A Lightbulb lights the next room that still holds something to turn up this chapter (a record at its spots, or a detail in a photo kept there), and the glow goes out by itself once that room is searched out; in chapter 1 that's only ever Lab 4. A sore spot shows on the suspect's card and over the interrogation room, and a question on that topic (one of its `about` pieces) makes them visibly uneasy in the building, guilty or not. Jobs are once per chapter for the team; a sore spot, once won, stays won. The HUD shows the team's helps under the clock.)*
- [x] **W6.3** The eight Case 001 games from the mockups: Coffee run, Penalty with Ozzy, Lights out, Print it, Rewire, Tea for Squires, Breathe with Priya, Race Rena. *(Done 2026-11-26 in DOM, SVG and CSS ([games-a](../src/components/world/jobs/games-a.tsx), [games-b](../src/components/world/jobs/games-b.tsx)), each in its mockup's setting and moves: tap on green, swipe up (or tap a side of the goal), tap to stack, turn tiles, drag in order (or tap), hold and let go, trace the wire (or hold a button). Ozzy, Priya and the others are their own drawn characters.)*
- [x] **W6.4** Team events: Lights out fires at a story beat, and every phone gets its own fuse. *(Done 2026-11-26. It fires once, in chapter 1, after the team's third find. Every phone goes dark with its own fuse and sees whose are flipped; the lights come back when everyone has flipped, or after 20 s anyway, with one Lightbulb per flipped fuse.)*

**Done when** the games run on phones at 60 fps, rewards apply, and none of them can block progress.

### Phase 7 · Feel, sound and access · M

- [x] **W7.1** Ambience and sound effects, plus the recorded voices on speech bubbles. *(Done 2026-11-26. The world screen had never woken the audio engine, so it was silent. [useWorldSound](../src/components/world/useWorldSound.ts) now wakes it on the first tap, plays the case's music like the classic screens (on the phone that carries the room's sound), and lays a room tone under it that follows the camera: rain loud outside and muffled indoors, the hum of Lab 4's servers or the dark maker space. Your own detective has footsteps, and a teammate's ping chimes. Bubbles speak in the suspect's recorded voice: on every phone when the team plays apart, only on the asker's phone in one room, and not while the interrogation room is open there (it speaks the line itself).)*
- [x] **W7.2** Accessibility: reduced motion, colour-blind-safe cues, readable sizes, and labels for the HUD and sheets. *(Done 2026-11-26. Everything new holds still with reduced motion. Nothing is told by colour alone: spots carry role icons and "New", jobs a tick, lit rooms the words "Lit: something here". The smallest text went from 10 to 11 px. People in the building, drawn on the canvas, are also a list of buttons that shows on focus ([WorldPeople](../src/components/world/WorldPeople.tsx)), and side jobs and Lights out put focus on their first control.)*
- [x] **W7.3** A performance pass on a low-end phone, against the asset budget. *(Partly, 2026-11-26. Assets: Case 001's building art is 1.1 MB and Phaser 352 KB gzipped, well inside the 3 MB first load; voice clips (1.4 MB for the case) load only when a line is spoken, and the side jobs are DOM and CSS with no art files. Every new overlay follows the camera by store subscription, not React renders. A headless phone on the dev server drew 100 fps. Not done: a real low-end phone, which needs the owner.)*

### Phase 8 · Case 001 chapter 1 playtest (the gate) · M

- [x] **W8.1** Chapter 1 end to end on the hidden route. *(Done 2026-11-26 with two headless phones on `/r/<code>/world`: the Tech pulled HALO's dock log from Cabinet B's sheet, the Photographer caught HALO in the photo, both were pinned, the Archivist tied the chat to the dock log, the proof was presented and the other phone agreed in the world's vote bar. Both phones then played the proof replay ("Priya was gone. HALO wasn't.") and chapter 2's story, and the security desk spot opened for the Archivist and Tech. No page errors. The camera shot, pins, tie and proposal went through the API the world's own sheets call.)*
- [ ] **W8.2** Friends play it beside the current version, following [playtest.md](playtest.md).
- [ ] **W8.3** Fix what they hit, then decide: carry on, adjust or stop.

### Phase 9 · Everything else · L

- [x] **W9.1** Case 001 chapters 2 and 3, and the interrogation ending, in the world. *(Done 2026-11-26.
  - **The whole night runs in the world now.** Until this, the world route could only play the investigation: it had no Start, no briefing and no reveal, so a game had to be started elsewhere. [WorldLobby](../src/components/world/WorldPhases.tsx) puts who's here, One screen / Every phone and Start on a card over the building; the briefing (film, role cards) and the reveal (confession, stars) play as the classic screens on a full-screen layer.
  - **The confrontation happens in the building** ([WorldConfrontation](../src/components/world/WorldConfrontation.tsx)): the camera goes to the person named, the rest of the building falls into shadow, their opening line and claims come out of them as a speech bubble (the words on the Interviewer's phone only, as the rules say, with their recorded voice), a caught lie is struck through with what they give up, and their face goes from smug to shocked. A bar has Press on for the Interviewer and "Call a lie", which opens the classic panel with the board.
  - **The three missing spots are painted** in [world.py](../art/world/world.py): the lobby camera on a bracket left of the EXIT sign, the fuse cupboard over the corridor's water cooler, and the maker space's door with a green LOBBY sign. Their spots moved onto them.
  - The world screen now carries the case's fonts and theme, so evidence shows in its typed, handwritten and printer faces, as on the classic screens.)*
- [ ] **W9.2** Cases 002–004, each with its own building, props and themed side jobs:
  - Dead Air: a radio station.
  - The Last Course: a restaurant.
  - Snowed In: a lodge in the snow.
- [ ] **W9.3** Make the world the default and retire the old screens.
- [ ] **W9.4** Rebuild the landing page and trailer from the new world.

## 6. Risks

- **Phone performance:** large plates and many sprites. Mitigations: layers, texture size limits, lazy loading and a frame budget checked in W0.3 and W7.3.
- **Live presence on free plans:** cost and limits. Settled in W0.5, before anything depends on it.
- **Scope:** this is a large change. The chapter 1 slice and its playtest (phase 8) come before converting everything.
- **A canvas game shuts some players out.** Keep all readable text and controls in the DOM, and test with reduced motion and a screen reader.
- **Content cost per case:** each building is a painting job. The painter pipeline already exists, but expect about a session per building plus checks.
- **Clue leaks through art:** rule 4, plus the world checks and a timeline read for every prop.

## 7. Decisions (approved by the owner on 2026-11-20)

1. **World engine: Phaser 4.** It has the camera, scenes, input and tweens built in. PixiJS was the alternative.
2. **Presence channel: LiveKit data messages** (changed by the owner on 2026-11-21 after W0.5). The first pick was Supabase Realtime, but the spike found it too slow and too limited on the free plan (see below). If LiveKit drops, players show in their last known room.
3. **Mini-games: DOM, SVG and CSS, like the mockups.** They're quicker to build, the text stays crisp and they're easy to reuse. They are not Phaser scenes.
4. **Rollout: hidden route first.** Today's game stays the default until the phase 8 playtest says otherwise.
5. **Playtest order: today's Case 001 gets its real-player playtest first** (W0.6), while phase 0 is built.
6. **Money: stay on free plans** until presence or traffic needs more. Then move the service that runs short (Supabase, Upstash or LiveKit) to a paid plan, and tell the owner first.
7. **Painter location: move the world painter into this repo's `art/`** (W0.7).

### W0.5 · What the presence spike measured (2026-11-20)

**Decided (owner, 2026-11-21): presence goes on LiveKit data messages, not Supabase Realtime.** Supabase stays for accounts and purchases. Why:

1. **Speed.** From here, a position reached the other phone in about 15–30 ms over LiveKit and about 140–150 ms over Supabase (half the measured round trip). Add the smoothing delay, and teammates show under 0.2 s behind on LiveKit and about 0.45 s behind on Supabase.
2. **Supabase's free plan can't take 10 updates a second.** Any phone sending about 8 or more messages a second was throttled within 5–10 s. Deliveries fell to 0–40%, then the service dropped the connections. At 5 a second it held in Node, but browser tabs still lost 4–31% of messages to heartbeat timeouts and bursts.
3. **What breaks when a limit runs out.** Supabase's quota covers the whole organisation. On the free plan, going over can restrict every project in it, and that includes accounts and purchases. LiveKit's free plan just refuses new connections: voice and presence stop, and the game carries on.
4. **Cost as it grows.** Supabase charges per message delivered, LiveKit per connected minute. At 5 updates a second, Supabase Pro works out at about $0.23 per 20-minute game past its included 5 million messages. LiveKit Ship works out at about $0.04 per game past its included 150,000 minutes.

The catch: every phone in the world stays connected to LiveKit for the whole game (today only players in voice connect). So the free 5,000 minutes a month cover about 60 four-player games of 20 minutes, voice included. That's plenty while the world is on a hidden route. Before it goes public, moving LiveKit to Ship ($50 a month) is the paid change that decision 6 says to raise with the owner first.

#### How it was measured

- **Built:** a presence library with both services behind one interface ([src/lib/presence/](../src/lib/presence/)), plus a hidden test page, `/lab/presence`. It shows dots on a strip of Case 001's rooms: tap to walk, hold to ping, pick a status, and read the live numbers. It returns 404 on the live site. Two benches drive it: [presence-bench.ts](../scripts/presence-bench.ts) runs simulated players in Node (Supabase only), and [presence-browser-bench.mjs](../scripts/presence-browser-bench.mjs) runs headless Chrome tabs on the test page (either service).
- **Round trips without synced clocks:** each position message also says, for every teammate, the last message it got from them and how long it held it. The sender can then time phone → service → phone → service → phone on its own clock, with no extra messages.
- **Where:** one laptop on home Wi-Fi in the UAE, against the live Supabase project (free plan) and LiveKit Cloud (Build plan). Every player walked nonstop, the worst case, for 40–90 s per run. The Supabase project's region wasn't checked; 140 ms one way from the UAE points to Europe or further.
- **Cost of measuring:** about 70,000 Supabase messages (3.5% of the month's 2 million) and about 50 LiveKit minutes (1% of 5,000).

#### Results

| Run (updates a second per player) | Round trip, median | 95th percentile | Delivered |
|---|---|---|---|
| LiveKit, 4 browser tabs, 10/s | 32 ms | 66 ms | 100% |
| LiveKit, 4 browser tabs, 10/s, production build | 54 ms | 241 ms\* | 97.8% |
| LiveKit, 4 browser tabs, 5/s, production build | 52 ms | 347 ms\* | 99.9% |
| Supabase, 4 players in Node, 5/s (two runs) | 276–282 ms | 296–297 ms | 99.7% |
| Supabase, 4 browser tabs, 5/s (three runs) | 292–296 ms | 332–649 ms | 69–96% |
| Supabase, 8 players in one room, 2/s | 287 ms | 325 ms | 99.7% |
| Supabase, two rooms of 4 at once, 5/s | 284 ms | 313 ms | 99.8% |
| Supabase, 2 players, 7/s (6.6 actually sent a second) | 281 ms | 328 ms | 99.6% |
| Supabase, 2 players, 8/s (7.7 actually sent a second) | 300 ms | 1,021 ms | 38% |
| Supabase, 2 players, 10/s | 278 ms | 1,015 ms | 25% |
| Supabase, 4 players, 10/s (two runs) | 281–283 ms | 298–329 ms | 16–17% |

\* Other work was running on the laptop during these runs, and the tabs froze for up to 0.4 s, which stretches the 95th percentile. The medians hold.

What it shows:

- **Supabase's limit is per phone, not per room.** Its docs give the free plan 100 messages a second per project, counting every delivery, but that wasn't what bit: 154 a second across two rooms, and 127 a second in one room, ran clean. What failed was any single connection sending 7.7 or more a second; 6.6 was fine. When it failed, delivery fell to about 3% after the first 5 seconds and connections were dropped (code 1006, heartbeat timeouts).
- **Supabase Presence is tight too:** 5 calls per client per 30 seconds. Going over closes the channel ("Client presence rate limit exceeded"), and supabase-js doesn't rejoin by itself. The bench tripped it even at 4 calls per 30 s, so the spike now makes at most 2 and keeps positions out of Presence.
- **Browsers did worse on Supabase than Node did at the same rate,** with heartbeat timeouts and bursts up to a second. LiveKit in the same tabs was clean.
- **Smoothing works at 5 and 10 a second.** Each teammate is drawn about 1.5 messages in the past, between the two positions either side of that moment: 150 ms behind at 10/s, 300 ms at 5/s. At 2/s it looks floaty.

#### Messages per minute for a 4-player room, against the free plans

| | 10/s, walking nonstop | 5/s, walking nonstop | 5/s, walking a third of the time |
|---|---|---|---|
| Messages sent (all four phones) | ~2,400 | ~1,170 | ~390 |
| Supabase-billed (each send plus each delivery) | ~9,600, and throttled | ~4,650 | ~1,550 |
| LiveKit minutes | 4 a minute at any rate | 4 a minute | 4 a minute |

- **Supabase free:** 2 million messages a month for the whole organisation and 200 connections at once. The docs give 100 messages a second per project; the bench found about 7 per phone. At 5/s that's roughly 20 twenty-minute games a month walking nonstop, or about 65 if people walk a third of the time.
- **LiveKit free (Build):** 5,000 connected minutes a month, shared with voice and with the owner's other free projects; 100 connections at once (25 rooms); 50 GB of downloads. A 20-minute game on 4 phones uses 80 minutes, so about 60 games a month. Positions at 10/s are about 1 MB a minute per room before packet overhead, so the 50 GB isn't the limit.
- **Paid, if needed:** Supabase Pro is $25 a month with 5 million messages, then $2.50 a million. LiveKit Ship is $50 a month with 150,000 minutes, then $0.0005 a minute.

#### Against today's LiveKit nudge

Today the server sends one "room changed" packet per saved action, only to phones in voice. Those phones then fetch their view again over the REST API; everyone else waits for the 2-second poll (a second on average, plus the fetch). That's a few hundred packets a game, and never positions. The packet travels the same LiveKit path measured here (about 20 ms one way); the fetch after it is the slow part. Presence on LiveKit would reuse that connection: one connection per phone for voice and presence, so a player already in voice costs no extra minutes. Game state keeps going through REST and the nudge, as section 4 says.

For W3.1:

- Give players a data-publish grant (today's pass has `canPublishData: false`). Keep checking that each packet's sender matches the id inside it, as the spike does, and ignore "room" packets that don't come from the server.
- Send positions as lossy packets at up to 10/s while moving, and nothing while standing still. Send statuses, pings and hellos reliably.
- If LiveKit drops or runs out of minutes, show each player in their last known room from the engine (W3.2). The game itself doesn't need presence.

#### Still to measure: real phones

Real-phone numbers need the owner:

1. Push this branch to get a preview link.
2. Open `/lab/presence?transport=livekit` on 2–4 phones, ideally with some on mobile data.
3. Tap "Run 60 s test (all phones)" on one of them.

Each phone shows its numbers and can copy a report, and reports also go to the server log as `[presence-lab]` lines. LiveKit works on previews as it is. The Supabase option needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` added to Vercel's Preview environment; today they're only in Production and Development.

## 8. How future sessions should work from this

- Start by reading this file and the "Animation overhaul plan" memory note.
- Take the next unticked task in order, unless the owner says otherwise. Use one task, or a small group, per branch and pull request, named `world/<task-id>-<short-name>` (for example `world/w0-3-phaser-spike`).
- When a task lands, tick it here and add a line to the log below with the date and the PR.
- New looks get distinct mockups on the design canvas first (rule 6).
- If something in a phase turns out wrong, change this file in the same PR and say why in the log.

## Log

- 2026-11-20: plan written from the design discussions and the Case 001 mockups.
- 2026-11-20: the owner approved the plan with the recommended pick for all seven decisions. W0.1 done. Next: W0.2–W0.5 and W0.7, plus the owner's playtest (W0.6).
- 2026-11-20: W0.2–W0.4 done on branch `world/w0-2-4-world-canvas`, merged as PR #38. Bundle: Phaser loads only in the world canvas, 352 KB gzipped (1.37 MB raw), plus 3.5 KB of scene code; the world page itself is 114 KB first load; every classic page's first load is unchanged (home 217 KB, room 209 KB). Art: 614 KB. Frame rate, production build in headless Chrome as a 390 × 844 phone (drawn at 2×), laptop Intel Iris Xe GPU, 120 Hz: 120 fps through idle, pan, fling, pinch and double-tap, slowest frame 17 ms. With the CPU slowed 4× (the usual mid-range phone stand-in) runs swung from 86–114 fps down to 25–95 fps even when idle, which points at the laptop's mixed fast/slow cores rather than the scene; the profile puts page code at about 1 ms a frame at full speed. The real test is a phone: open `/world/case-001`, then share the room's world link.
- 2026-11-20: W0.5 done (PR #39): a presence spike with both services, a hidden `/lab/presence` page and two benches. Supabase's free plan throttles any phone sending about 8 or more messages a second, and was about 140 ms one way from the UAE. LiveKit data messages took about 15–30 ms and lost nothing at 10/s. Recommends swapping decision 2 (LiveKit for presence), waiting for the owner's OK. The real-phone run is still to do (section 7).
- 2026-11-20: W0.7 done (PR #40). The world painter moved to [art/world/](../art/world/), with trimmed copies of the `omc_cinema` code it used. `python art/world/world.py` renders the Case 001 plate byte-identical to the mockup's `world.webp`, and the same `world.json`, from this repo alone. The mockup copy in `art/mockups/case001/` is unchanged and still needs the videos repo.
- 2026-11-21: the owner chose LiveKit data messages for presence (decision 2 updated). W3.1 builds on LiveKit.
- 2026-11-25: W1.1–W1.5 done on branch `world/w1-world-data`. Case 001's world is in [case-001.world.ts](../src/data/cases/case-001.world.ts):
  - seven rooms (the maker space added, plus the two away rooms) and four links
  - eight record spots and seven side-job spots
  - all four suspects, the eight mockup side jobs and a sore spot each, as the mockups chose them
  - two records `elsewhere`: Kestrel's website and Squires's email

  `checkWorld` runs in `checkCase`, with six new tests in cases.test.ts. [plates.ts](../src/lib/world/plates.ts) now reads its rooms, plate size and suspect positions from the case's world, so the building is written down once. Three things the world has that the plate doesn't paint yet, for W2.1/W2.4: the lobby's door into the maker space, the lobby camera and the corridor's fuse cupboard. Side-job spot positions are placeholders until W6.
- 2026-11-25: W2.1 done on branch `world/w2-1-layers` (on top of W1).
  - [art/world/front.py](../art/world/front.py) redraws each piece of front furniture on its own with the painter's code, so its mask is pixel-exact, and writes `front.json` (room and outline) and `front-mask.png`. The plate is untouched.
  - `scripts/world-assets.py` now cuts every piece into `src/assets/world/case-001/front/` (8 files, 39 KB in all) and reads the plate from `art/world/`, not the mockup.
  - [plates.ts](../src/lib/world/plates.ts) lists the eight pieces, and a test keeps them the same as `front.json`. The scene already drew any number of occluders between the people behind them and everyone else.
  - Checked in headless Chrome with Mei moved behind the bench for the test: the bench top, a leg and the pencil cup draw over her, and nothing else changes. Hit tests use each piece's box, so a tap between a bench's legs counts as the bench.
- 2026-11-25: W2.2 done on branch `world/w2-2-camera` (on top of W2.1).
  - New camera logic in [camera.ts](../src/lib/world/camera.ts) (`roomInView`, `nextRoom`, `onRoom`, `swipeTarget`, `pinchSettle`), with tests. `following` is in the store, and the scene follows a sprite's live position, so it keeps up once people walk (W3).
  - [WorldMinimap.tsx](../src/components/world/WorldMinimap.tsx) moves its frame through a store subscription, not React renders.
  - Checked in headless Chrome at 390 × 844 with real touch events:
    - arriving follows you in the corridor
    - a quick swipe left pages outside and stops following
    - two swipes right page back to Lab 4
    - a slow drag stays in the room
    - the minimap's "Outside" button goes there
    - a pinch out settles on the whole building and hides the minimap
    - "Close-up" flies back to you and follows again
    - 116–120 fps, no page errors
  - Not yet tried on a real phone.
- 2026-11-25: W2.3 done on branch `world/w2-3-characters` (on top of W2.2).
  - The old twelve-still sprite strip is gone. Its moods (shocked Priya, nervous Squires, smug Rena) gave way to the case world's plain "idle", per rule 4; moods can be set through the store (`setMood`) when W5 needs them.
  - Tags and minimap dots follow walkers; taps hit people where they stand now.
  - Checked in headless Chrome at phone size:
    - a floor tap walks Sam left into Lab 4, facing that way, with his legs changing and the camera following
    - the light on him turns cool in Lab 4
    - the shadows show on the lit lobby floor
    - no page errors
  - Shadows had to be strong to show on the painting's dark floor strip.
  - Not yet tried on a real phone.
- 2026-11-26: W2.4 done on branch `world/w2-4-spots` (on top of W2.3).
  - Spots moved so none covers a person: the photo spot is by the lab clock, the security desk spot is on the key board behind the desk, and the side-job spots are clear. Squires moved 16 cm left, off the main door's badge reader.
  - Checked in headless Chrome at phone size in two- and four-player games (the host as the Tech):
    - the five chapter-1 spots show with the right roles and hide when zoomed out
    - Priya's laptop opens the computer
    - the photo spot opens the camera when you're also the Photographer, and otherwise says "Ask Bot Marple to come and look"
    - no page errors
  - Finds made from a world sheet don't yet get the classic find moments (Moments): that belongs with W2.6's HUD.
- 2026-11-26: W2.5 done on branch `world/w2-5-ambience` (on top of W2.4). Checked in headless Chrome: rain and clouds at laptop size; room names in the phone's whole-building view; the Lab 4 clock's second hand on the painted clock and rain on its window up close; 120 fps on the phone run, no page errors.
- 2026-11-26: W2.6 done on branch `world/w2-6-hud` (on top of W2.5). Checked in headless Chrome in a four-player game at phone size: the question opens Solve, the dock opens Evidence, a timeline dot opens the badge log, and teammates' toasts show. No page errors. Phase 2 is done.
- 2026-11-26: W3.1–W3.3 done on branch `world/w3-1-presence` (on top of W2.6). Checked with two headless Chrome phones on real LiveKit:
  - B saw A's detective walk 135 cm, matching A's own walk
  - B saw "A: look here" when A held the Lab 4 badge reader spot, held at B's screen edge with an arrow, since B was looking at Lab 4
  - B's name tag for A read "at Priya's laptop"
  - the server saved A's place (corridor, x 495)
  - with LiveKit blocked, a reloaded B drew A at that saved place
  - no page errors after one fix: a connection that can't load now counts as lost and is retried

  Not tried on real phones or mobile data. Phase 3 is done.
- 2026-11-26: Phase 4 (W4.1–W4.4) done on branch `world/w4-rewind` (on top of W3).
  - Case 001's world was split: [case-001.building.ts](../src/data/cases/case-001.building.ts) holds the plate, rooms, links, people and ambience, and is the only part the browser loads. Since W1 the browser had also been getting what's at each spot and the sore spots.
  - Checked with two headless Chrome phones on real LiveKit:
    - at 8:58 the Archivist saw HALO, Squires and Rena as ghosts, plus the HALO clash ("also gone home")
    - the other phone followed the Archivist's slider to 9:10
    - a freeze reopened the other phone's rewind, locked
    - after the HALO detail was pinned, the Archivist tied the clash and it turned to "Caught"
    - no page errors
  - Fixed along the way: the tie had been offered for pieces the Archivist couldn't see, which the engine refuses.
  - Not tried on real phones. Phases 2 to 4 are done; next is phase 5, roles in the world.
- 2026-11-26: Phase 5 (W5.1–W5.5) done on branch `world/w5-roles`. Checked with two headless Chrome phones on real LiveKit, the host as Tech and Photographer:
  - Cabinet B's sheet said "Something new is waiting here"; a pull found HALO's dock log, and "Play it in the building" opened the rewind at 8:38
  - "Then and now" laid the LinkedIn photo over Lab 4; the flash showed on both phones
  - tapping Priya gave the Interviewer "Question Priya · 1 question waiting", which opened the room with her in the chair
  - after the laptop question, the Interviewer read Priya's answer in a bubble, the Tech saw "talking to …" and a ping, "…'s find: new at Priya's laptop"
  - showing Ozzy the photo put his crack in a bubble on both phones
  - no page errors
  
  Chapter 1 can be played from the building alone. Not tried on real phones.
- 2026-11-26: Phase 6 (W6.1–W6.4) done on branch `world/w6-sidejobs` (on top of W5). Checked with two headless Chrome phones: all seven spot jobs played through their own controls (Pour on the gauge, three penalties, the tea in the wrong order then the right one, six printed layers, seven taps on the fuse board, three held breaths, the wire traced by touch), each win card showed, the helps reached the other phone (two coffees or one, the Lab 4 glow, sore spots on Ozzy, Squires, Priya and Rena), and three finds brought Lights out to both phones, where both fuses flipped and the lights came back. A frame left open while another job was opened kept the first one's state; frames are now keyed by job.
- 2026-11-26: Phase 7 (W7.1–W7.3) on branch `world/w7-feel` (on top of W6). Checked with two headless phones: after a question, only the asker's phone fetched Ozzy's recorded answer; the people list read out all six people with their rooms; opening a side job put focus on "Back to the building"; 100 fps; no page errors. Sound itself wasn't heard (headless), and no real low-end phone was tried.
- 2026-11-26: W8.1 done (chapter 1 end to end in the world, two headless phones). Next is the gate itself: W0.6 (the owner's playtest of today's Case 001), then W8.2–W8.3 with friends.
- 2026-11-26: W9.1 done on branch `world/w9-1-case001` (the owner asked to finish Case 001 before any other case). Checked with two headless phones through the whole night on `/r/<code>/world`: the lobby card on both phones and Start from the host's, the briefing over the building, chapters 1 → 2 → 3 (the painted lobby and gate cameras pulled from their spots), the final report, the confrontation (the claim's words on the Interviewer's phone, "Only the Interviewer hears this" on the other), Press on from the world's bar, all five lies caught, the confession and the reveal on both phones, 5 stars, no page errors. The route was checked against the engine first.
- 2026-11-26: after the owner's first real play (on a laptop: "controls and camera", "looks rough or cramped", and "I don't want the click thing to move, but actual moving"): you now steer your own detective. Arrow keys or WASD walk along the floor, up and down take the stairs, and E, Space or Enter uses what's in reach, with a prompt saying what ("E · Look at Cabinet B"); phones get ◀ ▶ ▲ ▼ and a Use button ([WorldControls](../src/components/world/WorldControls.tsx), [steer.ts](../src/lib/world/steer.ts)). Tapping the floor no longer walks you. The close-up on a bigger screen now frames about a room or a floor (up to 1.8 px per cm, from 1), since on a laptop it had been nearly the whole building, and the lobby card sits at the side on wide screens. Checked in a 1366 × 768 browser with keys: walking, E on Cabinet B, the stairs down, the lobby, outside and the whole building, with a second phone watching; no page errors.
- 2026-11-26: the owner asked for more immersion ("the text looking things don't like it, it should look like icons"), for walking up to things instead of clicking them ("go near it and it should look glowing"), and for more character animation:
  - **Walk up to use things.** Spots and side jobs can't be opened from across the building any more. From afar your own role's things show a faint shimmer (others' show nothing); next to one it glows with a warm ring, and a key bubble floats over it (E and a picture: an eye to look, a speech bubble to talk, a play button for a side job). E, or the round button on a phone, opens it. At the stairs an arrow bubble shows over your own head.
  - **Characters move more:** a bounce and lean when walking; standing, a slow sway and a glance the other way every few seconds; a bob while they talk (bubbles, confrontation claims); a hop when they turn shocked, nervous or cracked. None of it with reduced motion.
  - **Icons over words:** the dock is a floating bar of icons; the camera row (whole building, follow me, rewind, flash, invite, classic) is round icon buttons with names on hover; the chapter is a badge whose question shows for 8 s when the chapter opens and then folds away; the team are round initials; "New" is a sparkle.
