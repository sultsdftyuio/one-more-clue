/**
 * One phone's side of the presence channel (W0.5 spike): sends this player's
 * position at most `hz` times a second while it changes, plus status and
 * pings, and keeps a smoothed track and live numbers for every teammate.
 * Transport-agnostic, so the same code runs over Supabase Realtime or LiveKit
 * data messages, in the browser or in the Node bench.
 */
import { Meter } from "./meter.ts";
import type { Member, PresenceMessage, PresenceTransport, TransportState } from "./protocol.ts";
import { renderDelay, Track } from "./smoothing.ts";

export type Peer = {
  id: string;
  name: string;
  /** Last room and status heard, kept when they go quiet (the last-known-room fallback). */
  r: string;
  s: string;
  x: number;
  track: Track;
  /** Still on the channel, as far as presence knows. */
  online: boolean;
};

export type Ping = { id: string; x: number; r: string; at: number };

export type SessionReport = ReturnType<PresenceSession["report"]>;

type Options = {
  transport: PresenceTransport;
  id: string;
  name: string;
  hz: number;
  x: number;
  r: string;
  now?: () => number;
};

/** Echo only peers heard from in the last 2 s, so a stale hold time can't skew a round trip. */
const ECHO_FRESH_MS = 2000;

export class PresenceSession {
  readonly transport: PresenceTransport;
  readonly id: string;
  readonly name: string;
  readonly now: () => number;
  meter: Meter;
  readonly peers = new Map<string, Peer>();
  readonly pings: Ping[] = [];
  state: TransportState = "connecting";
  /** Lab only: a teammate started a timed test walk. */
  onTest: ((seconds: number) => void) | null = null;
  hz: number;
  x: number;
  r: string;
  s = "looking around";
  private seq = 0;
  private sentX = Number.NaN;
  private sentR = "";
  private timer: ReturnType<typeof setInterval> | null = null;
  private stopped = false;
  private heard = new Map<string, { seq: number; at: number }>();

  constructor(options: Options) {
    this.transport = options.transport;
    this.id = options.id;
    this.name = options.name;
    this.hz = options.hz;
    this.x = options.x;
    this.r = options.r;
    this.now = options.now ?? (() => performance.now());
    this.meter = new Meter(this.now());
  }

  async start() {
    await this.transport.connect({
      onMessage: (message, bytes) => this.receive(message, bytes),
      onMembers: (members) => this.members(members),
      onState: (state, detail) => {
        this.state = state;
        this.meter.note(`state ${state}${detail ? ` (${detail})` : ""}`, this.now());
        if (state === "live") this.hello();
      },
      onLog: (line) => this.meter.note(line, this.now()),
    });
    if (!this.stopped) this.setRate(this.hz);
  }

  async stop() {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    await this.transport.close();
  }

  setRate(hz: number) {
    this.hz = hz;
    if (this.stopped) return;
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.flush(), Math.round(1000 / hz));
  }

  /** Moves this player. Nothing is sent until the next tick, so calling it every frame is fine. */
  moveTo(x: number, r: string) {
    this.x = Math.round(x);
    if (r !== this.r) {
      this.r = r;
      this.transport.setMember(this.member());
    }
  }

  setStatus(s: string) {
    this.s = s;
    this.send({ k: "status", id: this.id, s }, null);
    this.transport.setMember(this.member());
  }

  ping(x: number, r: string) {
    this.send({ k: "ping", id: this.id, x: Math.round(x), r }, null);
    this.pings.push({ id: this.id, x, r, at: this.now() });
  }

  /** Lab only: asks every phone on the channel to walk for `seconds`. */
  startTest(seconds: number) {
    this.send({ k: "test", id: this.id, seconds }, null);
  }

  /** Starts the numbers again, e.g. at the start of a timed test. */
  resetMeter() {
    this.meter = new Meter(this.now());
  }

  /** Where to draw a teammate now, smoothed, or their raw last position. */
  drawn(peer: Peer, smooth: boolean) {
    if (!smooth) return peer.track.latest;
    const jitter = this.meter.peer(peer.id)?.jitterMs ?? 0;
    return peer.track.sample(this.now(), renderDelay(this.hz, jitter));
  }

  /** The numbers so far; `info` is anything else worth keeping with them (device, network). */
  report(info?: Record<string, unknown>) {
    const now = this.now();
    return {
      transport: this.transport.name,
      hz: this.hz,
      id: this.id,
      name: this.name,
      state: this.state,
      peersOnline: [...this.peers.values()].filter((p) => p.online).length,
      renderDelayMs: renderDelay(this.hz),
      ...this.meter.rates(now),
      ...this.meter.report(now),
      info,
    };
  }

  private member(): Member {
    return { id: this.id, name: this.name, x: this.x, r: this.r, s: this.s };
  }

  private hello() {
    this.send({ k: "hello", ...this.member() }, null);
    this.transport.setMember(this.member());
  }

  private flush() {
    if (this.x === this.sentX && this.r === this.sentR) return;
    const now = this.now();
    const echoes: Record<string, [number, number]> = {};
    for (const [peer, h] of this.heard) {
      if (now - h.at < ECHO_FRESH_MS) echoes[peer] = [h.seq, Math.round(now - h.at)];
    }
    const seq = ++this.seq;
    const sent = this.send({ k: "pos", id: this.id, n: seq, t: Math.round(now), x: this.x, r: this.r, a: echoes }, seq);
    if (sent) {
      this.sentX = this.x;
      this.sentR = this.r;
    }
  }

  private send(message: PresenceMessage, seq: number | null) {
    const bytes = this.transport.send(message);
    this.meter.noteSent(seq, bytes, this.now());
    return bytes > 0;
  }

  private peer(id: string, name = "?") {
    let p = this.peers.get(id);
    if (!p) {
      p = { id, name, r: "", s: "", x: 0, track: new Track(), online: true };
      this.peers.set(id, p);
    }
    return p;
  }

  private receive(message: PresenceMessage, bytes: number) {
    if (message.id === this.id) return;
    const now = this.now();
    this.meter.noteReceived(bytes, now);
    const p = this.peer(message.id);
    p.online = true;
    switch (message.k) {
      case "pos": {
        this.heard.set(message.id, { seq: message.n, at: now });
        this.meter.notePosition(message.id, message.n, message.t, now);
        const echo = message.a?.[this.id];
        if (echo) this.meter.noteEcho(message.id, echo[0], echo[1], now);
        p.track.push({ t: message.t, x: message.x, r: message.r }, now);
        p.x = message.x;
        p.r = message.r;
        break;
      }
      case "status":
        p.s = message.s;
        break;
      case "ping":
        this.pings.push({ id: message.id, x: message.x, r: message.r, at: now });
        if (this.pings.length > 20) this.pings.shift();
        break;
      case "hello":
        p.name = message.name;
        p.s = message.s;
        if (!p.track.latest) {
          p.x = message.x;
          p.r = message.r;
        }
        break;
      case "test":
        this.onTest?.(message.seconds);
        break;
    }
  }

  private members(members: Member[]) {
    const here = new Set(members.map((m) => m.id));
    for (const m of members) {
      if (m.id === this.id) continue;
      const p = this.peer(m.id, m.name);
      p.name = m.name;
      p.online = true;
      if (!p.s) p.s = m.s;
      if (!p.track.latest) {
        p.x = m.x;
        p.r = m.r;
      }
    }
    for (const p of this.peers.values()) if (!here.has(p.id)) p.online = false;
  }
}
