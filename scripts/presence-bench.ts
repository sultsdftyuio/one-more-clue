// W0.5 presence spike: N simulated players walk on one Supabase Realtime
// channel at once, then report round trips, message counts and any errors
// the service sent (rate limits show up there). Reads the Supabase URL and
// anon key from .env.local. Each run spends Realtime messages from the
// project's monthly quota (about players x hz x players x seconds), so keep
// runs short.
//   node --no-warnings scripts/presence-bench.ts --players 4 --hz 10 --seconds 60 [--rooms 1] [--pauses] [--room name]
// --rooms splits the players over that many channels at once (the rate limit is per project).

import { readLocalEnv } from "./env-store.mjs";
import { summarize } from "../src/lib/presence/meter.ts";
import { PresenceSession, type SessionReport } from "../src/lib/presence/session.ts";
import { roomAt, STRIP_WIDTH, Walker } from "../src/lib/presence/strip.ts";
import { SupabaseTransport } from "../src/lib/presence/supabase-transport.ts";

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : fallback;
};
const players = Number(arg("players", "4"));
const hz = Number(arg("hz", "10"));
const seconds = Number(arg("seconds", "60"));
const pauses = process.argv.includes("--pauses");
const room = arg("room", `bench-${Date.now().toString(36)}`);
const rooms = Number(arg("rooms", "1"));
const perRoom = players / rooms;

const env: Record<string, string | undefined> = { ...readLocalEnv(), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  console.error("Needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (in .env.local).");
  process.exit(1);
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

console.log(`${players} players in ${rooms} room(s), ${hz}/s, ${seconds} s${pauses ? " with pauses" : " nonstop"}, channel omc-presence:${room}`);

const bots = Array.from({ length: players }, (_, i) => {
  const id = `bot${i + 1}-${Math.random().toString(36).slice(2, 6)}`;
  const x0 = 100 + Math.random() * (STRIP_WIDTH - 200);
  const session = new PresenceSession({
    transport: new SupabaseTransport({ url, anonKey, room: rooms > 1 ? `${room}-${i % rooms}` : room, id }),
    id,
    name: `Bot ${i + 1}`,
    hz,
    x: x0,
    r: roomAt(x0),
  });
  return { session, walker: new Walker(x0, pauses) };
});

const joinStarted = performance.now();
await Promise.all(bots.map((b) => b.session.start()));
while (bots.some((b) => b.session.state !== "live") && performance.now() - joinStarted < 20_000) await wait(100);
const joinMs = Math.round(performance.now() - joinStarted);
console.log(`joined in ${joinMs} ms: ${bots.map((b) => b.session.state).join(", ")}`);
await wait(1500); // let hellos and presence settle

// Walk at 50 frames a second; the sessions send at most `hz` a second.
let last = performance.now();
const walking = setInterval(() => {
  const now = performance.now();
  const dt = (now - last) / 1000;
  last = now;
  for (const b of bots) {
    const x = b.walker.step(now, dt);
    b.session.moveTo(x, roomAt(x));
  }
}, 20);

for (const b of bots) b.session.resetMeter();
// Every 5 s: how many were sent and delivered in that slice, and who is connected.
const timeline: { t: number; sentPerSec: number; deliveredPct: number; live: number }[] = [];
let prev = { sent: 0, received: 0 };
const slicing = setInterval(() => {
  const sentNow = bots.reduce((n, b) => n + b.session.meter.sent, 0);
  const receivedNow = bots.reduce((n, b) => n + b.session.meter.received, 0);
  const sentSlice = sentNow - prev.sent;
  timeline.push({
    t: (timeline.length + 1) * 5,
    sentPerSec: Math.round(sentSlice / 5),
    deliveredPct: sentSlice ? Math.round(((receivedNow - prev.received) / (sentSlice * (perRoom - 1))) * 100) : 0,
    live: bots.filter((b) => b.session.state === "live").length,
  });
  prev = { sent: sentNow, received: receivedNow };
}, 5000);
await wait(seconds * 1000);
clearInterval(slicing);
clearInterval(walking);
const reports: SessionReport[] = bots.map((b) => b.session.report());
await Promise.all(bots.map((b) => b.session.stop()));

const sent = reports.reduce((n, r) => n + r.sent, 0);
const received = reports.reduce((n, r) => n + r.received, 0);
const expected = reports.reduce((n, r) => n + r.sent * (perRoom - 1), 0);
const minutes = seconds / 60;
const allRtt = bots.flatMap((b) => b.session.meter.allRtt());

const summary = {
  transport: "supabase",
  players,
  rooms,
  hz,
  seconds,
  pauses,
  joinMs,
  sentPerMin: Math.round(sent / minutes),
  deliveredPerMin: Math.round(received / minutes),
  deliveredPct: expected ? Math.round((received / expected) * 1000) / 10 : 0,
  billedPerMin: Math.round((sent + received) / minutes),
  billedPerSec: Math.round((sent + received) / seconds),
  dropped: reports.reduce((n, r) => n + r.dropped, 0),
  avgBytes: Math.round(reports.reduce((n, r) => n + r.avgSentBytes, 0) / players),
  rtt: summarize(allRtt),
  timeline: timeline.map((s) => `${s.t}s: ${s.sentPerSec}/s sent, ${s.deliveredPct}% delivered, ${s.live}/${players} live`),
  perPlayer: reports.map((r) => ({ name: r.name, state: r.state, sentPerMin: r.sentPerMin, receivedPerMin: r.receivedPerMin, rtt: r.rtt })),
  log: reports.flatMap((r) => r.log.map((line) => `${r.name}: ${line}`)),
};
console.log(JSON.stringify(summary, null, 2));
process.exit(0);
