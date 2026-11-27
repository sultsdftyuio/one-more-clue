// Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clampCamera,
  closeUpOn,
  easeCamera,
  glide,
  isZoomedOut,
  nextRoom,
  onRoom,
  panBy,
  pinchSettle,
  plateToScreen,
  roomInView,
  sameCamera,
  screenToPlate,
  SWIPE_MIN,
  swipeTarget,
  wholeBuilding,
  zoomAt,
  zoomRange,
  type Camera,
} from "./camera.ts";
import { worldOf } from "./plates.ts";

const plate = worldOf("case-001")!;
const phone = { w: 390, h: 844 };
const near = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} ≉ ${b}`);

test("on a phone, all the way out shows the whole building across the screen, and the close-up is 1 px per cm", () => {
  const range = zoomRange(phone, plate);
  near(range.min, 390 / 6320);
  near(range.closeUp, 0.5, 1e-9);
  near(range.max, 1, 1e-9);
  const whole = wholeBuilding(phone, plate);
  assert.deepEqual([whole.x, whole.y], [3160, 850], "centred");
  near(whole.zoom, range.min);
});

test("on a big screen the zoom limits still make sense, and the close-up frames about a floor", () => {
  const laptop = zoomRange({ w: 1366, h: 768 }, plate);
  near(laptop.closeUp, 768 / 430 / 2, 1e-9);
  assert.ok(laptop.closeUp > laptop.min * 2, "a laptop's close-up is well in from the whole building");
  const desk = zoomRange({ w: 2560, h: 1440 }, plate);
  near(desk.min, 2560 / 6320, 1e-9);
  near(desk.closeUp, 0.9, 1e-9);
  assert.ok(desk.closeUp >= desk.min, "the close-up is never further out than the whole building");
  assert.ok(desk.max >= desk.closeUp);
  const wall = zoomRange({ w: 9000, h: 5000 }, plate);
  assert.ok(wall.min <= wall.closeUp && wall.closeUp <= wall.max);
});

test("the camera can't leave the building, and centres it on an axis where it all fits", () => {
  const range = zoomRange(phone, plate);
  const corner = clampCamera({ x: -500, y: -500, zoom: range.closeUp }, phone, plate);
  assert.equal(corner.x, 390, "half a screen in from the left edge");
  assert.equal(corner.y, 844, "half a screen down from the top");
  const far = clampCamera({ x: 99999, y: 99999, zoom: range.closeUp }, phone, plate);
  assert.equal(far.x, 6320 - 390);
  assert.equal(far.y, 1700 - 844);
  const out = clampCamera({ x: 0, y: 0, zoom: 0.0001 }, phone, plate);
  assert.equal(out.zoom, range.min);
  assert.deepEqual([out.x, out.y], [3160, 850]);
  assert.equal(clampCamera({ x: 3160, y: 850, zoom: 99 }, phone, plate).zoom, range.max);
});

test("a pinch keeps the spot under the fingers still, and a pan moves the picture with the finger", () => {
  const cam: Camera = { x: 1200, y: 900, zoom: 0.5 };
  const focus = { x: 100, y: 600 };
  const before = screenToPlate(cam, phone, focus.x, focus.y);
  const zoomed = zoomAt(cam, phone, 0.8, focus.x, focus.y);
  const after = screenToPlate(zoomed, phone, focus.x, focus.y);
  near(after.x, before.x);
  near(after.y, before.y);

  const spot = { x: 1300, y: 1000 };
  const was = plateToScreen(cam, phone, spot.x, spot.y);
  const now = plateToScreen(panBy(cam, 40, -25), phone, spot.x, spot.y);
  near(now.x - was.x, 40);
  near(now.y - was.y, -25);
});

test("screen and plate coordinates round-trip", () => {
  const cam: Camera = { x: 777, y: 432, zoom: 0.37 };
  const p = screenToPlate(cam, phone, 123, 456);
  const s = plateToScreen(cam, phone, p.x, p.y);
  near(s.x, 123);
  near(s.y, 456);
});

test("a close-up on someone near the edge stops at the edge", () => {
  const cam = closeUpOn(phone, plate, 10, 10);
  assert.equal(cam.zoom, 0.5);
  assert.deepEqual([cam.x, cam.y], [390, 844]);
});

test("camera moves ease to their goal at any frame rate, and land on it exactly", () => {
  const from: Camera = { x: 0, y: 0, zoom: 0.12 };
  const goal: Camera = { x: 1000, y: 500, zoom: 0.5 };
  const twice = easeCamera(easeCamera(from, goal, 8), goal, 8);
  const once = easeCamera(from, goal, 16);
  near(twice.x, once.x, 1e-6);
  near(twice.zoom, once.zoom, 1e-9);
  let cam = from;
  for (let i = 0; i < 200 && cam !== goal; i++) cam = easeCamera(cam, goal, 16);
  assert.equal(cam, goal);
});

test("a fling glides a fixed distance and stops", () => {
  let v = { vx: 2, vy: -1 };
  let travelled = 0;
  for (let i = 0; i < 400 && (v.vx || v.vy); i++) {
    const step = glide(v.vx, v.vy, 16);
    travelled += step.dx;
    v = { vx: step.vx, vy: step.vy };
  }
  assert.deepEqual(v, { vx: 0, vy: 0 });
  near(travelled, 2 * 325, 15);
  const big = glide(2, 0, 32);
  const small = glide(2, 0, 16);
  const second = glide(small.vx, 0, 16);
  near(big.dx, small.dx + second.dx, 1e-9);
});

test("zoomed out means past halfway (in zoom) from the close-up to the whole building", () => {
  const range = zoomRange(phone, plate);
  assert.equal(isZoomedOut({ x: 0, y: 0, zoom: range.min }, range), true);
  assert.equal(isZoomedOut({ x: 0, y: 0, zoom: range.closeUp }, range), false);
  assert.equal(sameCamera({ x: 1, y: 1, zoom: 0.5 }, { x: 1.001, y: 1, zoom: 0.5 }), true);
  assert.equal(sameCamera({ x: 1, y: 1, zoom: 0.5 }, { x: 1.5, y: 1, zoom: 0.5 }), false);
});

// Rooms (W2.2)

/** A phone on its side: in close-up it shows about one floor, so paging up and down matters. */
const sideways = { w: 844, h: 390 };

test("the camera knows which room it's looking at, even from the gap between two", () => {
  const range = zoomRange(sideways, plate);
  for (const room of plate.rooms) assert.equal(roomInView(plate, onRoom(sideways, plate, room.id, range.closeUp)!), room.id, room.id);
  // Halfway between Lab 4 and the corridor, on the wall between them (x 1048 cm): the nearer room wins.
  const wall = { x: (1048 - plate.extent.x0) * 2, y: (plate.extent.z1 - 440) * 2, zoom: 0.5 };
  assert.ok(["lab4", "corridor"].includes(roomInView(plate, wall)!));
});

test("rooms have neighbours on every side the building goes on", () => {
  assert.equal(nextRoom(plate, "lab4", "right"), "corridor");
  assert.equal(nextRoom(plate, "lab4", "left"), "office");
  assert.equal(nextRoom(plate, "lab4", "down"), "security");
  assert.equal(nextRoom(plate, "office", "left"), null, "nothing west of the office");
  assert.equal(nextRoom(plate, "lab4", "up"), null, "nothing above the top floor");
  assert.equal(nextRoom(plate, "corridor", "left"), "lab4");
  assert.equal(nextRoom(plate, "corridor", "right"), "kitchen");
  assert.equal(nextRoom(plate, "corridor", "down"), "lobby");
  assert.equal(nextRoom(plate, "maker", "right"), "security");
  assert.equal(nextRoom(plate, "security", "right"), "lobby");
  assert.equal(nextRoom(plate, "lobby", "right"), "outside", "the main door leads out");
  assert.equal(nextRoom(plate, "outside", "left"), "lobby", "back in at ground level, not up to the corridor");
  assert.equal(nextRoom(plate, "outside", "right"), null);
});

test("in close-up a quick swipe pages to the next room, the way the finger pulls", () => {
  const range = zoomRange(phone, plate);
  const inLab = onRoom(phone, plate, "lab4", range.closeUp)!;
  const left = swipeTarget(inLab, phone, plate, -1, 0.1)!;
  assert.equal(roomInView(plate, left), "corridor", "swipe left: the room to the right comes in");
  near(left.zoom, range.closeUp);
  assert.equal(swipeTarget(inLab, phone, plate, 0.1, -1), null, "upright, both floors already show: nothing to page to");
  const sideLab = onRoom(sideways, plate, "lab4", zoomRange(sideways, plate).closeUp)!;
  assert.equal(roomInView(plate, swipeTarget(sideLab, sideways, plate, 0.1, -1)!), "security", "on its side, swipe up: the floor below comes up");
  assert.equal(roomInView(plate, swipeTarget(inLab, phone, plate, 1, 0)!), "office", "swipe right: the office comes in");
  const inOffice = onRoom(phone, plate, "office", range.closeUp)!;
  assert.equal(swipeTarget(inOffice, phone, plate, 1, 0), null, "nothing west of the office: it just glides to the edge");
  assert.equal(swipeTarget(inLab, phone, plate, -(SWIPE_MIN * 0.8), 0), null, "a slow fling only glides");
  const whole = wholeBuilding(phone, plate);
  assert.equal(swipeTarget(whole, phone, plate, -2, 0), null, "zoomed out, the picture glides freely");
  // Pinched in nearer than the close-up: paging keeps that zoom.
  const nearer = { ...inLab, zoom: range.max };
  near(swipeTarget(nearer, phone, plate, -1, 0)!.zoom, range.max);
});

test("let go of a pinch past halfway out and the camera settles on the whole building", () => {
  const range = zoomRange(phone, plate);
  const half = Math.sqrt(range.min * range.closeUp);
  const out = { x: 1600, y: 800, zoom: half * 0.9 };
  assert.deepEqual(pinchSettle(out, phone, plate), wholeBuilding(phone, plate));
  assert.equal(pinchSettle({ ...out, zoom: half * 1.1 }, phone, plate), null, "not past halfway: it stays put");
  assert.equal(pinchSettle(wholeBuilding(phone, plate), phone, plate), null, "already all the way out");
});
