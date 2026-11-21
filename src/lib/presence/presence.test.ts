// Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { Meter, summarize } from "./meter.ts";
import { renderDelay, Track } from "./smoothing.ts";
import { roomAt, STRIP_WIDTH, Walker } from "./strip.ts";

test("a track draws the player between the two positions either side of the delayed moment", () => {
  const track = new Track();
  // Sender clock 0, 100, 200; each arrives 50 ms later on our clock (plus a 1000 ms clock difference).
  for (const [t, x] of [[0, 0], [100, 10], [200, 20]]) track.push({ t, x, r: "lab4" }, 1000 + t + 50);
  // Our 1300 is sender 250; 100 ms behind is sender 150: halfway between 10 and 20.
  assert.equal(track.sample(1300, 100)?.x, 15);
});

test("with no newer news a track stands still instead of guessing", () => {
  const track = new Track();
  track.push({ t: 0, x: 0, r: "lab4" }, 50);
  track.push({ t: 100, x: 10, r: "lab4" }, 150);
  assert.equal(track.sample(5000, 100)?.x, 10);
});

test("a late message doesn't move the clock estimate, and an out-of-order one is dropped", () => {
  const track = new Track();
  track.push({ t: 0, x: 0, r: "a" }, 50);
  track.push({ t: 100, x: 10, r: "a" }, 400); // 300 ms late
  track.push({ t: 50, x: 99, r: "a" }, 410); // older than the last one
  assert.equal(track.latest?.x, 10);
  // Offset stays 50 (the fastest trip), so our 200 minus 100 delay is sender 50: halfway.
  assert.equal(track.sample(200, 100)?.x, 5);
});

test("render delay is 1.5 message gaps plus jitter room", () => {
  assert.equal(renderDelay(10), 150);
  assert.equal(renderDelay(5, 10), 320);
  assert.equal(renderDelay(30), 80);
});

test("a round trip subtracts the time the peer held our message", () => {
  const meter = new Meter(0);
  meter.noteSent(7, 90, 1000);
  meter.notePosition("jo", 1, 5000, 1100);
  meter.noteEcho("jo", 7, 30, 1150);
  meter.noteEcho("jo", 7, 30, 1250); // the same echo again doesn't count twice
  assert.deepEqual(meter.peer("jo")?.rtt, { n: 1, p50: 120, p95: 120, max: 120, mean: 120 });
});

test("gaps in a peer's sequence count as lost", () => {
  const meter = new Meter(0);
  for (const seq of [1, 2, 4, 5]) meter.notePosition("jo", seq, seq * 100, seq * 100 + 40);
  assert.equal(meter.peer("jo")?.lossPct, 20);
  assert.equal(meter.peer("jo")?.jitterMs, 0);
});

test("sends refused while disconnected are counted apart", () => {
  const meter = new Meter(0);
  meter.noteSent(1, 0, 10);
  meter.noteSent(2, 80, 20);
  const report = meter.report(60_000);
  assert.equal(report.sent, 1);
  assert.equal(report.dropped, 1);
  assert.equal(report.sentPerMin, 1);
});

test("percentiles", () => {
  const values = Array.from({ length: 100 }, (_, i) => i + 1);
  assert.deepEqual(summarize(values), { n: 100, p50: 51, p95: 96, max: 100, mean: 50.5 });
});

test("the walker reaches its spot, then picks a new one", () => {
  const walker = new Walker(500, false);
  walker.target = 514;
  walker.step(0, 0.05); // 7 cm
  assert.equal(walker.x, 507);
  walker.step(50, 0.05); // arrives, and with no pause sets off again
  assert.equal(walker.x, 514);
  assert.notEqual(walker.target, 514);
  assert.ok(walker.target > 0 && walker.target < STRIP_WIDTH);
});

test("rooms along the strip", () => {
  assert.equal(roomAt(0), "lab4");
  assert.equal(roomAt(500), "corridor");
  assert.equal(roomAt(1500), "carpark");
  assert.equal(roomAt(99999), "gate");
});
