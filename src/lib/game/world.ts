/**
 * The checks on a case's world (its painted building), run by checkCase. The world has to agree with the case:
 * every room of the night is in it, every record sits somewhere a player can reach, people stand in their rooms,
 * and side jobs and sore spots only point at things that exist. See "The world" in docs/case-system.md.
 */
import { parseTime } from "./clock.ts";
import type { CaseFile, WorldBox } from "./types.ts";

/** Evidence bodies that are things in the world (a log on a device, a sheet, a photo). Statements are people, findings live in other pieces. */
const RECORDS = new Set(["chat", "log", "document", "scene", "footage", "recording"]);

const inside = (box: WorldBox, x: number, z: number) => x >= box.x0 && x <= box.x1 && z >= box.z0 && z <= box.z1;

export function checkWorld(caseFile: CaseFile): string[] {
  const world = caseFile.world;
  if (!world) return [];
  const problems: string[] = [];
  const evidence = new Map(caseFile.evidence.map((e) => [e.id, e]));
  const suspects = new Set(caseFile.suspects.map((s) => s.id));
  const coreRoles = new Set(caseFile.roles.filter((r) => r.core).map((r) => r.id));
  const rooms = new Map(world.rooms.map((r) => [r.id, r]));
  const floors = new Map(world.floors.map((f) => [f.id, f]));
  const spots = new Map(world.spots.map((s) => [s.id, s]));
  const unique = (what: string, ids: string[]) => {
    if (new Set(ids).size !== ids.length) problems.push(`world ${what} ids are not unique`);
  };
  unique("room", world.rooms.map((r) => r.id));
  unique("floor", world.floors.map((f) => f.id));
  unique("spot", world.spots.map((s) => s.id));
  unique("side job", world.sideJobs.map((j) => j.id));

  // The plate: its pixels cover its extent exactly.
  const { plate } = world;
  if (!plate.layers.length) problems.push("the world has no painted layers");
  const span = { w: (plate.extent.x1 - plate.extent.x0) * plate.pxPerCm, h: (plate.extent.z1 - plate.extent.z0) * plate.pxPerCm };
  if (Math.abs(span.w - plate.size.w) > 0.5 || Math.abs(span.h - plate.size.h) > 0.5) {
    problems.push(`the plate is ${plate.size.w} × ${plate.size.h} px, but its extent at ${plate.pxPerCm} px per cm is ${span.w} × ${span.h}`);
  }

  // Rooms: on the plate, standing on a floor; away rooms off it.
  const boxes: { id: string; box: WorldBox }[] = [];
  for (const room of world.rooms) {
    if (room.kind === "away") {
      if (room.box || room.floor) problems.push(`world room "${room.id}" is away, so it has no box or floor`);
      continue;
    }
    const floor = room.floor ? floors.get(room.floor) : undefined;
    if (!room.box) {
      problems.push(`world room "${room.id}" is in the building but has no box`);
      continue;
    }
    if (!floor) problems.push(`world room "${room.id}" is on a floor that doesn't exist`);
    else if (room.box.z0 !== floor.z) problems.push(`world room "${room.id}" doesn't stand on its floor (z ${room.box.z0}, floor at ${floor.z})`);
    const b = room.box;
    if (b.x0 >= b.x1 || b.z0 >= b.z1) problems.push(`world room "${room.id}" has an empty box`);
    if (b.x0 < plate.extent.x0 || b.x1 > plate.extent.x1 || b.z0 < plate.extent.z0 || b.z1 > plate.extent.z1) problems.push(`world room "${room.id}" runs off the plate`);
    for (const other of boxes) {
      if (b.x0 < other.box.x1 && other.box.x0 < b.x1 && b.z0 < other.box.z1 && other.box.z0 < b.z1) problems.push(`world rooms "${other.id}" and "${room.id}" overlap`);
    }
    boxes.push({ id: room.id, box: b });
  }

  // The map of the night: every room is in the world, as the same kind of place, and every sighting is somewhere real.
  const map = caseFile.nightMap;
  for (const r of map?.rooms ?? []) {
    const room = rooms.get(r.id);
    const kind = r.away ? "away" : r.outdoor ? "outside" : "inside";
    if (!room) problems.push(`the map of the night's room "${r.id}" isn't in the world`);
    else if (room.kind !== kind) problems.push(`world room "${r.id}" is ${room.kind}, but the map of the night has it ${kind}`);
  }
  for (const s of map?.sightings ?? []) {
    if (!rooms.has(s.room)) problems.push(`a sighting of "${s.who}" (${s.evidence}) is in "${s.room}", which isn't in the world`);
  }

  // Links: between rooms in the building, walking from one into the other, and joining them all up.
  const linked = new Map<string, string[]>();
  for (const link of world.links) {
    const a = rooms.get(link.from);
    const b = rooms.get(link.to);
    const name = `the ${link.kind} from "${link.from}" to "${link.to}"`;
    if (!a?.box || !b?.box) {
      problems.push(`${name} joins a room that isn't in the building`);
      continue;
    }
    if (link.path.length < 2) problems.push(`${name} needs a path of at least two points`);
    else {
      const [x0, z0] = link.path[0];
      const [x1, z1] = link.path[link.path.length - 1];
      if (!inside(a.box, x0, z0)) problems.push(`${name} doesn't start inside "${link.from}"`);
      if (!inside(b.box, x1, z1)) problems.push(`${name} doesn't end inside "${link.to}"`);
    }
    linked.set(link.from, [...(linked.get(link.from) ?? []), link.to]);
    linked.set(link.to, [...(linked.get(link.to) ?? []), link.from]);
  }
  const walkable = world.rooms.filter((r) => r.kind !== "away" && r.box).map((r) => r.id);
  if (walkable.length) {
    const reached = new Set([walkable[0]]);
    for (const queue = [walkable[0]]; queue.length; ) {
      for (const next of linked.get(queue.shift()!) ?? []) {
        if (!reached.has(next)) {
          reached.add(next);
          queue.push(next);
        }
      }
    }
    for (const id of walkable) if (!reached.has(id)) problems.push(`world room "${id}" can't be reached from "${walkable[0]}" through any door, stairs, lift or gate`);
  }

  // Spots: in a room in the building, opening real evidence for the roles it belongs to.
  for (const spot of world.spots) {
    const room = rooms.get(spot.room);
    if (!room?.box) problems.push(`spot "${spot.id}" is in "${spot.room}", which isn't a room in the building`);
    else if (!inside(room.box, spot.x, spot.z)) problems.push(`spot "${spot.id}" isn't inside "${spot.room}"`);
    for (const role of spot.roles ?? []) if (!coreRoles.has(role)) problems.push(`spot "${spot.id}" opens for "${role}", which isn't a core role`);
    for (const id of spot.evidence ?? []) {
      const e = evidence.get(id);
      if (!e) problems.push(`spot "${spot.id}" holds "${id}", which doesn't exist`);
      else if (!(spot.roles ?? []).includes(e.role)) problems.push(`spot "${spot.id}" holds "${id}", but doesn't open for its role "${e.role}"`);
    }
  }
  const placed = new Set(world.spots.flatMap((s) => s.evidence ?? []));
  for (const [id, where] of Object.entries(world.elsewhere ?? {})) {
    if (!evidence.has(id)) problems.push(`"${id}" is elsewhere, but doesn't exist`);
    if (placed.has(id)) problems.push(`"${id}" is both at a spot and elsewhere`);
    if (!where.trim()) problems.push(`"${id}" is elsewhere, but doesn't say where`);
  }
  for (const e of caseFile.evidence) {
    if (!coreRoles.has(e.role) || !RECORDS.has(e.body.type)) continue;
    if (!placed.has(e.id) && !world.elsewhere?.[e.id]) problems.push(`"${e.id}" has no spot in the world (or put it in \`elsewhere\`)`);
  }

  // People: every suspect waits in a room in the building, on its floor.
  for (const id of suspects) if (!world.people[id]) problems.push(`suspect "${id}" isn't anywhere in the world`);
  for (const [id, p] of Object.entries(world.people)) {
    if (!suspects.has(id)) problems.push(`"${id}" stands in the world but isn't a suspect`);
    const room = rooms.get(p.room);
    if (!room?.box) problems.push(`suspect "${id}" waits in "${p.room}", which isn't a room in the building`);
    else if (!inside(room.box, p.x, p.z)) problems.push(`suspect "${id}" isn't inside "${p.room}"`);
  }

  // Side jobs and sore spots.
  for (const job of world.sideJobs) {
    if (!job.game.trim()) problems.push(`side job "${job.id}" has no game`);
    if (!spots.has(job.spot)) problems.push(`side job "${job.id}" starts at "${job.spot}", which isn't a spot`);
    if (job.help === "sore-spot") {
      if (!job.suspect || !suspects.has(job.suspect)) problems.push(`side job "${job.id}" wins a sore spot, but names no suspect`);
    } else if (job.suspect) problems.push(`side job "${job.id}" names a suspect, but only a sore spot is about someone`);
  }
  for (const id of suspects) if (!world.soreSpots[id]) problems.push(`suspect "${id}" has no sore spot: every suspect needs one, innocent ones too`);
  for (const [id, sore] of Object.entries(world.soreSpots)) {
    if (!suspects.has(id)) problems.push(`sore spot for "${id}", who isn't a suspect`);
    if (!sore.topic.trim()) problems.push(`suspect "${id}"'s sore spot has no topic`);
    if (!sore.about.length) problems.push(`suspect "${id}"'s sore spot doesn't say what evidence it comes from`);
    for (const e of sore.about) if (!evidence.has(e)) problems.push(`suspect "${id}"'s sore spot comes from "${e}", which doesn't exist`);
  }

  // Ambience.
  try {
    parseTime(world.ambience.time);
  } catch {
    problems.push(`the world's clock time "${world.ambience.time}" can't be read`);
  }
  for (const id of Object.keys(world.ambience.lights)) if (!rooms.get(id)?.box) problems.push(`the lights are set for "${id}", which isn't a room in the building`);
  return problems;
}

