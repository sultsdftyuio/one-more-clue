/**
 * Walking your own detective with keys or on-screen buttons: how far along their floor they can go, which stairs
 * they're standing at, and what's within reach to use. Pure, so `node --test` covers it.
 */
import type { Spot } from "./geometry.ts";
import type { WorldPlate } from "./plates.ts";

/** How close (cm along the floor) something has to be to use it, or stairs to take them. */
export const REACH_CM = 80;
export const STAIRS_CM = 60;
/** How far in from a floor's ends someone can walk, so they never stand in the wall. */
const MARGIN = 30;

/** The floor someone standing at `at` is on: the rooms whose floor line they stand on. */
function floorOf(plate: Pick<WorldPlate, "rooms">, at: Spot) {
  const here = plate.rooms.find((r) => at.x >= r.x0 - 30 && at.x <= r.x1 + 30 && Math.abs(at.z - 6 - r.z0) < 30);
  return here ? plate.rooms.filter((r) => r.z0 === here.z0) : [];
}

/** How far left and right someone can walk on their floor (doors between rooms on a floor are open). */
export function floorSpan(plate: Pick<WorldPlate, "rooms">, at: Spot): { x0: number; x1: number } | null {
  const floor = floorOf(plate, at);
  if (!floor.length) return null;
  return { x0: Math.min(...floor.map((r) => r.x0)) + MARGIN, x1: Math.max(...floor.map((r) => r.x1)) - MARGIN };
}

/**
 * Stairs (or any link that changes floor) whose end on this floor is near: up (`dir` 1) or down (-1). Returns the
 * walk from here, starting at the near end, or null.
 */
export function stairsFrom(plate: Pick<WorldPlate, "links">, at: Spot, dir: 1 | -1): [number, number][] | null {
  for (const link of plate.links) {
    const a = link.path[0];
    const b = link.path[link.path.length - 1];
    if (Math.abs(a[1] - b[1]) < 50) continue;
    for (const [near, far, path] of [
      [a, b, link.path],
      [b, a, [...link.path].reverse()],
    ] as const) {
      if (Math.abs(near[1] - at.z) > 30 || Math.abs(near[0] - at.x) > STAIRS_CM) continue;
      if (Math.sign(far[1] - near[1]) !== dir) continue;
      return path.map(([x, z]) => [x, z] as [number, number]);
    }
  }
  return null;
}

/** Something that can be used where it stands: a spot, a side job or a person. */
export type Reachable = { kind: "spot" | "job" | "person"; id: string; x: number; room: string | null; label: string };

/** Things count as this much nearer than people, so standing by a person and a machine, E uses the machine. */
export const OBJECT_BIAS_CM = 30;

/** The nearest thing within reach on your floor, or null. Objects and side jobs win a close call with a person. */
export function nearest(plate: Pick<WorldPlate, "rooms">, at: Spot, things: Reachable[]): Reachable | null {
  const floor = new Set(floorOf(plate, at).map((r) => r.id));
  let best: { thing: Reachable; d: number } | null = null;
  for (const thing of things) {
    if (!thing.room || !floor.has(thing.room)) continue;
    const reach = Math.abs(thing.x - at.x);
    if (reach > REACH_CM) continue;
    const d = reach - (thing.kind === "person" ? 0 : OBJECT_BIAS_CM);
    if (!best || d < best.d) best = { thing, d };
  }
  return best?.thing ?? null;
}
