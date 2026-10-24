# One More Clue

Landing page for One More Clue, a cooperative browser mystery game. Next.js 15 (App Router), TypeScript, Tailwind CSS 4. Every illustration is generated in Python.

## Commands

```bash
npm run dev        # http://localhost:3000
npm run build      # production build (stop the dev server first: they share .next)
npm run art:sync   # copy regenerated art into the app
npm test           # game engine tests
```

## The game

Not linked from the site yet. Start a room at `/host`; friends join at `/r/<CODE>`.

- **Cases are data.** Each one is a file in [`src/data/cases`](src/data/cases), listed in `src/data/cases/index.ts`. How to write one: [`docs/case-system.md`](docs/case-system.md). `npm test` checks every case for authoring mistakes.
- **Chapters.** A case unfolds in chapters; the group opens the next one by answering a checkpoint question, and ends with a final report (who, why, two pinned proofs), scored out of 5 stars.
- **Roles with abilities.** Every player gets a role with its own evidence and one ability: search records, interview (shared question budget), inspect photos, or cross-check two pieces for a contradiction. Core roles are always dealt (with fewer players some hold two); extra roles only join with more players. A player who leaves passes their roles on.
- **The board** holds 8 pins: the only way to show evidence to everyone.
- **Group decisions.** Checkpoint answers, the final report, hints and giving up are all proposals that need a majority.
- **Test bots** (local dev and Vercel previews only): the host can add them in the lobby.
- **Same room or remote.** A room setting; remote rooms get a chat.
- **The server is the referee.** [`src/lib/game/engine.ts`](src/lib/game/engine.ts) holds the rules as pure functions; each player only receives their own view, and the answer is only sent at the reveal.
- **Storage.** Rooms live in Upstash Redis on Vercel (they expire after a day). Local dev keeps them in `.data/rooms/` so testing doesn't use the Redis quota; set `ROOMS_STORE=redis` to try Redis locally. Clients poll every 2 seconds.

## Features and the settings that switch them on

Every feature checks its own settings and stays off until they exist, so the site runs with none of them. The full list with explanations is in [`.env.example`](.env.example).

| Feature | Needs | Without it |
|---|---|---|
| "Notify me" signups on `/play` | Upstash Redis (`KV_REST_API_URL`, `KV_REST_API_TOKEN`) | Local dev saves to `.data/waitlist.json`; a deployment shows an error instead of losing signups |
| Canonical domain + SEO | `NEXT_PUBLIC_SITE_URL` | Uses Vercel's address |
| Accounts (log in, sign up, password reset, `/account`) | Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) | Auth pages say "Accounts open with Case 001" |
| Paid cases (Dodo Payments) | Supabase + `DODO_PAYMENTS_*` + a product id per case | Buy buttons don't render |
| Analytics | Enable Analytics in the Vercel dashboard | Nothing is sent |

Auth, payments and the domain setup are adapted from the dataomen (Arcli) project.

## Setup checklist

**Vercel**
1. vercel.com → Add New → Project → import `sultsdftyuio/one-more-clue` → Deploy. Every push to `main` redeploys.
2. Storage → Create → Upstash for Redis → connect it to the project, then redeploy. Signups now persist.
3. Analytics → Enable.

**Domain** (once bought)
1. Vercel → Project → Settings → Domains → add `www.your-domain.com` and `your-domain.com`, and follow the DNS instructions.
2. Set `NEXT_PUBLIC_SITE_URL=https://www.your-domain.com` and redeploy. The bare domain then redirects to `www`.

**Supabase** (when accounts are needed)
1. Create a project, then run `supabase/migrations/0001_purchases.sql` in the SQL editor.
2. Authentication → URL Configuration: set the Site URL to your site, and add `https://<your-site>/auth/callback` to the redirect URLs.
3. Add the three Supabase variables in Vercel.

**Dodo Payments** (when the first paid case exists)
1. `npm run setup:payments` and paste the Supabase keys, `DODO_PAYMENTS_ENV=test_mode` and a Dodo API key.
2. `npm run setup:dodo-products` creates a product per paid case (prices from `src/data/catalog.ts`) and the webhook (`payment.succeeded`, `refund.succeeded`), and saves their ids and secret.
3. Stay on `DODO_PAYMENTS_ENV=test_mode` until you've done a test purchase end to end.

**Reading signups:** Upstash console → your database → Data Browser → `waitlist:emails` (the set of emails) and `waitlist:entry:<email>` (source and time). Links can carry a source, e.g. `/play?ref=tiktok`.

## Structure

```
src/
  app/                 routes only
    (auth)/            login, register, forgot-password, reset-password (pages + server actions)
    account/           signed-in player's cases + logout
    auth/callback/     lands every Supabase email link
    api/webhooks/dodo/ verified payment + refund events
    checkout/          server action that starts a Dodo checkout
    play/              Case 001 "notify me" page + waitlist action
  middleware.ts        canonical host redirect, session refresh, /account guard
  components/          hero/, mini-case/, sections/, layout/, play/, auth/, account/, billing/, ui/
  data/                all copy and content (suspects, mini-case, catalog of paid cases, ...)
  lib/
    waitlist/          Redis store, local file store, validation
    supabase/          env check, server clients, cookie options
    auth/              safe redirects, password rules, reset-link grant, session
    billing/           Dodo client, payload readers, purchases
    site.ts            canonical URL
    analytics.ts       typed product events
  types/supabase.ts    database types (match supabase/migrations)
  assets/art/          generated WebP images (do not edit by hand)
supabase/migrations/   SQL for the purchases table
art/                   Python art generator, see below
scripts/sync-art.mjs   art/out -> src/assets/art, app icons and share image
```

Text lives in `src/data/`, so copy changes don't touch components. The warm-up puzzle is fair by design: the outage report rules out exactly one alibi. Keep it that way when you edit `mini-case.ts`.

## Art

`art/generate.py` draws every image with Skia (`art/omc_art/`: palette, shapes, faces, one module per suspect and prop, scenery, social card, export). It writes high-res PNG masters, WebP web copies, icons, the share card and preview sheets to `art/out/`.

```bash
/c/Users/sulta/.venvs/one-more-clue/Scripts/python.exe art/generate.py
npm run art:sync
```

The Python environment is in `C:\Users\sulta\.venvs\one-more-clue` (skia-python, pillow, numpy; see `art/requirements.txt`).
