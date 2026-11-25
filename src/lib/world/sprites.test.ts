// Run with: npm test
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { worldOf } from "./plates.ts";
import { FRAMES, frameOf, MOODS, PER_SHEET, poseAt, SHEET_GAP, SHEETS, STEP_MS, TILE, WALK_CYCLE } from "./sprites.ts";

const plate = worldOf("case-001")!;

test("the sheets hold exactly the frames the painter drew, in its order", () => {
  const drawn = JSON.parse(readFileSync("art/world/cast.json", "utf8")) as { tile: [number, number]; gap: number; perSheet: number; frames: [string, string][] };
  assert.deepEqual(FRAMES, drawn.frames);
  assert.deepEqual([TILE.w, TILE.h], drawn.tile);
  assert.equal(SHEET_GAP, drawn.gap);
  assert.equal(PER_SHEET, drawn.perSheet);
  for (let i = 0; i < SHEETS; i++) assert.ok(existsSync(`src/assets/world/case-001/cast-${i}.webp`), `sheet ${i}`);
  // Six across and four down a 2048 px sheet, with the gaps.
  assert.ok(SHEET_GAP + 6 * (TILE.w + SHEET_GAP) <= 2048 && SHEET_GAP + 4 * (TILE.h + SHEET_GAP) <= 2048);
});

test("every suspect is drawn in all five moods, and everyone in the building can stand and walk", () => {
  for (const person of plate.people) {
    for (const pose of ["idle", ...WALK_CYCLE] as const) assert.ok(frameOf(person.id, pose), `${person.id} ${pose}`);
    if (person.suspect) for (const mood of MOODS) assert.ok(frameOf(person.id, mood), `${person.id} ${mood}`);
  }
  // A detective has no moods of their own: they stay as they are.
  assert.deepEqual(frameOf("sam", "shocked"), frameOf("sam", "idle"));
  assert.equal(frameOf("nobody", "idle"), null);
});

test("standing shows the mood; walking plays wide stance, left foot up, wide stance, right foot up", () => {
  assert.equal(poseAt("nervous", null), "nervous");
  const steps = [0, 1, 2, 3, 4].map((n) => poseAt("idle", n * STEP_MS + 1));
  assert.deepEqual(steps, ["walk-a", "walk-b", "walk-a", "walk-c", "walk-a"]);
  assert.equal(poseAt("smug", 0), "walk-a", "a walk starts in the wide stance, whatever the mood");
});
