/**
 * The painted buildings the world can open, as the world scene draws them. The rooms, the plate's size and where
 * each suspect stands come from the case's own `world` section (src/data/cases/<case>.world.ts); this adds what
 * only the drawing needs: sprite tiles, the detectives, idle timing and the furniture people stand behind.
 * The pictures live in src/assets/world/<case>/ (scripts/world-assets.py).
 *
 * World units are centimetres: x runs left to right, z runs up from the ground floor.
 * No React, no Phaser and no `@/` imports, so `node --test` can load it.
 */
import { case001World } from "../../data/cases/case-001.world.ts";
import type { CaseWorld } from "../game/types.ts";

export type WorldRoom = {
  id: string;
  name: string;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
};

/** Someone standing in the building: their feet at (x, z), drawn with one tile of the case's sprite atlas. */
export type WorldPerson = {
  id: string;
  /** Tile of the sprite atlas, in the order of art/mockups/case001/sprites.py. */
  tile: number;
  x: number;
  z: number;
  /** One of the four detectives (players wear these), rather than a suspect. */
  detective?: boolean;
  /** The case's suspect id, for suspects. */
  suspect?: string;
  /** Stands behind the furniture in `occluders`, so it's drawn before them. */
  behind?: boolean;
  /** Start of this person's idle bob, in seconds, so the cast doesn't breathe in step. */
  delay: number;
};

/** A piece of furniture cut out of the plate (scripts/world-assets.py) and drawn over the people behind it. */
export type WorldOccluder = {
  id: string;
  /** The outline in world cm, as the painter's manifest gives it. */
  outline: [number, number][];
};

export type WorldPlate = {
  caseId: string;
  /** What the building is, for screen readers: the canvas itself has no text. */
  label: string;
  /** The world the plate covers, in cm. */
  extent: { x0: number; x1: number; z0: number; z1: number };
  /** Plate pixels per cm. */
  pxPerCm: number;
  /** The painted plate's size in px. */
  size: { w: number; h: number };
  rooms: WorldRoom[];
  people: WorldPerson[];
  occluders: WorldOccluder[];
};

/** The rooms in the building (away rooms aren't on the plate), and the plate's size, from the case's world. */
function fromWorld(world: CaseWorld) {
  const rooms = world.rooms.flatMap((r) => (r.box ? [{ id: r.id, name: r.name, ...r.box }] : []));
  return { extent: world.plate.extent, pxPerCm: world.plate.pxPerCm, size: world.plate.size, rooms };
}

/** Where a suspect waits, from the case's world. */
const standing = (world: CaseWorld, suspect: string) => {
  const { x, z } = world.people[suspect];
  return { suspect, x, z };
};

const case001: WorldPlate = {
  caseId: "case-001",
  label:
    "The Halden Innovation Building at night, cut open: Lab 4 above the dark maker space, the corridor above the lobby and its stairs, and the car park and North Gate outside in the rain.",
  ...fromWorld(case001World),
  // Back to front, as the "001 · Close-up" board draws them. Ozzy stands behind the security desk:
  // the board lowers him so his head still clears it at 80% size (115 - 75 × 0.8).
  people: [
    { id: "mei", tile: 9, x: 165, z: 306, detective: true, delay: 0.2 },
    { id: "priya", tile: 0, ...standing(case001World, "triangle"), delay: 0.9 },
    { id: "jo", tile: 11, x: 388, z: 306, detective: true, delay: 1.4 },
    { id: "sam", tile: 8, x: 630, z: 306, detective: true, delay: 0.5 },
    { id: "rena", tile: 6, ...standing(case001World, "rectangle"), delay: 1.1 },
    { id: "ozzy", tile: 4, ...standing(case001World, "circle"), behind: true, delay: 1.7 },
    { id: "ali", tile: 10, x: 600, z: 6, detective: true, delay: 0.3 },
    { id: "squires", tile: 2, ...standing(case001World, "square"), delay: 1.0 },
  ],
  occluders: [
    {
      id: "desk",
      outline: [
        [568, 6],
        [797.6, 6],
        [797.6, 94.8],
        [784, 113.2],
        [730.4, 113.2],
        [730.4, 133.2],
        [711.2, 133.2],
        [709.6, 113.2],
        [709.6, 144.4],
        [706.4, 150.8],
        [695.2, 150.8],
        [692, 144.4],
        [692, 113.2],
        [666.4, 113.2],
        [666.4, 153.2],
        [606.4, 153.2],
        [606.4, 113.2],
        [577.6, 113.2],
        [568, 94.8],
      ],
    },
  ],
};

const WORLDS: Record<string, WorldPlate> = { [case001.caseId]: case001 };

/** The case's painted building, or null while it has none. */
export const worldOf = (caseId: string): WorldPlate | null => WORLDS[caseId] ?? null;

/** Only cases with a painted building can open a world room. */
export const hasWorld = (caseId: string) => Boolean(worldOf(caseId));
