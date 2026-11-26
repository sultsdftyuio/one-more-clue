// Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { worldOf } from "./plates.ts";
import { floorSpan, nearest, stairsFrom, type Reachable } from "./steer.ts";

const plate = worldOf("case-001")!;

test("walking with keys: each floor runs end to end through its open doors, off the walls", () => {
  assert.deepEqual(floorSpan(plate, { x: 300, z: 306 }), { x0: 38, x1: 922 }, "Lab 4 and the corridor");
  assert.deepEqual(floorSpan(plate, { x: 700, z: 6 }), { x0: 38, x1: 1526 }, "the maker space, the lobby and outside");
  assert.equal(floorSpan(plate, { x: 700, z: 150 }), null, "halfway up the stairs is no floor");
});

test("the stairs: up from the lobby's foot, down from the corridor's top, and only near them", () => {
  const up = stairsFrom(plate, { x: 480, z: 6 }, 1);
  assert.ok(up, "the foot of the stairs is by the lobby's left wall");
  assert.deepEqual(up![0], [470, 6]);
  assert.deepEqual(up!.at(-1), [470, 306]);
  assert.equal(stairsFrom(plate, { x: 480, z: 6 }, -1), null, "nothing goes down from the ground floor");
  const down = stairsFrom(plate, { x: 470, z: 306 }, -1);
  assert.deepEqual(down!.at(-1), [470, 6]);
  assert.equal(stairsFrom(plate, { x: 800, z: 6 }, 1), null, "too far from the stairs");
});

test("what's in reach: the nearest thing on your own floor, within arm's length", () => {
  const things: Reachable[] = [
    { kind: "spot", id: "laptop", x: 229, room: "lab4", label: "Priya's laptop" },
    { kind: "person", id: "priya", x: 300, room: "lab4", label: "Priya" },
    { kind: "spot", id: "printer", x: 118, room: "maker", label: "The 3D printers" },
  ];
  assert.equal(nearest(plate, { x: 290, z: 306 }, things)?.id, "priya");
  assert.equal(nearest(plate, { x: 240, z: 306 }, things)?.id, "laptop");
  assert.equal(nearest(plate, { x: 118, z: 306 }, things), null, "the printers are downstairs");
  assert.equal(nearest(plate, { x: 700, z: 306 }, things), null);
  // Standing between a person and a machine, the machine wins unless the person is much closer.
  const lobby: Reachable[] = [
    { kind: "person", id: "squires", x: 870, room: "lobby", label: "Squires" },
    { kind: "job", id: "coffee-run", x: 912, room: "lobby", label: "The drinks machine" },
  ];
  assert.equal(nearest(plate, { x: 885, z: 6 }, lobby)?.id, "coffee-run");
  assert.equal(nearest(plate, { x: 860, z: 6 }, lobby)?.id, "squires");
});
