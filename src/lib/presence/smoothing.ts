/**
 * Smooth a teammate's walk from position messages that arrive a few times a
 * second, late and unevenly. Snapshot interpolation: keep the last couple of
 * seconds of positions stamped with the sender's clock, and draw the player
 * where they were a short delay ago, interpolating between the two positions
 * either side of that moment. The delay hides gaps between messages; it adds
 * that much to how late teammates look, so it is kept to about 1.5 messages.
 *
 * Clocks are never synced: the offset between the sender's clock and ours is
 * taken as the smallest (arrival - sent) seen lately, which is the clock
 * difference plus the fastest trip. Late messages only make that larger, so
 * the minimum is the steadiest estimate.
 */

export type Snapshot = { t: number; x: number; r: string };

const KEEP = 48; // ~5 s at 10 Hz
const OFFSET_WINDOW = 64;

export class Track {
  private snaps: Snapshot[] = [];
  private offsets: number[] = [];
  private offset = Number.NaN;
  /** Last raw position received, for the "raw" overlay. */
  latest: Snapshot | null = null;
  /** Our clock when the latest message arrived. */
  heardAt = 0;

  /** `t` is the sender's clock, `arrivedAt` ours. Out-of-order messages are dropped. */
  push(snap: Snapshot, arrivedAt: number) {
    const last = this.snaps[this.snaps.length - 1];
    if (last && snap.t <= last.t) return;
    this.snaps.push(snap);
    if (this.snaps.length > KEEP) this.snaps.shift();
    this.latest = snap;
    this.heardAt = arrivedAt;

    this.offsets.push(arrivedAt - snap.t);
    if (this.offsets.length > OFFSET_WINDOW) this.offsets.shift();
    const lowest = Math.min(...this.offsets);
    // Move the render clock down at once (that message was faster than we
    // thought) but up only gently, so a slow patch doesn't make people jump.
    this.offset = Number.isNaN(this.offset) || lowest < this.offset ? lowest : this.offset + Math.min(lowest - this.offset, 2);
  }

  /** Where to draw the player at our time `now`, `delayMs` in the past. */
  sample(now: number, delayMs: number): Snapshot | null {
    const snaps = this.snaps;
    if (snaps.length === 0) return null;
    const at = now - this.offset - delayMs; // in the sender's clock
    if (at <= snaps[0].t) return snaps[0];
    const last = snaps[snaps.length - 1];
    if (at >= last.t) return last; // no newer news: stand still rather than guess
    let i = snaps.length - 2;
    while (i > 0 && snaps[i].t > at) i--;
    const a = snaps[i];
    const b = snaps[i + 1];
    const f = (at - a.t) / (b.t - a.t);
    return { t: at, x: a.x + (b.x - a.x) * f, r: f < 0.5 ? a.r : b.r };
  }

  reset() {
    this.snaps = [];
    this.offsets = [];
    this.offset = Number.NaN;
    this.latest = null;
  }
}

/** Render delay for a send rate: 1.5 message gaps, plus room for jitter, never under 80 ms. */
export const renderDelay = (hz: number, jitterMs = 0) => Math.max(80, Math.round(1500 / hz + 2 * jitterMs));
