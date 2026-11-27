// Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { case001 } from "../../data/cases/case-001.ts";
import { case001Building } from "../../data/cases/case-001.building.ts";
import { createRoom, rewindFor } from "../game/engine.ts";
import type { RoomState } from "../game/types.ts";
import { along, ghostsAt, route, walkPath, type RewindSighting } from "./rewind.ts";

const building = case001Building;
/** Case 001's whole night, as a team that has seen every piece would know it. */
function wholeNight() {
  const state: RoomState = { ...createRoom({ code: "R", caseFile: case001, host: { id: "p1", token: "t", name: "A" }, mode: "together", now: 0 }), phase: "reveal", world: true };
  return rewindFor(state, case001)!;
}
const at = (map: ReturnType<typeof wholeNight>, time: string) => {
  const [h, m] = time.split(":").map(Number);
  return (h + 12) * 60 + m - (20 * 60 + 30); // minutes after 8:30 PM
};

test("the building's routes go through its doors and stairs", () => {
  assert.deepEqual(route(building, "lab4", "outside"), ["lab4", "corridor", "lobby", "outside"]);
  assert.deepEqual(route(building, "maker", "lab4"), ["maker", "security", "lobby", "corridor", "lab4"]);
  assert.equal(route(building, "lab4", "home"), null, "nowhere off the plate");
  const path = walkPath(building, "lab4", "lobby")!;
  assert.deepEqual(path[0], { x: 786, z: 306 }, "from the middle of Lab 4");
  assert.deepEqual(path.at(-1), { x: 1358, z: 6 }, "to the middle of the lobby");
  assert.ok(path.some((p) => p.z > 100 && p.z < 300), "down the stairs on the way");
  assert.deepEqual(along([{ x: 0, z: 0 }, { x: 100, z: 0 }], 0.25), { x: 25, z: 0 });
});

test("at 8:45 Priya is seen in the lobby on her way out, and her story has her gone home just after", () => {
  const map = wholeNight();
  const { ghosts } = ghostsAt(map.sightings, building, at(map, "8:45"));
  const priya = ghosts.filter((g) => g.who === "triangle");
  assert.deepEqual(priya.map((g) => [g.room, g.says]), [["lobby", false]]);
  assert.equal(priya[0].z, 6, "standing on the ground floor");
  const later = ghostsAt(map.sightings, building, at(map, "9:00"));
  assert.ok(!later.ghosts.some((g) => g.who === "triangle"));
  assert.ok(later.elsewhere.some((e) => e.who === "triangle" && e.room === "home" && e.says), "her own story: gone home");
});

test("at 9:10 Rena is seen in Lab 4 while the stories put her outside and at home: the clash shows as two places", () => {
  const map = wholeNight();
  const { ghosts, elsewhere } = ghostsAt(map.sightings, building, at(map, "9:10"));
  const rena = ghosts.filter((g) => g.who === "rectangle").map((g) => [g.room, g.says]);
  assert.deepEqual(rena.sort(), [["lab4", false], ["outside", true]]);
  assert.ok(elsewhere.some((e) => e.who === "rectangle" && e.room === "home"));
  // HALO: on its dock in Lab 4 (seen), though the edited message says it went home.
  assert.ok(ghosts.some((g) => g.who === "halo" && g.room === "lab4" && !g.says));
  assert.ok(elsewhere.some((e) => e.who === "halo" && e.room === "home" && e.says));
});

test("ghosts only walk in the last minutes before a sighting close behind the last; longer gaps stay foggy", () => {
  const s = (id: string, room: string, from: number, to: number): RewindSighting => ({ id, who: "x", room, from, to, says: false, weight: 3, evidence: id, title: id });
  const close = [s("a", "lab4", 0, 10), s("b", "lobby", 13, 20)];
  const mid = ghostsAt(close, building, 11.5).ghosts;
  assert.equal(mid.length, 1);
  assert.ok(mid[0].walking && mid[0].evidence === "b");
  assert.ok(mid[0].z < 306 && mid[0].z > 6 || mid[0].room !== "lab4", "on the way, not still in Lab 4");
  const far = [s("a", "lab4", 0, 10), s("b", "lobby", 30, 40)];
  assert.deepEqual(ghostsAt(far, building, 20).ghosts, [], "a 20-minute gap is fog, not a guess");
  // Two in one room stand apart.
  const two = [s("a", "lab4", 0, 10), { ...s("c", "lab4", 0, 10), who: "y" }];
  const [g1, g2] = ghostsAt(two, building, 5).ghosts;
  assert.ok(Math.abs(g1.x - g2.x) > 100);
});
