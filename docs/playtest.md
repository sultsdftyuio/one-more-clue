# Running a playtest

The goal is to find out whether real people enjoy Case 001, not to show them the game. Watch, write things down, and don't help.

Case 001 has been played end to end with test bots on a phone-sized screen (2026-10-28): 3 chapters, solved for 5 stars in 6 minutes by someone who knew the answer. Real players should take 15–25 minutes.

## Before

- [ ] Deploy the branch to a **Vercel preview**. Previews have the game open and test bots on; the live site still shows "Get early access" until `GAME_OPEN=1`.
- [ ] In Vercel, check that the preview environment has the Upstash Redis variables (`KV_REST_API_URL`, `KV_REST_API_TOKEN`). Without them, rooms fail to open. For a remote game, also check the LiveKit variables.
- [ ] Open the preview on your own phone, host Case 001 with 3 test bots, and get through chapter 1. This catches a broken deploy before your friends arrive.
- [ ] Get **4 players**, so each core role (Tech, Interviewer, Photographer, Archivist) is held by one person. With 2–3 players, some people hold two roles.
- [ ] Have everyone play on their **own phone**, in the **same room** (choose "Same room" when hosting). It's the easiest way to hear them talk.
- [ ] Don't explain the rules. The briefing has to do that. If you'd have to explain something, write it down instead.

## During: what to write down

Keep a note with the time next to each entry.

- [ ] **First minute:** does everyone understand their role and their power without asking you?
- [ ] **Hand-offs:** each time one player tells another what to search, ask, inspect or compare ("Tech, search the number plate"). This is the core of the game. Count them.
- [ ] **Stuck:** anyone with nothing to do for 2+ minutes, and anyone tapping around without a plan.
- [ ] **Confusion:** the exact question someone asks out loud ("where's the board?", "how do I vote?").
- [ ] **Aha moments:** reactions to the edited message, the 8:58 clock, badge V-117, the Kestrel lanyard.
- [ ] **The board:** do the 8 slots cause good arguments ("what goes up?") or just annoyance?
- [ ] **Story:** do people read the pop-ups or tap Skip?
- [ ] **Score:** hints used, wrong answers, time, stars.

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

## Known rough edges (from the bot run)

- A search pop-up ("Match found") covers the screen for 7 seconds. Tap anywhere to close it.
- With test bots, the bots never answer checkpoints and each uses its power only once per chapter. Some questions, such as Ozzy's 9:10 round, only get asked by a human Interviewer.
- In local dev, the Next.js "N" badge sits over the Desk tab. It doesn't show on previews or the live site.
