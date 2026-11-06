/**
 * Red string, simulated: a chain of points pulled down by gravity and held
 * together by distance constraints (Verlet integration). A handful of them run
 * easily at 60fps, and they settle, so the wall's loop can go to sleep.
 */
export type Point = { x: number; y: number };
type Node = { x: number; y: number; px: number; py: number };

const SEGMENTS = 16;
/** px/s². Strings are light, so gravity reads as a gentle sag rather than a drop. */
const GRAVITY = 1500;
const DAMPING = 0.97;
const ITERATIONS = 12;

export class Rope {
  nodes: Node[];
  /** How much longer than the straight line between its pins the string is: 1 is drum-tight. */
  slack: number;
  /** Once let go at one end, it keeps its length and falls. */
  loose = false;
  private length = 0;

  constructor(a: Point, b: Point, slack: number) {
    this.slack = slack;
    // Start already hanging: a parabola as long as the string, so even its first frame sags the way string does.
    const span = Math.hypot(b.x - a.x, b.y - a.y);
    const sag = span * Math.sqrt(Math.max(0, slack - 1) * (3 / 8));
    this.nodes = Array.from({ length: SEGMENTS + 1 }, (_, i) => {
      const t = i / SEGMENTS;
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t + 4 * sag * t * (1 - t);
      return { x, y, px: x, py: y };
    });
  }

  /** Lets the far end go: the string keeps its length and falls from the near pin. */
  release() {
    let total = 0;
    for (let i = 0; i < this.nodes.length - 1; i++) total += Math.hypot(this.nodes[i + 1].x - this.nodes[i].x, this.nodes[i + 1].y - this.nodes[i].y);
    this.length = total;
    this.loose = true;
  }

  /** Moves the string on by `dt` seconds with its ends pinned at `a` and `b`. Returns how much it moved, to know when it has settled. */
  step(a: Point, b: Point, dt: number) {
    const n = this.nodes;
    const last = n.length - 1;
    const pinnedEnd = !this.loose;
    let moved = 0;
    for (let i = 1; i <= last; i++) {
      if (i === last && pinnedEnd) break;
      const p = n[i];
      const vx = (p.x - p.px) * DAMPING;
      const vy = (p.y - p.py) * DAMPING;
      p.px = p.x;
      p.py = p.y;
      p.x += vx;
      p.y += vy + GRAVITY * dt * dt;
      moved = Math.max(moved, Math.abs(vx) + Math.abs(vy));
    }
    const span = this.loose ? this.length : Math.hypot(b.x - a.x, b.y - a.y) * this.slack;
    const rest = span / SEGMENTS;
    for (let k = 0; k < ITERATIONS; k++) {
      n[0].x = a.x;
      n[0].y = a.y;
      if (pinnedEnd) {
        n[last].x = b.x;
        n[last].y = b.y;
      }
      for (let i = 0; i < last; i++) {
        const p = n[i];
        const q = n[i + 1];
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const d = Math.hypot(dx, dy) || 0.0001;
        const diff = (d - rest) / d;
        const fixedP = i === 0;
        const fixedQ = i + 1 === last && pinnedEnd;
        if (fixedP && fixedQ) continue;
        if (fixedP) {
          q.x -= dx * diff;
          q.y -= dy * diff;
        } else if (fixedQ) {
          p.x += dx * diff;
          p.y += dy * diff;
        } else {
          p.x += dx * diff * 0.5;
          p.y += dy * diff * 0.5;
          q.x -= dx * diff * 0.5;
          q.y -= dy * diff * 0.5;
        }
      }
    }
    return moved;
  }

  /** Puts the string straight between its pins at once: for reduced motion. */
  straighten(a: Point, b: Point) {
    this.nodes.forEach((p, i) => {
      const t = i / SEGMENTS;
      p.x = p.px = a.x + (b.x - a.x) * t;
      p.y = p.py = a.y + (b.y - a.y) * t;
    });
  }
}

/** Draws a string in the house style: an ink outline under a red thread, knotted at the pins. */
export function drawRope(ctx: CanvasRenderingContext2D, rope: Rope, alpha = 1, knot = false) {
  const n = rope.nodes;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(n[0].x, n[0].y);
    for (let i = 1; i < n.length - 1; i++) {
      const mx = (n[i].x + n[i + 1].x) / 2;
      const my = (n[i].y + n[i + 1].y) / 2;
      ctx.quadraticCurveTo(n[i].x, n[i].y, mx, my);
    }
    ctx.lineTo(n[n.length - 1].x, n[n.length - 1].y);
  };
  path();
  ctx.strokeStyle = "#1b1f3b";
  ctx.lineWidth = 5.5;
  ctx.stroke();
  path();
  ctx.strokeStyle = "#e0413f";
  ctx.lineWidth = 3;
  ctx.stroke();
  if (knot) {
    // A caught lie is marked where the string crosses its middle.
    const mid = n[Math.floor(n.length / 2)];
    ctx.beginPath();
    ctx.arc(mid.x, mid.y, 9, 0, Math.PI * 2);
    ctx.fillStyle = "#ef5b5b";
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#1b1f3b";
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(mid.x - 3.5, mid.y - 3.5);
    ctx.lineTo(mid.x + 3.5, mid.y + 3.5);
    ctx.moveTo(mid.x + 3.5, mid.y - 3.5);
    ctx.lineTo(mid.x - 3.5, mid.y + 3.5);
    ctx.strokeStyle = "#fff4e0";
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  ctx.restore();
}

/** The slack that makes a string between two pins hang `sag` pixels at its middle (a parabola's length, near enough). */
export function slackForSag(a: Point, b: Point, sag: number) {
  const span = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
  return 1 + (8 / 3) * (sag / span) ** 2;
}

/** How far a string hangs: loose ones a little, tied lies barely at all, and never as much as a long span would suggest. */
export const sagFor = (a: Point, b: Point, kind: "loose" | "tight" | "drag") => {
  const span = Math.hypot(b.x - a.x, b.y - a.y);
  if (kind === "tight") return Math.min(span * 0.035, 12);
  if (kind === "drag") return Math.min(span * 0.1, 30);
  return Math.min(span * 0.14, 46);
};
