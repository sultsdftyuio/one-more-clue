"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { LiveKitTransport } from "@/lib/presence/livekit-transport";
import type { PresenceTransport, TransportName } from "@/lib/presence/protocol";
import { PresenceSession, type SessionReport } from "@/lib/presence/session";
import { roomAt, roomName, STRIP_ROOMS, STRIP_WIDTH, WALK_CM_PER_S, Walker } from "@/lib/presence/strip";
import { SupabaseTransport } from "@/lib/presence/supabase-transport";

type Props = {
  supabase: { url: string; anonKey: string } | null;
  livekit: boolean;
  transport: TransportName;
  hz: number;
  room: string;
  name: string;
  /** "" = you walk; "1" = wander with pauses; "nonstop" = wander without stopping (the bench). */
  auto: string;
};

const NAMES = ["Sam", "Mei", "Ali", "Jo", "Rae", "Kit", "Lou", "Max"];
const COLORS = ["#f2b33d", "#3fb8af", "#ef5b5b", "#9b87f5", "#ffe6a7", "#7fd18b", "#f58fc1", "#8ec5ff"];
const STATUSES = ["looking around", "searching the laptop", "reading the visitor log", "talking to Priya", "checking the gate camera"];
const TEST_SECONDS = 60;
const HOLD_TO_PING_MS = 450;

const colorOf = (id: string) => COLORS[[...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % COLORS.length];
const pct = (x: number) => `${(Math.max(0, Math.min(STRIP_WIDTH, x)) / STRIP_WIDTH) * 100}%`;
const ms = (v: number) => `${Math.round(v)} ms`;

/** How often this page's main thread froze (a busy phone looks like a bad network otherwise). */
const stalls = { worstMs: 0, over250: 0 };
if (typeof window !== "undefined") {
  let expected = performance.now() + 100;
  setInterval(() => {
    const late = performance.now() - expected;
    if (late > stalls.worstMs) stalls.worstMs = Math.round(late);
    if (late > 250) stalls.over250++;
    expected = performance.now() + 100;
  }, 100);
}

function clientInfo() {
  const connection = (navigator as Navigator & { connection?: { effectiveType?: string; type?: string } }).connection;
  return {
    ua: navigator.userAgent,
    net: connection?.effectiveType ?? null,
    netType: connection?.type ?? null,
    stallWorstMs: stalls.worstMs,
    stallsOver250ms: stalls.over250,
    at: new Date().toISOString(),
  };
}

/** W0.5 presence spike: dots on a strip, live over Supabase Realtime or LiveKit, with the numbers each phone sees. */
export function PresenceLab({ supabase, livekit, transport, hz, room, name, auto }: Props) {
  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  const [, setTick] = useState(0);
  const [smooth, setSmooth] = useState(true);
  const [showRaw, setShowRaw] = useState(false);
  const [wander, setWander] = useState(auto !== "");
  const [problem, setProblem] = useState<string | null>(null);
  const [testEndsAt, setTestEndsAt] = useState(0);
  const [lastTest, setLastTest] = useState<SessionReport | null>(null);
  const [copied, setCopied] = useState(false);

  const session = useRef<PresenceSession | null>(null);
  const walker = useRef<Walker | null>(null);
  const myX = useRef(0);
  const target = useRef(0);
  const testUntil = useRef(0);
  const testTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const smoothRef = useRef(smooth);
  const wanderRef = useRef(wander);
  const strip = useRef<HTMLDivElement | null>(null);
  const meDot = useRef<HTMLDivElement | null>(null);
  const hold = useRef<{ timer: ReturnType<typeof setTimeout>; x: number } | null>(null);

  useEffect(() => {
    smoothRef.current = smooth;
    wanderRef.current = wander;
  }, [smooth, wander]);

  // Random ids and names only on the client, so the server HTML matches.
  useEffect(() => {
    setMe({ id: crypto.randomUUID().slice(0, 8), name: name || NAMES[Math.floor(Math.random() * NAMES.length)] });
  }, [name]);

  useEffect(() => {
    if (!me) return;
    let channel: PresenceTransport | null = null;
    if (transport === "livekit" && livekit) channel = new LiveKitTransport({ passUrl: `/api/lab/presence/pass?room=${room}&id=${me.id}` });
    if (transport === "supabase" && supabase) channel = new SupabaseTransport({ url: supabase.url, anonKey: supabase.anonKey, room, id: me.id });
    if (!channel) {
      setProblem(transport === "livekit" ? "LiveKit isn't set up here (LIVEKIT_* variables)." : "Supabase isn't set up here (NEXT_PUBLIC_SUPABASE_* variables).");
      return;
    }
    setProblem(null);
    const x0 = 100 + Math.random() * (STRIP_WIDTH - 200);
    myX.current = x0;
    target.current = x0;
    walker.current = new Walker(x0, auto !== "nonstop");
    const s = new PresenceSession({ transport: channel, id: me.id, name: me.name, hz, x: x0, r: roomAt(x0) });
    session.current = s;

    const finishTest = () => {
      const report = s.report({ test: true, ...clientInfo() });
      setLastTest(report);
      setTestEndsAt(0);
      void fetch("/api/lab/presence/report", { method: "POST", body: JSON.stringify(report) }).catch(() => undefined);
    };
    const restart = () => {
      s.resetMeter();
      stalls.worstMs = 0;
      stalls.over250 = 0;
    };
    s.onTest = (seconds) => {
      restart();
      testUntil.current = performance.now() + seconds * 1000;
      setTestEndsAt(Date.now() + seconds * 1000);
      if (testTimer.current) clearTimeout(testTimer.current);
      testTimer.current = setTimeout(finishTest, seconds * 1000 + 500);
    };
    void s.start();
    const lab = { session: s, restart, report: () => s.report(clientInfo()) };
    (window as unknown as { __presenceLab?: typeof lab }).__presenceLab = lab;
    return () => {
      if (testTimer.current) clearTimeout(testTimer.current);
      session.current = null;
      void s.stop();
    };
  }, [me, transport, hz, room, supabase, livekit, auto]);

  // Movement and drawing every frame; the DOM is written directly, React only re-renders the panels.
  useEffect(() => {
    if (!me) return;
    let raf = 0;
    let last = performance.now();
    let pings = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const s = session.current;
      const w = walker.current;
      if (!s || !w) return;
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      if (wanderRef.current || now < testUntil.current) {
        myX.current = w.step(now, dt);
        target.current = myX.current;
      } else {
        const gap = target.current - myX.current;
        const stride = WALK_CM_PER_S * dt;
        myX.current = Math.abs(gap) <= stride ? target.current : myX.current + Math.sign(gap) * stride;
        w.x = myX.current;
        w.target = myX.current;
      }
      s.moveTo(myX.current, roomAt(myX.current));
      if (meDot.current) meDot.current.style.left = pct(myX.current);
      strip.current?.querySelectorAll<HTMLElement>("[data-peer]").forEach((el) => {
        const peer = s.peers.get(el.dataset.peer!);
        if (!peer) return;
        const at = el.dataset.raw ? peer.track.latest : s.drawn(peer, smoothRef.current);
        el.style.left = pct(at?.x ?? peer.x);
      });
      if (s.pings.length !== pings) {
        pings = s.pings.length;
        setTick((n) => n + 1);
      }
    };
    raf = requestAnimationFrame(frame);
    const panels = setInterval(() => setTick((n) => n + 1), 500);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(panels);
    };
  }, [me]);

  const stripX = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return ((event.clientX - rect.left) / rect.width) * STRIP_WIDTH;
  };
  const onDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const x = stripX(event);
    const timer = setTimeout(() => {
      hold.current = null;
      session.current?.ping(x, roomAt(x));
    }, HOLD_TO_PING_MS);
    hold.current = { timer, x };
  };
  const onUp = () => {
    if (!hold.current) return;
    clearTimeout(hold.current.timer);
    target.current = hold.current.x;
    hold.current = null;
    setWander(false);
  };
  const runTest = () => {
    session.current?.startTest(TEST_SECONDS);
    session.current?.onTest?.(TEST_SECONDS);
  };
  const copy = async (report: SessionReport) => {
    await navigator.clipboard.writeText(JSON.stringify(report, null, 2)).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const s = session.current;
  const link = (change: Record<string, string>) => {
    const params = new URLSearchParams({ transport, hz: String(hz), room, ...(name ? { name } : {}), ...(auto ? { auto } : {}), ...change });
    for (const [key, value] of [...params]) if (!value) params.delete(key);
    return `?${params}`;
  };

  if (!me) return <main className="min-h-dvh bg-night" />;
  const report = s?.report(clientInfo());
  const peers = s ? [...s.peers.values()].filter((p) => p.online) : [];
  const recentPings = s ? s.pings.filter((p) => s.now() - p.at < 2500) : [];
  const billedPerMin = report ? Math.round(report.sentPerSec * 60 * (1 + peers.length)) : 0;
  const testLeft = testEndsAt ? Math.max(0, Math.ceil((testEndsAt - Date.now()) / 1000)) : 0;

  return (
    <main className="min-h-dvh bg-night px-4 py-5 text-cream">
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h1 className="font-[family-name:var(--font-lilita)] text-2xl tracking-wide">Presence lab</h1>
            <p className="text-sm text-cream/70">
              W0.5 spike · room <b className="text-cream">{room}</b> · you are{" "}
              <b style={{ color: colorOf(me.id) }}>{me.name}</b>
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${s?.state === "live" ? "bg-teal text-ink" : s?.state === "error" ? "bg-coral text-ink" : "bg-dusk text-cream"}`}
          >
            {transport} · {s?.state ?? "starting"}
          </span>
        </header>

        <nav className="flex flex-wrap gap-2 text-sm" aria-label="Settings">
          {(["supabase", "livekit"] as const).map((t) => (
            <a key={t} href={link({ transport: t })} className={`rounded-lg px-3 py-1.5 font-bold ${t === transport ? "bg-mustard text-ink" : "bg-dusk"}`}>
              {t === "supabase" ? "Supabase" : "LiveKit"}
            </a>
          ))}
          <span className="w-2" />
          {[10, 5, 2].map((rate) => (
            <a key={rate} href={link({ hz: String(rate) })} className={`rounded-lg px-3 py-1.5 font-bold ${rate === hz ? "bg-mustard text-ink" : "bg-dusk"}`}>
              {rate}/s
            </a>
          ))}
        </nav>

        {problem && <p className="rounded-lg bg-coral/20 px-3 py-2 text-sm">{problem}</p>}

        <section aria-label="The building">
          <div
            ref={strip}
            className="relative h-36 touch-none select-none overflow-hidden rounded-xl bg-ink"
            onPointerDown={onDown}
            onPointerUp={onUp}
            onPointerLeave={onUp}
          >
            {STRIP_ROOMS.map((r, i) => (
              <div
                key={r.id}
                className={`absolute inset-y-0 border-cream/10 ${i ? "border-l" : ""} ${i % 2 ? "bg-haze/60" : ""}`}
                style={{ left: pct(r.x0), width: `${((r.x1 - r.x0) / STRIP_WIDTH) * 100}%` }}
              >
                <span className="absolute inset-x-1.5 top-1.5 truncate text-[11px] font-bold uppercase tracking-wider text-cream/50">{r.name}</span>
              </div>
            ))}
            <div className="absolute inset-x-0 bottom-9 h-px bg-cream/15" />
            {recentPings.map((p) => (
              <span
                key={`${p.id}-${p.at}`}
                className="pointer-events-none absolute bottom-6 size-10 -translate-x-1/2 animate-ping rounded-full border-2"
                style={{ left: pct(p.x), borderColor: p.id === me.id ? colorOf(me.id) : colorOf(p.id) }}
              />
            ))}
            {showRaw &&
              peers.map((p) => (
                <div
                  key={`raw-${p.id}`}
                  data-peer={p.id}
                  data-raw="1"
                  className="pointer-events-none absolute bottom-7 size-5 -translate-x-1/2 rounded-full border-2 border-dashed"
                  style={{ borderColor: colorOf(p.id) }}
                />
              ))}
            {peers.map((p) => (
              <div key={p.id} data-peer={p.id} className="pointer-events-none absolute bottom-7 -translate-x-1/2">
                <span className="absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold" style={{ color: colorOf(p.id) }}>
                  {p.name}
                </span>
                <span className="block size-5 rounded-full" style={{ background: colorOf(p.id) }} />
              </div>
            ))}
            <div ref={meDot} className="pointer-events-none absolute bottom-7 -translate-x-1/2">
              <span className="absolute bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold text-cream">you</span>
              <span className="block size-6 rounded-full ring-4 ring-cream" style={{ background: colorOf(me.id) }} />
            </div>
          </div>
          <p className="mt-1.5 text-xs text-cream/60">Tap the strip to walk there. Hold to ping a spot.</p>
        </section>

        <section className="flex flex-wrap gap-2 text-sm" aria-label="Controls">
          <button onClick={() => setWander((v) => !v)} className={`rounded-lg px-3 py-2 font-bold ${wander ? "bg-teal text-ink" : "bg-dusk"}`}>
            Wander {wander ? "on" : "off"}
          </button>
          <button onClick={() => s?.ping(myX.current, roomAt(myX.current))} className="rounded-lg bg-dusk px-3 py-2 font-bold">
            Ping here
          </button>
          <button onClick={runTest} disabled={testLeft > 0} className="rounded-lg bg-mustard px-3 py-2 font-bold text-ink disabled:opacity-60">
            {testLeft > 0 ? `Testing… ${testLeft}s` : `Run ${TEST_SECONDS} s test (all phones)`}
          </button>
          <button onClick={() => setSmooth((v) => !v)} className={`rounded-lg px-3 py-2 font-bold ${smooth ? "bg-teal text-ink" : "bg-dusk"}`}>
            Smoothing {smooth ? "on" : "off"}
          </button>
          <button onClick={() => setShowRaw((v) => !v)} className={`rounded-lg px-3 py-2 font-bold ${showRaw ? "bg-teal text-ink" : "bg-dusk"}`}>
            Raw dots {showRaw ? "on" : "off"}
          </button>
        </section>

        <section className="flex flex-wrap gap-2 text-sm" aria-label="Your status">
          {STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => s?.setStatus(status)}
              className={`rounded-full border px-3 py-1 ${s?.s === status ? "border-mustard text-mustard" : "border-cream/20 text-cream/80"}`}
            >
              {status}
            </button>
          ))}
        </section>

        <section aria-label="Team">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-cream/60">Team ({peers.length + 1})</h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            {peers.length === 0 && <li className="text-cream/60">Open this page on another phone or tab (same room code) to see them here.</li>}
            {peers.map((p) => {
              const numbers = s?.meter.peer(p.id);
              return (
                <li key={p.id} className="flex flex-wrap gap-x-3 rounded-lg bg-ink px-3 py-2">
                  <b style={{ color: colorOf(p.id) }}>{p.name}</b>
                  <span>{roomName(p.r)}</span>
                  <span className="text-cream/70">· {p.s || "…"}</span>
                  {numbers && numbers.rtt.n > 0 && (
                    <span className="ml-auto text-cream/70">
                      round trip {ms(numbers.rtt.p50)} · lost {numbers.lossPct}%
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {report && (
          <section aria-label="Numbers" className="rounded-xl bg-ink p-4 text-sm">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-cream/60">This phone</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
              <Stat label="Round trip, median" value={report.rtt.n ? ms(report.rtt.p50) : "—"} />
              <Stat label="Round trip, 95th" value={report.rtt.n ? ms(report.rtt.p95) : "—"} />
              <Stat label="Phone to phone ≈" value={report.rtt.n ? ms(report.rtt.p50 / 2) : "—"} />
              <Stat label="Sent / s" value={String(report.sentPerSec)} />
              <Stat label="Received / s" value={String(report.receivedPerSec)} />
              <Stat label="Smoothing delay" value={ms(report.renderDelayMs)} />
              <Stat label="Supabase-billed / min (my sends)" value={String(billedPerMin)} />
              <Stat label="Message size" value={`${report.avgSentBytes} B`} />
              <Stat label="Samples" value={String(report.rtt.n)} />
            </dl>
            {report.log.length > 0 && (
              <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-night p-2 text-[11px] text-cream/70">{report.log.slice(-12).join("\n")}</pre>
            )}
          </section>
        )}

        {lastTest && (
          <section aria-label="Last test" className="rounded-xl border border-mustard/40 p-4 text-sm">
            <h2 className="mb-2 font-bold">
              Last {TEST_SECONDS} s test: round trip {ms(lastTest.rtt.p50)} median, {ms(lastTest.rtt.p95)} at the 95th, {lastTest.sentPerMin} sent and{" "}
              {lastTest.receivedPerMin} received a minute.
            </h2>
            <button onClick={() => copy(lastTest)} className="rounded-lg bg-mustard px-3 py-1.5 font-bold text-ink">
              {copied ? "Copied" : "Copy the report"}
            </button>
          </section>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-cream/50">{label}</dt>
      <dd className="text-base font-bold tabular-nums">{value}</dd>
    </div>
  );
}
