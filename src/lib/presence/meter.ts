/**
 * Numbers for the W0.5 spike: round trips through the relay, how many
 * messages go each way, gaps and jitter. Pure bookkeeping, no I/O, so the
 * test page and the Node bench report the same things.
 */

export type Summary = { n: number; p50: number; p95: number; max: number; mean: number };

export function summarize(values: number[]): Summary {
  if (values.length === 0) return { n: 0, p50: 0, p95: 0, max: 0, mean: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  const mean = sorted.reduce((sum, v) => sum + v, 0) / sorted.length;
  return { n: sorted.length, p50: round(at(0.5)), p95: round(at(0.95)), max: round(sorted[sorted.length - 1]), mean: round(mean) };
}

const round = (v: number) => Math.round(v * 10) / 10;

type PeerStats = {
  firstSeq: number;
  lastSeq: number;
  got: number;
  /** RFC 3550 interarrival jitter, ms. */
  jitter: number;
  lastSent: number;
  lastArrived: number;
  rtt: number[];
};

const RTT_KEEP = 2000;

export class Meter {
  readonly startedAt: number;
  sent = 0;
  sentBytes = 0;
  /** Sends refused because the channel wasn't connected. */
  dropped = 0;
  received = 0;
  receivedBytes = 0;
  private peers = new Map<string, PeerStats>();
  private sentTimes = new Map<number, number>();
  private counted = new Set<string>();
  private sendLog: number[] = [];
  private receiveLog: number[] = [];
  readonly log: string[] = [];

  constructor(now: number) {
    this.startedAt = now;
  }

  noteSent(seq: number | null, bytes: number, now: number) {
    if (bytes === 0) {
      this.dropped++;
      return;
    }
    this.sent++;
    this.sentBytes += bytes;
    this.sendLog.push(now);
    if (seq !== null) {
      this.sentTimes.set(seq, now);
      if (this.sentTimes.size > 256) this.sentTimes.delete(this.sentTimes.keys().next().value!);
    }
  }

  noteReceived(bytes: number, now: number) {
    this.received++;
    this.receivedBytes += bytes;
    this.receiveLog.push(now);
  }

  /** A position message from `peer`: sequence gaps and jitter. */
  notePosition(peer: string, seq: number, sentAt: number, now: number) {
    let p = this.peers.get(peer);
    if (!p || seq < p.firstSeq) {
      // First message, or the peer reloaded (its sequence restarted).
      p = { firstSeq: seq, lastSeq: seq, got: 0, jitter: 0, lastSent: sentAt, lastArrived: now, rtt: p?.rtt ?? [] };
      this.peers.set(peer, p);
    } else {
      const d = now - p.lastArrived - (sentAt - p.lastSent);
      p.jitter += (Math.abs(d) - p.jitter) / 16;
    }
    p.got++;
    p.lastSeq = Math.max(p.lastSeq, seq);
    p.lastSent = sentAt;
    p.lastArrived = now;
  }

  /** `peer` says it got our message `seq` and held it `heldMs` before replying. */
  noteEcho(peer: string, seq: number, heldMs: number, now: number) {
    const sentAt = this.sentTimes.get(seq);
    const key = `${peer}:${seq}`;
    if (sentAt === undefined || this.counted.has(key)) return;
    this.counted.add(key);
    if (this.counted.size > 4096) this.counted.delete(this.counted.values().next().value!);
    const rtt = now - sentAt - heldMs;
    if (rtt < 0 || rtt > 10_000) return;
    const p = this.peers.get(peer);
    if (!p) return;
    p.rtt.push(rtt);
    if (p.rtt.length > RTT_KEEP) p.rtt.shift();
  }

  note(line: string, now: number) {
    this.log.push(`${((now - this.startedAt) / 1000).toFixed(1)}s ${line}`);
    if (this.log.length > 200) this.log.shift();
  }

  /** Messages per second over the last `windowMs`. */
  rates(now: number, windowMs = 10_000) {
    const since = now - windowMs;
    while (this.sendLog.length && this.sendLog[0] < since) this.sendLog.shift();
    while (this.receiveLog.length && this.receiveLog[0] < since) this.receiveLog.shift();
    const seconds = Math.min(windowMs, now - this.startedAt) / 1000 || 1;
    return { sentPerSec: round(this.sendLog.length / seconds), receivedPerSec: round(this.receiveLog.length / seconds) };
  }

  peer(id: string) {
    const p = this.peers.get(id);
    if (!p) return null;
    const expected = p.lastSeq - p.firstSeq + 1;
    return { rtt: summarize(p.rtt), lossPct: round(Math.max(0, 1 - p.got / expected) * 100), jitterMs: round(p.jitter), got: p.got };
  }

  /** Every round trip measured, with all peers. */
  allRtt() {
    return [...this.peers.values()].flatMap((p) => p.rtt);
  }

  report(now: number) {
    const peers: Record<string, ReturnType<Meter["peer"]>> = {};
    for (const id of this.peers.keys()) peers[id] = this.peer(id);
    const minutes = (now - this.startedAt) / 60_000 || 1;
    return {
      seconds: round((now - this.startedAt) / 1000),
      sent: this.sent,
      received: this.received,
      dropped: this.dropped,
      sentPerMin: Math.round(this.sent / minutes),
      receivedPerMin: Math.round(this.received / minutes),
      avgSentBytes: this.sent ? Math.round(this.sentBytes / this.sent) : 0,
      avgReceivedBytes: this.received ? Math.round(this.receivedBytes / this.received) : 0,
      rtt: summarize(this.allRtt()),
      peers,
      log: [...this.log],
    };
  }
}

export type MeterReport = ReturnType<Meter["report"]>;
