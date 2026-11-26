// Run with: npm test
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { castOf, shortName, stickerOf, stickersFor } from "./cast.ts";
import { CHARACTER_SCALE, drawOrder, fromPlate, lightAt, outlineBox, personAt, roomAt, roomBox, spriteOf, toPlate, walkTarget } from "./geometry.ts";
import { worldOf } from "./plates.ts";
import { frameOf } from "./sprites.ts";
import { case001World } from "../../data/cases/case-001.world.ts";

const plate = worldOf("case-001")!;
const person = (id: string) => plate.people.find((p) => p.id === id)!;

test("the plate covers the world from x −60 to 1560 cm and z −70 to 780 cm at 2 px per cm", () => {
  assert.deepEqual(toPlate(plate, -60, 780), { x: 0, y: 0 });
  assert.deepEqual(toPlate(plate, 1560, -70), { x: 3240, y: 1700 });
  assert.deepEqual(fromPlate(plate, 3240, 1700), { x: 1560, z: -70 });
  const p = toPlate(plate, 432.5, 17.25);
  assert.deepEqual(fromPlate(plate, p.x, p.y), { x: 432.5, z: 17.25 });
  assert.deepEqual(roomBox(plate, plate.rooms.find((r) => r.id === "lab4")!), { x: 136, y: 400, w: 848, h: 560 });
});

test("characters stand on their feet at 80% of the mockup's size", () => {
  assert.equal(CHARACTER_SCALE, 0.8);
  const priya = spriteOf(plate, person("priya"));
  assert.deepEqual(priya.feet, toPlate(plate, 300, 306));
  assert.ok(Math.abs(priya.box.h - 235.5 * 0.8 * 2) < 1e-9, "a suspect's tile is 188.4 cm tall");
  assert.ok(Math.abs(priya.scale * 420 - priya.box.h) < 1e-9, "tiles are 300 x 420");
  assert.ok(Math.abs(priya.box.w / priya.box.h - 400 / 560) < 1e-9);
  const sam = spriteOf(plate, person("sam"));
  assert.ok(Math.abs(sam.box.h - 220 * 0.8 * 2) < 1e-9, "the detectives are a little shorter");
});

test("the cast is the board's eight, each on a tile of the twelve and inside the building's world", () => {
  assert.equal(plate.people.length, 8);
  assert.equal(new Set(plate.people.map((p) => p.id)).size, 8);
  assert.equal(plate.people.filter((p) => p.detective).length, 4);
  for (const p of plate.people) {
    assert.ok(frameOf(p.id, p.mood ?? "idle"), `${p.id} has a picture`);
    assert.ok(roomAt(plate, p.x, p.z), `${p.id} stands in a room`);
    assert.ok(Boolean(p.detective) !== Boolean(p.suspect), `${p.id} is a detective or a suspect`);
  }
  assert.equal(drawOrder(plate)[0].id, "ozzy", "whoever is behind the desk is drawn before it");
});

test("a tap lands on the person under it, not through the desk, and not on empty air", () => {
  const at = (id: string, up: number) => {
    const { feet, box } = spriteOf(plate, person(id));
    return [feet.x, feet.y - box.h * up] as const;
  };
  assert.equal(personAt(plate, ...at("priya", 0.5)), "priya");
  assert.equal(personAt(plate, ...at("squires", 0.3)), "squires");
  assert.equal(personAt(plate, ...at("ozzy", 0.8)), "ozzy", "his head shows over the desk");
  const desk = toPlate(plate, 748, 60);
  assert.equal(personAt(plate, desk.x, desk.y), null, "his legs are behind the desk");
  const sky = toPlate(plate, 1200, 700);
  assert.equal(personAt(plate, sky.x, sky.y), null);
  // Between Mei (x 165) and Priya (x 300): just left of Priya's body.
  const beside = toPlate(plate, 250, 400);
  assert.equal(personAt(plate, beside.x, beside.y), null);
  assert.equal(personAt(plate, beside.x, beside.y, 20), "priya", "fingers get some slack");
});

test("the desk cut-out sits on whole pixels, as the asset script cuts it", () => {
  assert.deepEqual(outlineBox(plate, plate.occluders.find((o) => o.id === "desk")!.outline), { x: 1256, y: 1253, w: 460, h: 295 });
});

test("the front layer is the painter's: every piece of furniture in front.json, cut out and in its room", () => {
  const front = JSON.parse(readFileSync("art/world/front.json", "utf8")) as Record<string, { room: string; outline: [number, number][] }>;
  assert.deepEqual(plate.occluders.map((o) => o.id).sort(), Object.keys(front).sort());
  for (const o of plate.occluders) {
    assert.deepEqual(o.outline, front[o.id].outline, o.id);
    assert.ok(existsSync(`src/assets/world/case-001/front/${o.id}.webp`), `${o.id} has its cut-out`);
    const [cx, cz] = [o.outline.reduce((a, p) => a + p[0], 0) / o.outline.length, o.outline.reduce((a, p) => a + p[1], 0) / o.outline.length];
    assert.equal(roomAt(plate, cx, cz), front[o.id].room, `${o.id} stands in its room`);
  }
});

test("someone behind the lab bench is drawn before it and can't be tapped through it, but shows above it", () => {
  const behind = { ...plate, people: [...plate.people, { id: "ghost", x: 90, z: 306, suspect: "triangle", behind: true, delay: 0 }] };
  const order = drawOrder(behind).map((p) => p.id);
  assert.ok(order.indexOf("ghost") < order.indexOf("priya"), "behind people come first, so the furniture goes over them");
  const knees = toPlate(behind, 90, 360);
  assert.equal(personAt(behind, knees.x, knees.y), null, "the bench is in the way");
  const head = toPlate(behind, 90, 470);
  assert.equal(personAt(behind, head.x, head.y), "ghost", "above the bench, they're tappable");
});

test("players wear detectives by seat in the lobby, then by their first role", () => {
  const lobby = [0, 1, 2, 3].map((seat) => ({ id: `p${seat}`, roles: [] as string[], seat }));
  assert.deepEqual(Object.fromEntries(Object.entries(stickersFor(lobby)).map(([s, p]) => [s, p.id])), { sam: "p0", mei: "p1", ali: "p2", jo: "p3" });

  const dealt = [
    { id: "a", roles: ["tech", "photographer"], seat: 0 },
    { id: "b", roles: ["interviewer", "archivist"], seat: 1 },
  ];
  assert.equal(stickerOf(dealt, "a"), "jo");
  assert.equal(stickerOf(dealt, "b"), "ali");
  const crowd = [...lobby, { id: "p4", roles: [], seat: 4 }];
  assert.equal(stickerOf(crowd, "p4"), null, "only four stickers");
  const lateSeat = [{ id: "x", roles: [], seat: 7 }];
  assert.equal(stickerOf(lateSeat, "x"), "sam", "an odd seat still gets a free sticker");
});

test("name tags use first names, or the surname after a title", () => {
  assert.equal(shortName("Priya Tran"), "Priya");
  assert.equal(shortName("Prof. Edmund Squires"), "Squires");
  assert.equal(shortName("  Ozzy  "), "Ozzy");
});

test("the cast names the suspects from the case and the detectives from the players", () => {
  const view = {
    me: { id: "a" },
    players: [
      { id: "a", name: "Ana", roles: ["tech", "photographer"], seat: 0 },
      { id: "b", name: "Bo", roles: ["interviewer", "archivist"], seat: 1 },
    ],
    case: {
      suspects: [{ id: "triangle", name: "Priya Tran", role: "PhD researcher", blurb: "Built HALO." }],
      roles: [
        { id: "tech", name: "Tech" },
        { id: "photographer", name: "Photographer" },
        { id: "interviewer", name: "Interviewer" },
        { id: "archivist", name: "Archivist" },
      ],
    },
  };
  const cast = castOf(plate.people, view);
  assert.deepEqual(cast.priya, { id: "priya", tag: "Priya", name: "Priya Tran", line: "PhD researcher", blurb: "Built HALO.", me: false, suspect: "triangle" });
  assert.deepEqual(cast.jo, { id: "jo", tag: "Ana", name: "Ana (you)", line: "Tech · Photographer", blurb: null, me: true });
  assert.equal(cast.ali.tag, "Bo");
  assert.equal(cast.sam.tag, null, "nobody wears Sam's sticker in a two-player game");
  assert.equal(cast.squires, undefined, "a suspect missing from the view isn't named");
  assert.deepEqual(castOf(plate.people, null), {});
});

test("people take on their room's light, and white outside every room", () => {
  for (const room of plate.rooms) assert.equal(lightAt(plate, (room.x0 + room.x1) / 2, room.z0 + 6), room.light, room.id);
  assert.equal(lightAt(plate, 440, 306), 0xffffff, "in the wall between Lab 4 and the corridor");
  assert.ok(plate.rooms.every((r) => r.light !== undefined));
});

test("a tap on your floor walks you there, kept off the end walls; other floors are out of reach for now", () => {
  const sam = { x: 630, z: 306 }; // in the corridor, upstairs
  assert.equal(walkTarget(plate, sam, 800, 400), 800);
  assert.equal(walkTarget(plate, sam, 200, 330), 200, "through the open door into Lab 4");
  assert.equal(walkTarget(plate, sam, 0, 330), 8 + 30, "not into Lab 4's far wall");
  assert.equal(walkTarget(plate, sam, 940, 330), 952 - 30);
  assert.equal(walkTarget(plate, sam, 700, 100), null, "the lobby is downstairs");
  const ali = { x: 600, z: 6 }; // in the lobby
  assert.equal(walkTarget(plate, ali, 1200, 100), 1200, "out of the main door into the car park");
  assert.equal(walkTarget(plate, ali, 100, 50), 100, "into the maker space");
});

test("someone who has walked is drawn, and tapped, where they are now", () => {
  const sam = person("sam");
  const moved = { x: 900, z: 306 };
  assert.deepEqual(spriteOf(plate, sam, moved).feet, toPlate(plate, 900, 306));
  const body = toPlate(plate, 900, 380);
  assert.equal(personAt(plate, body.x, body.y, 0, { sam: moved }), "sam");
  const old = toPlate(plate, 630, 380);
  assert.notEqual(personAt(plate, old.x, old.y, 0, { sam: moved }), "sam", "not where they used to be");
});

test("no spot covers someone standing in the building, so tapping a person never opens a tool instead", () => {
  for (const spot of case001World.spots) {
    const p = toPlate(plate, spot.x, spot.z);
    // A spot's button is 44 CSS px; at the close-up (0.5 CSS px per plate px) that's 88 plate px across.
    for (const [dx, dy] of [[0, 0], [-40, 0], [40, 0], [0, -40], [0, 40]]) {
      assert.equal(personAt(plate, p.x + dx, p.y + dy), null, `${spot.id} sits on someone`);
    }
  }
});

test("the building's small motions sit where the painting has them, and rain stays out of the rooms", () => {
  const a = plate.ambience;
  const onPlate = (x: number, z: number) => x >= plate.extent.x0 && x <= plate.extent.x1 && z >= plate.extent.z0 && z <= plate.extent.z1;
  for (const p of [...a.leds, ...a.steam, ...a.clocks]) assert.ok(onPlate(p.x, p.z), JSON.stringify(p));
  for (const c of a.clocks) assert.ok(roomAt(plate, c.x, c.z), "clocks hang inside rooms");
  for (const w of a.windows) assert.ok(roomAt(plate, (w.x0 + w.x1) / 2, (w.z0 + w.z1) / 2), "windows are in rooms");
  if (a.flicker) assert.equal(roomAt(plate, a.flicker.x, a.flicker.z - 10), a.flicker.room);
  // Rain areas never cover an inside room.
  for (const r of a.rain) {
    for (const room of plate.rooms.filter((x) => x.id !== "outside")) {
      const overlap = r.x0 < room.x1 && room.x0 < r.x1 && r.z0 < room.z1 && room.z0 < r.z1;
      assert.ok(!overlap, `rain over ${room.id}`);
    }
  }
});
