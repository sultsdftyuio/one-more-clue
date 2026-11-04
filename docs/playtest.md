# Running a playtest

The goal is to find out whether real people enjoy Case 001, not to show them the game. Watch, write things down, and don't help.

Case 001 has only been played by test bots and scripts (last on 2026-10-31): 3 chapters, each ending in a proof vote, then the confrontation. Nobody real has played it yet, so there's no honest play time. Time this one.

## Before

- [ ] Get a link your friends can open. The live site (playonemoreclue.com) shows "Get early access" until `GAME_OPEN=1` is set in Vercel's production settings and the site is redeployed. Vercel previews have the game open, but they ask for a Vercel login unless you make a **shareable link** for that deployment in the Vercel dashboard (Deployment → Share). Invite links use whatever address the host opened, so everyone has to be on the same one.
- [ ] Redis and LiveKit are set for production and previews (checked 2026-11-04), so rooms open and Apart games have voice on either.
- [ ] Open the preview on your own phone, host Case 001 with 3 test bots, and get through chapter 1. This catches a broken deploy before your friends arrive.
- [ ] Get **4 players**, so each core role (Tech, Interviewer, Photographer, Archivist) is held by one person. With 2–3 players, some people hold two roles.
- [ ] Have everyone play on their **own phone**, in the **same room** (choose "Same room" when hosting). It's the easiest way to hear them talk. In Same room, only the host's phone plays the film and music; check that once before friends arrive.
- [ ] Don't explain the rules. The briefing has to do that. If you'd have to explain something, write it down instead.

## During: what to write down

Keep a note with the time next to each entry.

- [ ] **First minute:** does everyone understand their role and their power without asking you?
- [ ] **Hand-offs:** each time one player tells another what to search, ask, inspect or compare ("Tech, search the number plate"). This is the core of the game. Count them.
- [ ] **Stuck:** anyone with nothing to do for 2+ minutes, and anyone tapping around without a plan.
- [ ] **Confusion:** the exact question someone asks out loud ("where's the board?", "how do I vote?").
- [ ] **Leads:** when a lead card tells someone who to ask, do they actually ask that person?
- [ ] **Aha moments:** reactions to the edited message, the 8:58 photo, badge V-117, the Kestrel lanyard.
- [ ] **Proof votes:** at each chapter's question, does the team argue over which pinned evidence proves it, or just guess? Note every wrong answer and what they were thinking.
- [ ] **Rena:** the minute someone first says Rena's name as the culprit. If it's in chapter 1, a stronger second suspect is the top fix.
- [ ] **The board:** do the 8 pins cause good arguments ("what goes up?") or just annoyance?
- [ ] **Confrontation:** does anyone tap Objection! inside the 5 seconds? Do they break her story with evidence or by guessing?
- [ ] **Story:** do people read the pop-ups or tap Skip? Does anyone use Read out?
- [ ] **Score:** wrong answers against the story clock, time, stars.

## After (5 minutes)

- [ ] Everyone rates the case on the reveal screen. Ratings land in the Redis `feedback` list.
- [ ] Ask each person, one at a time:
  1. What was the best moment?
  2. When were you most confused or bored?
  3. Would you play another case next week?
  4. Would you pay $4.99 to host the next one for your friends?
- [ ] Write down their words, not your summary.

## Deciding what's next

- **3 or 4 people would play another case:** the core works. Fix the confusion points, then playtest Case 002.
- **Fewer than 3:** don't build more features or cases yet. Change Case 001 based on the stuck and confused moments, then test again with new people.
- Whatever happens, fix what the notes say before anything from the design reviews: real players outrank the bot runs.

## Known rough edges (from the bot run)

- With test bots, the bots never answer checkpoints and each uses its power only once per chapter. Some questions, such as Ozzy's 9:10 round, only get asked by a human Interviewer.
- In local dev, the Next.js "N" badge sits over the Board button. It doesn't show on previews or the live site.
