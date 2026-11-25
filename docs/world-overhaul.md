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

- [ ] **W2.1** Plate layers and occluders, so people stand behind desks and benches.
- [ ] **W2.2** Camera: follow you, swipe between rooms, pinch or tap out to the whole building, and the minimap.
- [ ] **W2.3** Characters at 80% scale: atlas, idle and walk, facing, moods, a room-light tint and contact shadows.
- [ ] **W2.4** Spots: a soft pulse and the role icon of who can open each one. Tapping opens that role's existing tool as a sheet.
- [ ] **W2.5** Room tags and ambient motion: rain on windows, flicker, steam, LEDs, the clock, parallax.
- [ ] **W2.6** React HUD: title, chapter question, team, minimap, the timeline bar and the reward chip.

**Done when** you can walk Case 001's building, see everyone and open today's tools from real objects.

### Phase 3 · Presence and movement · M

- [ ] **W3.1** The presence channel: position, room, status and pings (hold on a spot to ping it, and the ping shows on the minimap).
- [ ] **W3.2** Smoothing, reconnects and the last-known-room fallback.
- [ ] **W3.3** Engine actions for meaningful moves (entering a room, using a spot) where the game needs them.

**Done when** four phones see each other walk smoothly, and a dropped connection degrades gracefully.

### Phase 4 · The rewind · M

- [ ] **W4.1** A pure, tested function that turns found sightings plus link paths into ghost tracks.
- [ ] **W4.2** Rewind mode: the world goes blue-grey, the living fade to outlines, ghosts glow and the rain freezes.
- [ ] **W4.3** The Archivist drags, everyone sees (shared cursor), and Freeze stops the night on one moment for the team.
- [ ] **W4.4** Clashes ("can't both be true") from today's map-of-the-night logic, shown in the building.

**Done when**, in chapter 1, Priya walking out at 8:45 and HALO on its dock until 9:13 appear only after those pieces are found.

### Phase 5 · Roles in the world · L

- [ ] **W5.1** Photographer: the flash lights dark spots, plus "then and now" (hold an old photo over the live room).
- [ ] **W5.2** Tech: laptops, badge readers, the security desk and the gate camera. Logs show numbers, not names.
- [ ] **W5.3** Interviewer: talk to suspects where they stand, with their recorded voices. Pressure follows topics. Showing evidence breaks a story.
- [ ] **W5.4** Archivist: the rewind, Freeze and the red-string wall.
- [ ] **W5.5** Make the hand-offs physical: for example, the Photographer sees the password the Tech needs.

**Done when** chapter 1 can be solved entirely from inside the world.

### Phase 6 · Side mini-games and helps · L

- [ ] **W6.1** The side-job frame: spot, sheet, result, help. Once per chapter, shared with the team, no fail state.
- [ ] **W6.2** Helps in the engine:
  - Coffee: the next question or search costs no time.
  - Lightbulb: a room glows.
  - Sore spot: one topic per suspect.
- [ ] **W6.3** The eight Case 001 games from the mockups: Coffee run, Penalty with Ozzy, Lights out, Print it, Rewire, Tea for Squires, Breathe with Priya, Race Rena.
- [ ] **W6.4** Team events: Lights out fires at a story beat, and every phone gets its own fuse.

**Done when** the games run on phones at 60 fps, rewards apply, and none of them can block progress.

### Phase 7 · Feel, sound and access · M

- [ ] **W7.1** Ambience and sound effects, plus the recorded voices on speech bubbles.
- [ ] **W7.2** Accessibility: reduced motion, colour-blind-safe cues, readable sizes, and labels for the HUD and sheets.
- [ ] **W7.3** A performance pass on a low-end phone, against the asset budget.

### Phase 8 · Case 001 chapter 1 playtest (the gate) · M

- [ ] **W8.1** Chapter 1 end to end on the hidden route.
- [ ] **W8.2** Friends play it beside the current version, following [playtest.md](playtest.md).
- [ ] **W8.3** Fix what they hit, then decide: carry on, adjust or stop.

### Phase 9 · Everything else · L

- [ ] **W9.1** Case 001 chapters 2 and 3, and the interrogation ending, in the world.
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
