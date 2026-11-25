// Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { createWorldStore } from "./store.ts";

test("the camera only notifies when the picture really moves", () => {
  const store = createWorldStore();
  let calls = 0;
  store.subscribe(() => calls++);
  store.getState().setCamera({ x: 10, y: 20, zoom: 0.5 });
  store.getState().setCamera({ x: 10.001, y: 20, zoom: 0.5 });
  assert.equal(calls, 1);
  assert.deepEqual(store.getState().camera, { x: 10, y: 20, zoom: 0.5 });
});

test("React asks for a camera move and the scene takes the newest one, once", () => {
  const store = createWorldStore();
  const { look, takeRequest } = store.getState();
  assert.equal(takeRequest(), null);
  look({ kind: "whole" });
  look({ kind: "person", id: "priya" });
  assert.deepEqual(store.getState().takeRequest(), { kind: "person", id: "priya" });
  assert.equal(store.getState().takeRequest(), null);
  assert.equal(store.getState().request, null);
});

test("selection is shared, and setting the same one again changes nothing", () => {
  const store = createWorldStore();
  const seen: (string | null)[] = [];
  store.subscribe((s, prev) => s.selected !== prev.selected && seen.push(s.selected));
  store.getState().select("ozzy");
  store.getState().select("ozzy");
  store.getState().select(null);
  assert.deepEqual(seen, ["ozzy", null]);
});

test("status updates merge, so the scene can report frame rate without losing the renderer", () => {
  const store = createWorldStore();
  store.getState().setStatus({ stage: "ready", renderer: "WebGL", dpr: 2 });
  store.getState().setStatus({ fps: 60, slowest: 18 });
  assert.deepEqual(store.getState().status, { stage: "ready", renderer: "WebGL", fps: 60, slowest: 18, dpr: 2, error: null });
});

test("the scene says who the camera follows, and only a change notifies", () => {
  const store = createWorldStore();
  let calls = 0;
  store.subscribe(() => calls++);
  store.getState().setFollowing("sam");
  store.getState().setFollowing("sam");
  assert.equal(store.getState().following, "sam");
  store.getState().setFollowing(null);
  assert.equal(calls, 2);
});

test("walks are asked for once, moods and positions only notify on a real change", () => {
  const store = createWorldStore();
  const s = () => store.getState();
  s().walk("sam", 800);
  s().walk("sam", 820);
  assert.deepEqual(s().takeWalk(), { id: "sam", x: 820 }, "the newest request wins");
  assert.equal(s().takeWalk(), null);
  let calls = 0;
  store.subscribe(() => calls++);
  s().setMood("priya", "nervous");
  s().setMood("priya", "nervous");
  s().setPositions({ sam: { x: 700, z: 306 } });
  s().setPositions({ sam: { x: 700.01, z: 306 } });
  s().setMe("sam");
  s().setMe("sam");
  assert.equal(calls, 3);
  assert.deepEqual(s().moods, { priya: "nervous" });
});

test("the rewind: the Archivist's slider pulls everyone's along, and a freeze locks it for all but them", () => {
  const store = createWorldStore();
  const s = () => store.getState();
  // I drag my own slider (not the Archivist): it moves, nothing is shared.
  s().dragRewind(10, "p1", false);
  assert.deepEqual(s().rewind, { open: true, minute: 10, frozenBy: null, following: null });
  assert.equal(s().cursor, null);
  // The Archivist's slider arrives: mine follows it.
  s().receiveCursor("p2", 40, false);
  assert.deepEqual(s().rewind, { open: true, minute: 40, frozenBy: null, following: "p2" });
  // Closed, a moving slider doesn't open it; a freeze does, at its minute, and then I can't move or close it.
  s().openRewind(false);
  s().receiveCursor("p2", 50, false);
  assert.equal(s().rewind.open, false);
  s().receiveCursor("p2", 42, true);
  assert.deepEqual(s().rewind, { open: true, minute: 42, frozenBy: "p2", following: "p2" });
  s().dragRewind(5, "p1", false);
  s().openRewind(false);
  assert.equal(s().rewind.minute, 42);
  assert.equal(s().rewind.open, true);
  // They let it go.
  s().receiveCursor("p2", 42, false);
  assert.equal(s().rewind.frozenBy, null);
  // As the Archivist, my drags and freezes go out to the team.
  s().dragRewind(30, "p1", true);
  assert.deepEqual(s().cursor, { minute: 30, frozen: false, n: 1 });
  s().freezeRewind("p1", true);
  assert.deepEqual(s().cursor, { minute: 30, frozen: true, n: 2 });
  assert.equal(s().rewind.frozenBy, "p1");
});
