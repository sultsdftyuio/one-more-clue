/**
 * Where things sit on a world plate: centimetres to plate pixels, characters' sprites from their feet,
 * and what a tap lands on. Pure, so `node --test` covers it.
 */
import type { WorldPerson, WorldPlate } from "./plates.ts";

/** Characters are drawn at 80% of the mockup's first size: the owner's pick (CS in art/mockups/case001/boards.py). */
export const CHARACTER_SCALE = 0.8;

/** One tile of a sprite atlas, in px (art/mockups/case001/sprites.py). */
export const TILE = { w: 400, h: 560 };

/** How far down its tile a character's feet are. */
export const FEET = 0.926;

/** A tile's height in cm at the mockup's size: the detectives are a little shorter than the suspects. */
const TILE_CM = { suspect: 235.5, detective: 220 };

/** Plate pixels for a world point (x right, z up). */
export function toPlate(plate: WorldPlate, x: number, z: number) {
  return { x: (x - plate.extent.x0) * plate.pxPerCm, y: (plate.extent.z1 - z) * plate.pxPerCm };
}

/** The world point for plate pixels. */
export function fromPlate(plate: WorldPlate, px: number, py: number) {
  return { x: px / plate.pxPerCm + plate.extent.x0, z: plate.extent.z1 - py / plate.pxPerCm };
}

/** A room's rectangle in plate pixels. */
export function roomBox(plate: WorldPlate, room: { x0: number; x1: number; z0: number; z1: number }) {
  const a = toPlate(plate, room.x0, room.z1);
  const b = toPlate(plate, room.x1, room.z0);
  return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
}

/**
 * The whole-pixel box around an outline, in plate pixels. scripts/world-assets.py cuts
 * occluders out of the plate with the same rounding, so the cut-out lands exactly here.
 */
export function outlineBox(plate: WorldPlate, outline: [number, number][]) {
  const points = outline.map(([x, z]) => toPlate(plate, x, z));
  const x0 = Math.floor(Math.min(...points.map((p) => p.x)));
  const y0 = Math.floor(Math.min(...points.map((p) => p.y)));
  const x1 = Math.ceil(Math.max(...points.map((p) => p.x)));
  const y1 = Math.ceil(Math.max(...points.map((p) => p.y)));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/**
 * A character's sprite on the plate: `feet` is where the sprite's origin goes (origin 0.5, FEET),
 * `scale` turns the atlas tile into plate pixels, and `box` is the whole tile.
 */
export function spriteOf(plate: WorldPlate, person: WorldPerson) {
  const feet = toPlate(plate, person.x, person.z);
  const h = (person.detective ? TILE_CM.detective : TILE_CM.suspect) * CHARACTER_SCALE * plate.pxPerCm;
  const w = (h * TILE.w) / TILE.h;
  return { feet, scale: h / TILE.h, box: { x: feet.x - w / 2, y: feet.y - FEET * h, w, h } };
}

/**
 * The order to draw people in, back to front: whoever stands behind furniture first (the occluders
 * go over them), then everyone else, each group in the plate's own order.
 */
export function drawOrder(plate: WorldPlate): WorldPerson[] {
  return [...plate.people.filter((p) => p.behind), ...plate.people.filter((p) => !p.behind)];
}

/** Whether world point (x, z) is inside an outline (even-odd rule). */
export function insideOutline(outline: [number, number][], x: number, z: number) {
  let inside = false;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const [xi, zi] = outline[i];
    const [xj, zj] = outline[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Who a tap at plate point (px, py) lands on: the front-most person whose body contains it.
 * `slop` widens each body by that many plate pixels, since fingers are bigger than the art.
 * Someone behind furniture can't be tapped through it.
 */
export function personAt(plate: WorldPlate, px: number, py: number, slop = 0): string | null {
  const point = fromPlate(plate, px, py);
  const hidden = plate.occluders.some((o) => insideOutline(o.outline, point.x, point.z));
  const people = drawOrder(plate);
  for (let i = people.length - 1; i >= 0; i--) {
    const person = people[i];
    if (person.behind && hidden) continue;
    const { feet, box } = spriteOf(plate, person);
    // The tile has air around the body: keep the middle of it, from the hat down to the feet.
    const left = box.x + box.w * 0.18 - slop;
    const right = box.x + box.w * 0.82 + slop;
    const top = box.y + box.h * 0.04 - slop;
    const bottom = feet.y + slop;
    if (px >= left && px <= right && py >= top && py <= bottom) return person.id;
  }
  return null;
}

/** Which room a world point is in, if any. */
export function roomAt(plate: WorldPlate, x: number, z: number): string | null {
  return plate.rooms.find((r) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1)?.id ?? null;
}
