// Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { castOf, shortName, stickerOf, stickersFor } from "./cast.ts";
import { CHARACTER_SCALE, drawOrder, fromPlate, outlineBox, personAt, roomAt, roomBox, spriteOf, toPlate } from "./geometry.ts";
import { worldOf } from "./plates.ts";

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
  assert.ok(Math.abs(priya.scale * 560 - priya.box.h) < 1e-9);
  assert.ok(Math.abs(priya.box.w / priya.box.h - 400 / 560) < 1e-9);
  const sam = spriteOf(plate, person("sam"));
  assert.ok(Math.abs(sam.box.h - 220 * 0.8 * 2) < 1e-9, "the detectives are a little shorter");
});

test("the cast is the board's eight, each on a tile of the twelve and inside the building's world", () => {
  assert.equal(plate.people.length, 8);
  assert.equal(new Set(plate.people.map((p) => p.id)).size, 8);
  assert.equal(plate.people.filter((p) => p.detective).length, 4);
  for (const p of plate.people) {
    assert.ok(Number.isInteger(p.tile) && p.tile >= 0 && p.tile < 12, p.id);
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
  assert.deepEqual(outlineBox(plate, plate.occluders[0].outline), { x: 1256, y: 1253, w: 460, h: 295 });
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
  assert.deepEqual(cast.priya, { id: "priya", tag: "Priya", name: "Priya Tran", line: "PhD researcher", blurb: "Built HALO.", me: false });
  assert.deepEqual(cast.jo, { id: "jo", tag: "Ana", name: "Ana (you)", line: "Tech · Photographer", blurb: null, me: true });
  assert.equal(cast.ali.tag, "Bo");
  assert.equal(cast.sam.tag, null, "nobody wears Sam's sticker in a two-player game");
  assert.equal(cast.squires, undefined, "a suspect missing from the view isn't named");
  assert.deepEqual(castOf(plate.people, null), {});
});
