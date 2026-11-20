// Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { DOUBLE_TAP_MS, FLING_MAX, Gestures, TAP_MS, type GestureEvent } from "./gestures.ts";

const kinds = (events: GestureEvent[]) => events.map((e) => e.kind);

test("a quick touch that stays put is a tap where it landed", () => {
  const g = new Gestures();
  assert.deepEqual(kinds(g.down(1, 50, 60, 0)), ["grab"]);
  g.move(1, 53, 62, 40);
  assert.deepEqual(g.up(1, 90), [{ kind: "tap", x: 50, y: 60 }]);
  assert.equal(g.active, 0);
});

test("a drag pans by exactly how far the finger went, and isn't a tap", () => {
  const g = new Gestures();
  g.down(1, 100, 100, 0);
  let dx = 0;
  let dy = 0;
  for (let i = 1; i <= 10; i++) {
    for (const e of g.move(1, 100 + i * 6, 100 - i * 3, i * 16)) {
      if (e.kind === "pan") {
        dx += e.dx;
        dy += e.dy;
      }
    }
  }
  assert.deepEqual([dx, dy], [60, -30]);
  const done = g.up(1, 10 * 16 + 100);
  assert.ok(!done.some((e) => e.kind === "tap"));
});

test("holding too long isn't a tap", () => {
  const g = new Gestures();
  g.down(1, 10, 10, 0);
  assert.deepEqual(g.up(1, TAP_MS + 1), []);
});

test("two quick taps in the same place double-tap; far apart they're just two taps", () => {
  const g = new Gestures();
  g.down(1, 200, 300, 0);
  assert.deepEqual(kinds(g.up(1, 60)), ["tap"]);
  g.down(2, 208, 296, 60 + DOUBLE_TAP_MS - 100);
  assert.deepEqual(g.up(2, 60 + DOUBLE_TAP_MS - 40), [{ kind: "doubleTap", x: 208, y: 296 }]);

  const h = new Gestures();
  h.down(1, 20, 20, 0);
  h.up(1, 50);
  h.down(2, 300, 300, 120);
  assert.deepEqual(kinds(h.up(2, 170)), ["tap"]);
});

test("letting go mid-swipe flings at the finger's speed; resting first doesn't", () => {
  const g = new Gestures();
  g.down(1, 0, 0, 0);
  for (let t = 16; t <= 160; t += 16) g.move(1, t, t / 2, t);
  const [fling] = g.up(1, 165);
  assert.equal(fling.kind, "fling");
  if (fling.kind !== "fling") return;
  assert.ok(Math.abs(fling.vx - 1) < 1e-9 && Math.abs(fling.vy - 0.5) < 1e-9);

  const h = new Gestures();
  h.down(1, 0, 0, 0);
  for (let t = 16; t <= 160; t += 16) h.move(1, t, 0, t);
  assert.deepEqual(h.up(1, 400), [], "the finger stopped before letting go");

  const fast = new Gestures();
  fast.down(1, 0, 0, 0);
  fast.move(1, 400, 0, 10);
  fast.move(1, 800, 0, 20);
  const [thrown] = fast.up(1, 21);
  assert.ok(thrown.kind === "fling" && Math.hypot(thrown.vx, thrown.vy) <= FLING_MAX + 1e-9, "one jumpy sample can't throw the camera across the building");
});

test("two fingers pinch: spreading them twice as far apart zooms 2x around their middle", () => {
  const g = new Gestures();
  g.down(1, 100, 400, 0);
  g.down(2, 200, 400, 5);
  let scale = 1;
  let pan = 0;
  let middle = 0;
  for (let i = 1; i <= 10; i++) {
    for (const id of [1, 2]) {
      const x = id === 1 ? 100 - i * 5 : 200 + i * 5;
      for (const e of g.move(id, x, 400, 10 + i * 16)) {
        if (e.kind === "pinch") {
          scale *= e.scale;
          pan += e.dx;
          middle = e.x;
        }
      }
    }
  }
  assert.ok(Math.abs(scale - 2) < 1e-9, `scale ${scale}`);
  assert.equal(middle, 150, "the fingers' middle ends where it began");
  assert.equal(pan, 0, "so the picture under it doesn't drift");
});

test("lifting one finger of a pinch neither taps nor flings, and the other carries on panning without a jump", () => {
  const g = new Gestures();
  g.down(1, 100, 100, 0);
  g.down(2, 200, 100, 10);
  g.move(2, 260, 100, 30);
  assert.deepEqual(g.up(2, 40), []);
  assert.deepEqual(g.move(1, 110, 100, 56), [{ kind: "pan", dx: 10, dy: 0 }]);
  assert.ok(!g.up(1, 60).some((e) => e.kind === "tap"));
});

test("a third finger is ignored, and a cancelled touch is forgotten", () => {
  const g = new Gestures();
  g.down(1, 0, 0, 0);
  g.down(2, 100, 0, 0);
  g.down(3, 50, 50, 0);
  assert.deepEqual(g.move(3, 70, 80, 16), []);
  g.cancel(1);
  g.cancel(2);
  g.cancel(3);
  assert.equal(g.active, 0);
  assert.deepEqual(g.up(1, 20), []);
});
