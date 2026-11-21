// W0.5 presence spike: opens the presence lab in N headless Chrome tabs (each
// its own browser profile, like separate phones), lets every tab wander
// nonstop for a while, then collects what each tab measured. Works for both
// transports. Needs the site running (dev, or `next start` with PRESENCE_LAB=1
// for steadier numbers) and Chrome installed.
//   node scripts/presence-browser-bench.mjs --transport supabase|livekit --tabs 4 --hz 10 --seconds 60 [--base http://localhost:3000]

import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const transport = arg("transport", "supabase");
const tabs = Number(arg("tabs", "4"));
const hz = Number(arg("hz", "10"));
const seconds = Number(arg("seconds", "60"));
const base = arg("base", "http://localhost:3000");
const room = arg("room", `bench-${Date.now().toString(36)}`);
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// A fresh port range per run, so a Chrome still shutting down from the last run can't block this one.
const PORT_BASE = 9400 + Math.floor(Math.random() * 50) * 10;

/** One Chrome per tab, so each has its own connection pool and throttling, like separate devices. */
async function openTab(i) {
  const port = PORT_BASE + i;
  const chrome = spawn(CHROME, [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "omc-presence-"))}`,
    "--no-first-run",
    "--mute-audio",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows",
    "about:blank",
  ]);
  let target;
  for (let n = 0; n < 150 && !target; n++) {
    await sleep(200);
    try {
      target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page");
    } catch {}
  }
  if (!target) throw new Error(`Chrome ${i} didn't start`);
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve) => ws.addEventListener("open", resolve));
  let seq = 0;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
      ws.send(JSON.stringify({ id, method, params }));
    });
  const js = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.value;
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send("Page.enable");
  const url = `${base}/lab/presence?transport=${transport}&hz=${hz}&room=${room}&auto=nonstop&name=Tab${i + 1}`;
  await send("Page.navigate", { url });
  return { i, js, close: () => (ws.close(), chrome.kill()) };
}

console.log(`${tabs} tabs, ${transport}, ${hz}/s, ${seconds} s, room ${room}`);
const pages = [];
for (let i = 0; i < tabs; i++) pages.push(await openTab(i));

// Wait until every tab's session is live and sees all the others.
const started = Date.now();
let ready = false;
while (!ready && Date.now() - started < 240_000) {
  await sleep(1000);
  const states = await Promise.all(pages.map((p) => p.js(`window.__presenceLab ? [window.__presenceLab.session.state, window.__presenceLab.session.peers.size] : null`).catch(() => null)));
  ready = states.every((s) => s && s[0] === "live" && s[1] >= tabs - 1);
  if (!ready && (Date.now() - started) % 10_000 < 1000) console.log("waiting:", JSON.stringify(states));
}
if (!ready) console.log("not every tab joined; measuring anyway");
console.log(`all live after ${Math.round((Date.now() - started) / 1000)} s`);
await sleep(1500);
await Promise.all(pages.map((p) => p.js(`window.__presenceLab.restart(), 1`)));
// Every 5 s: sends and deliveries in that slice, and who is connected.
const timeline = [];
let prev = { sent: 0, received: 0 };
const slicing = setInterval(async () => {
  const counts = await Promise.all(pages.map((p) => p.js(`(({ sent, received }) => [sent, received, window.__presenceLab.session.state])(window.__presenceLab.session.meter)`).catch(() => [0, 0, "?"])));
  const sentNow = counts.reduce((n, c) => n + c[0], 0);
  const receivedNow = counts.reduce((n, c) => n + c[1], 0);
  const slice = sentNow - prev.sent;
  timeline.push(`${(timeline.length + 1) * 5}s: ${Math.round(slice / 5)}/s sent, ${slice ? Math.round(((receivedNow - prev.received) / (slice * (tabs - 1))) * 100) : 0}% delivered, ${counts.filter((c) => c[2] === "live").length}/${tabs} live`);
  prev = { sent: sentNow, received: receivedNow };
}, 5000);
await sleep(seconds * 1000);
clearInterval(slicing);
const reports = await Promise.all(pages.map((p) => p.js(`window.__presenceLab.report()`)));
const rtts = await Promise.all(pages.map((p) => p.js(`window.__presenceLab.session.meter.allRtt()`)));
for (const p of pages) p.close();

const all = rtts.flat().sort((a, b) => a - b);
const q = (f) => (all.length ? Math.round(all[Math.min(all.length - 1, Math.floor(f * all.length))]) : null);
const sent = reports.reduce((n, r) => n + r.sent, 0);
const received = reports.reduce((n, r) => n + r.received, 0);
const minutes = seconds / 60;
console.log(
  JSON.stringify(
    {
      transport,
      tabs,
      hz,
      seconds,
      rtt: { n: all.length, p50: q(0.5), p95: q(0.95), max: all.length ? Math.round(all[all.length - 1]) : null },
      sentPerMin: Math.round(sent / minutes),
      deliveredPerMin: Math.round(received / minutes),
      deliveredPct: Math.round((received / Math.max(1, sent * (tabs - 1))) * 1000) / 10,
      billedPerMinIfSupabase: Math.round((sent + received) / minutes),
      avgBytes: Math.round(reports.reduce((n, r) => n + r.avgSentBytes, 0) / tabs),
      timeline,
      perTab: reports.map((r) => ({
        name: r.name,
        state: r.state,
        rtt: r.rtt,
        jitter: Object.values(r.peers).map((p) => p?.jitterMs),
        lossPct: Object.values(r.peers).map((p) => p?.lossPct),
        stallWorstMs: r.info?.stallWorstMs,
        stallsOver250ms: r.info?.stallsOver250ms,
      })),
      log: reports.flatMap((r) => r.log.map((line) => `${r.name}: ${line}`)),
    },
    null,
    2,
  ),
);
process.exit(0);
