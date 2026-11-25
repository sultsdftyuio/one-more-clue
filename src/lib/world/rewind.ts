/**
 * The rewind's ghosts (W4.1): where the evidence the team has puts each suspect (or thing, like HALO) at a minute of
 * the night, placed in the building. Pure and tested, so the scene only draws what this says.
 *
 * Ground rule 1 of docs/world-overhaul.md: ghosts only walk where found evidence puts them. So:
 * - a sighting covering the minute puts a ghost in that room: solid if a record, camera or witness saw them, an
 *   outline if it's only someone's story ("says");
 * - two sightings at once in different rooms give two ghosts, which is how a clash shows (W4.4);
 * - between sightings the night stays foggy (no ghost), except a short walk along the building's doors and stairs
 *   in the last few minutes before the next sighting, when the two are close together;
 * - rooms off the plate (gone home, across town) aren't drawn in the building; they're listed as elsewhere.
 *
 * No React, no Phaser and no `@/` imports, so `node --test` can load it.
 */

/** What the rewind needs from a sighting (engine.ts's MapSighting has these and more). */
export type RewindSighting = { id: string; who: string; room: string; from: number; to: number; says: boolean; weight: number; evidence: string; title: string };

/** What it needs from the building: rooms with their boxes and floors, and the ways between them. */
export type RewindBuilding = {
  rooms: { id: string; name: string; kind: "inside" | "outside" | "away"; box?: { x0: number; x1: number; z0: number; z1: number } }[];
  links: { from: string; to: string; path: [number, number][] }[];
};

export type Ghost = {
  who: string;
  room: string;
  /** Feet, in world cm. */
  x: number;
  z: number;
  says: boolean;
  /** The piece that puts them here (for a walk, the one they're walking towards). */
  evidence: string;
  title: string;
  /** On their way between two sightings. */
  walking: boolean;
};

export type Elsewhere = { who: string; room: string; name: string; says: boolean; evidence: string };

/** Sightings this close together (minutes) get a walk between them; further apart, the gap stays foggy. */
export const WALK_GAP = 4;
/** Ghosts stand on the floor like the living: feet 6 cm up. */
const FEET = 6;

type Point = { x: number; z: number };

/** The rooms passed through from one room to another over the links (fewest doors), or null if there's no way. */
export function route(building: RewindBuilding, from: string, to: string): string[] | null {
  if (from === to) return [from];
  const seen = new Map<string, string>([[from, ""]]);
  const queue = [from];
  while (queue.length) {
    const here = queue.shift()!;
    for (const link of building.links) {
      const next = link.from === here ? link.to : link.to === here ? link.from : null;
      if (!next || seen.has(next)) continue;
      seen.set(next, here);
      if (next === to) {
        const path = [to];
        for (let r = here; r; r = seen.get(r)!) path.unshift(r);
        return path;
      }
      queue.push(next);
    }
  }
  return null;
}

/** The walk from the middle of one room to the middle of another, through the links' own paths, as points. */
export function walkPath(building: RewindBuilding, from: string, to: string): Point[] | null {
  const rooms = route(building, from, to);
  if (!rooms) return null;
  const middle = (id: string): Point | null => {
    const box = building.rooms.find((r) => r.id === id)?.box;
    return box ? { x: (box.x0 + box.x1) / 2, z: box.z0 + FEET } : null;
  };
  const start = middle(from);
  const end = middle(to);
  if (!start || !end) return null;
  const points: Point[] = [start];
  for (let i = 0; i < rooms.length - 1; i++) {
    const link = building.links.find((l) => (l.from === rooms[i] && l.to === rooms[i + 1]) || (l.to === rooms[i] && l.from === rooms[i + 1]))!;
    const path = link.from === rooms[i] ? link.path : [...link.path].reverse();
    for (const [x, z] of path) points.push({ x, z });
  }
  points.push(end);
  return points;
}

/** The point a share `f` (0 to 1) of the way along a path, by distance. */
export function along(points: Point[], f: number): Point {
  const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.z - points[i].z));
  const total = lengths.reduce((a, b) => a + b, 0);
  let left = Math.min(1, Math.max(0, f)) * total;
  for (let i = 0; i < lengths.length; i++) {
    if (left <= lengths[i] || i === lengths.length - 1) {
      const k = lengths[i] ? Math.min(1, left / lengths[i]) : 0;
      return { x: points[i].x + (points[i + 1].x - points[i].x) * k, z: points[i].z + (points[i + 1].z - points[i].z) * k };
    }
    left -= lengths[i];
  }
  return points[points.length - 1];
}

/** Where the team's evidence puts everyone at `minute` of the night: ghosts in the building, and who is elsewhere. */
export function ghostsAt(sightings: RewindSighting[], building: RewindBuilding, minute: number): { ghosts: Ghost[]; elsewhere: Elsewhere[] } {
  const roomOf = new Map(building.rooms.map((r) => [r.id, r]));
  const placed: (Omit<Ghost, "x" | "z"> & { at?: Point })[] = [];
  const elsewhere: Elsewhere[] = [];
  const people = [...new Set(sightings.map((s) => s.who))];

  for (const who of people) {
    const mine = sightings.filter((s) => s.who === who).sort((a, b) => a.from - b.from);
    const now = mine.filter((s) => s.from <= minute && minute <= s.to);
    if (now.length) {
      // One ghost per room they're put in; within a room the surest piece wins (seen beats a crack beats a story).
      const byRoom = new Map<string, RewindSighting>();
      for (const s of now) if (!byRoom.has(s.room) || s.weight > byRoom.get(s.room)!.weight) byRoom.set(s.room, s);
      for (const s of byRoom.values()) {
        const room = roomOf.get(s.room);
        if (!room) continue;
        if (!room.box) elsewhere.push({ who, room: room.id, name: room.name, says: s.says, evidence: s.evidence });
        else placed.push({ who, room: room.id, says: s.says, evidence: s.evidence, title: s.title, walking: false });
      }
      continue;
    }
    // Between sightings: a walk only in the last few minutes before the next one, and only when they're close.
    const before = mine.filter((s) => s.to < minute).sort((a, b) => b.to - a.to)[0];
    const next = mine.find((s) => s.from > minute);
    if (!before || !next || next.from - before.to > WALK_GAP || before.room === next.room) continue;
    const path = walkPath(building, before.room, next.room);
    if (!path) continue;
    const at = along(path, (minute - before.to) / (next.from - before.to));
    const room = building.rooms.find((r) => r.box && at.x >= r.box.x0 - 20 && at.x <= r.box.x1 + 20 && at.z >= r.box.z0 - 20 && at.z <= r.box.z1)?.id ?? next.room;
    placed.push({ who, room, says: before.says && next.says, evidence: next.evidence, title: next.title, walking: true, at });
  }

  // Standing ghosts spread across their room so they don't stand in each other; walkers are where their walk is.
  const ghosts: Ghost[] = placed.map((g) => {
    if (g.at) {
      const { at, ...rest } = g;
      return { ...rest, x: at.x, z: at.z };
    }
    const box = roomOf.get(g.room)!.box!;
    const here = placed.filter((o) => o.room === g.room && !o.at);
    const k = here.indexOf(g);
    const share = here.length === 1 ? 0.5 : 0.22 + (0.56 * k) / (here.length - 1);
    return { who: g.who, room: g.room, says: g.says, evidence: g.evidence, title: g.title, walking: false, x: box.x0 + (box.x1 - box.x0) * share, z: box.z0 + FEET };
  });
  return { ghosts, elsewhere };
}
