/**
 * Turns pointer events into camera moves: one finger pans and can fling, two fingers pinch,
 * a quick touch taps and two quick taps double-tap. Positions are CSS px on the canvas and
 * times are ms, so it works the same at any pixel density. Pure, so `node --test` covers it.
 */

export type GestureEvent =
  /** A finger landed: stop any glide or camera move in progress. */
  | { kind: "grab" }
  | { kind: "pan"; dx: number; dy: number }
  /** Pan by (dx, dy), then zoom by `scale` around screen point (x, y). */
  | { kind: "pinch"; scale: number; x: number; y: number; dx: number; dy: number }
  /** Let go while moving: keep gliding at this speed, in px per ms. */
  | { kind: "fling"; vx: number; vy: number }
  | { kind: "tap"; x: number; y: number }
  | { kind: "doubleTap"; x: number; y: number };

/** How far a tap may wander, in px. */
export const TAP_SLOP = 10;
/** The longest press that still counts as a tap. */
export const TAP_MS = 300;
/** The longest wait between the two taps of a double tap, and how close together they land. */
export const DOUBLE_TAP_MS = 320;
export const DOUBLE_TAP_SLOP = 32;
/** Slower releases just stop; faster ones are capped, so one jumpy sample can't throw the camera. */
export const FLING_MIN = 0.12;
export const FLING_MAX = 6;
/** How much of the last movement measures a fling, and how long a finger may rest before letting go and still fling. */
const VELOCITY_WINDOW_MS = 90;
const REST_MS = 50;

type Point = { x: number; y: number };
type Sample = Point & { t: number };

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const middle = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export class Gestures {
  private points = new Map<number, Point>();
  private track: Sample[] = [];
  /** Where the current single touch began, while it could still be a tap. */
  private tapStart: Sample | null = null;
  private lastTap: Sample | null = null;

  /** How many fingers are down. */
  get active() {
    return this.points.size;
  }

  down(id: number, x: number, y: number, t: number): GestureEvent[] {
    this.points.set(id, { x, y });
    // A second finger is never a tap, and a pinch never flings.
    this.tapStart = this.points.size === 1 ? { x, y, t } : null;
    this.track = this.points.size === 1 ? [{ x, y, t }] : [];
    return [{ kind: "grab" }];
  }

  move(id: number, x: number, y: number, t: number): GestureEvent[] {
    const before = this.points.get(id);
    if (!before || (before.x === x && before.y === y)) return [];

    if (this.points.size === 1) {
      this.points.set(id, { x, y });
      if (this.tapStart && distance(this.tapStart, { x, y }) > TAP_SLOP) this.tapStart = null;
      this.track.push({ x, y, t });
      while (this.track.length > 2 && t - this.track[0].t > VELOCITY_WINDOW_MS) this.track.shift();
      return [{ kind: "pan", dx: x - before.x, dy: y - before.y }];
    }

    // Two fingers or more: the first two pinch, any others are ignored.
    const ids = [...this.points.keys()].slice(0, 2);
    if (!ids.includes(id)) {
      this.points.set(id, { x, y });
      return [];
    }
    const [a0, b0] = ids.map((i) => this.points.get(i)!);
    this.points.set(id, { x, y });
    const [a1, b1] = ids.map((i) => this.points.get(i)!);
    const from = middle(a0, b0);
    const to = middle(a1, b1);
    const d0 = distance(a0, b0);
    const scale = d0 > 0 ? distance(a1, b1) / d0 : 1;
    return [{ kind: "pinch", scale, x: to.x, y: to.y, dx: to.x - from.x, dy: to.y - from.y }];
  }

  up(id: number, t: number): GestureEvent[] {
    if (!this.points.has(id)) return [];
    const single = this.points.size === 1;
    this.points.delete(id);
    if (!single) {
      // Back to one finger: it carries on panning from where it is, measured afresh.
      this.track = [];
      this.tapStart = null;
      return [];
    }

    const events: GestureEvent[] = [];
    const start = this.tapStart;
    if (start && t - start.t <= TAP_MS) {
      const last = this.lastTap;
      if (last && start.t - last.t <= DOUBLE_TAP_MS && distance(last, start) <= DOUBLE_TAP_SLOP) {
        events.push({ kind: "doubleTap", x: start.x, y: start.y });
        this.lastTap = null;
      } else {
        events.push({ kind: "tap", x: start.x, y: start.y });
        this.lastTap = start;
      }
    } else {
      const v = this.velocity(t);
      if (v) events.push({ kind: "fling", ...v });
      this.lastTap = null;
    }
    this.tapStart = null;
    this.track = [];
    return events;
  }

  /** The browser took the touch away (a system gesture, say): forget it without tapping or flinging. */
  cancel(id: number) {
    this.points.delete(id);
    this.tapStart = null;
    this.track = [];
  }

  private velocity(t: number) {
    const recent = this.track.filter((s) => t - s.t <= VELOCITY_WINDOW_MS);
    if (recent.length < 2) return null;
    const first = recent[0];
    const last = recent[recent.length - 1];
    if (t - last.t > REST_MS || last.t <= first.t) return null;
    let vx = (last.x - first.x) / (last.t - first.t);
    let vy = (last.y - first.y) / (last.t - first.t);
    const speed = Math.hypot(vx, vy);
    if (speed < FLING_MIN) return null;
    if (speed > FLING_MAX) {
      vx *= FLING_MAX / speed;
      vy *= FLING_MAX / speed;
    }
    return { vx, vy };
  }
}
