// Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { worldOf } from "./plates.ts";
import { floorSpan, nearest, stairsFrom, type Reachable } from "./steer.ts";

const plate = worldOf("case-001")!;

test("walking with keys: each floor runs end to end through its open doors, off the walls", () => {
  assert.deepEqual(floorSpan(plate, { x: 900, z: 306 }), { x0: 38, x1: 2046 }, "the office, Lab 4, the corridor and the kitchen");
  assert.deepEqual(floorSpan(plate, { x: 1300, z: 6 }), { x0: 38, x1: 3066 }, "the maker space, the security office, the lobby and outside");
  assert.equal(floorSpan(plate, { x: 1300, z: 150 }), null, "halfway up the stairs is no floor");
});

test("the stairs: up from the lobby's foot, down from the corridor's top, and only near them", () => {
  const up = stairsFrom(plate, { x: 1088, z: 6 }, 1);
  assert.ok(up, "the foot of the stairs is by the lobby's left wall");
  assert.deepEqual(up![0], [1078, 6]);
  assert.deepEqual(up!.at(-1), [1078, 306]);
  assert.equal(stairsFrom(plate, { x: 1088, z: 6 }, -1), null, "nothing goes down from the ground floor");
  const down = stairsFrom(plate, { x: 1078, z: 306 }, -1);
  assert.deepEqual(down!.at(-1), [1078, 6]);
  assert.equal(stairsFrom(plate, { x: 1408, z: 6 }, 1), null, "too far from the stairs");
});

test("what's in reach: the nearest thing on your own floor, within arm's length", () => {
  const things: Reachable[] = [
    { kind: "spot", id: "laptop", x: 837, room: "lab4", label: "Priya's laptop" },
    { kind: "person", id: "priya", x: 908, room: "lab4", label: "Priya" },
    { kind: "spot", id: "printer", x: 202, room: "maker", label: "The 3D printers" },
  ];
  assert.equal(nearest(plate, { x: 898, z: 306 }, things)?.id, "priya");
  assert.equal(nearest(plate, { x: 848, z: 306 }, things)?.id, "laptop");
  assert.equal(nearest(plate, { x: 202, z: 306 }, things), null, "the printers are downstairs");
  assert.equal(nearest(plate, { x: 1308, z: 306 }, things), null);
  // Standing between a person and a machine, the machine wins unless the person is much closer.
  const lobby: Reachable[] = [
    { kind: "person", id: "squires", x: 1578, room: "lobby", label: "Squires" },
    { kind: "job", id: "penalty-ozzy", x: 1620, room: "lobby", label: "Ozzy's phone" },
  ];
  assert.equal(nearest(plate, { x: 1593, z: 6 }, lobby)?.id, "penalty-ozzy");
  assert.equal(nearest(plate, { x: 1568, z: 6 }, lobby)?.id, "squires");
});
