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
import type { Mood } from "./sprites.ts";

export type WorldRoom = {
  id: string;
  name: string;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  /** The colour of the room's light, as a tint for the people in it (0xRRGGBB; white leaves them as drawn). */
  light: number;
};

/** Someone standing in the building: their feet at (x, z), drawn with one tile of the case's sprite atlas. */
export type WorldPerson = {
  id: string;
  x: number;
  z: number;
  /** One of the four detectives (players wear these), rather than a suspect. */
  detective?: boolean;
  /** The case's suspect id, for suspects. */
  suspect?: string;
  /** How a suspect looks while standing, from the case's world; detectives are always "idle". */
  mood?: Mood;
  /** Stands behind the furniture in `occluders`, so it's drawn before them. */
  behind?: boolean;
  /** Start of this person's idle bob, in seconds, so the cast doesn't breathe in step. */
  delay: number;
};

/** A piece of furniture cut out of the plate (scripts/world-assets.py) and drawn over the people behind it. */
export type WorldOccluder = {
  id: string;
  /**
   * The outline in world cm (art/world/front.json). Its box is the cut-out's, and a tap inside it can't reach
   * anyone standing behind. For most pieces it's the whole box, so a tap between a bench's legs counts as the bench.
   */
  outline: [number, number][];
};

/**
 * The small things that move in a painted building (W2.5), in world cm. All of it is decoration: nothing here is a
 * clue, and it all holds still for players who ask their device for less motion.
 */
export type WorldAmbience = {
  /** Where rain falls: open air only, never inside. */
  rain: { x0: number; x1: number; z0: number; z1: number }[];
  /** Window glass that rain runs down. */
  windows: { x0: number; x1: number; z0: number; z1: number }[];
  /** Little lights that blink: a colour, and how many seconds between blinks. */
  leds: { x: number; z: number; colour: number; every: number }[];
  /** A strip light that stutters now and then, and the room it dims when it does. */
  flicker: { x: number; z: number; w: number; room: string } | null;
  /** Where steam rises from (a hot drink). */
  steam: { x: number; z: number }[];
  /** Wall clocks: a red second hand goes round on each. */
  clocks: { x: number; z: number; r: number }[];
  /** The sky band clouds drift through, slower than the building when the camera pans. */
  clouds: { z0: number; z1: number } | null;
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
  ambience: WorldAmbience;
};

/** The rooms in the building (away rooms aren't on the plate) and the plate's size, from the case's world, with each room's light. */
function fromWorld(world: CaseWorld, lights: Record<string, number>) {
  const rooms = world.rooms.flatMap((r) => (r.box ? [{ id: r.id, name: r.name, ...r.box, light: lights[r.id] ?? 0xffffff }] : []));
  return { extent: world.plate.extent, pxPerCm: world.plate.pxPerCm, size: world.plate.size, rooms };
}

/** Where a suspect waits and how they look, from the case's world. */
const standing = (world: CaseWorld, suspect: string) => {
  const { x, z, mood } = world.people[suspect];
  return { suspect, x, z, mood };
};

const case001: WorldPlate = {
  caseId: "case-001",
  label:
    "The Halden Innovation Building at night, cut open: Lab 4 above the dark maker space, the corridor above the lobby and its stairs, and the car park and North Gate outside in the rain.",
  // Each room's light on the people in it, picked from the painter's lamps (LIGHTS in art/world/world.py) and kept
  // gentle: Lab 4's cool strip lights, the dark blue of the maker space at night, the corridor's and lobby's warm
  // bulbs, and moonlight outside.
  ...fromWorld(case001World, { lab4: 0xeef2ff, maker: 0x8f9ad0, corridor: 0xfff1df, lobby: 0xffedd6, outside: 0xb3c0ea }),
  // Back to front, as the "001 · Close-up" board draws them. Ozzy stands behind the security desk:
  // the board lowers him so his head still clears it at 80% size (115 - 75 × 0.8).
  people: [
    { id: "mei", x: 165, z: 306, detective: true, delay: 0.2 },
    { id: "priya", ...standing(case001World, "triangle"), delay: 0.9 },
    { id: "jo", x: 388, z: 306, detective: true, delay: 1.4 },
    { id: "sam", x: 630, z: 306, detective: true, delay: 0.5 },
    { id: "rena", ...standing(case001World, "rectangle"), delay: 1.1 },
    { id: "ozzy", ...standing(case001World, "circle"), behind: true, delay: 1.7 },
    { id: "ali", x: 600, z: 6, detective: true, delay: 0.3 },
    { id: "squires", ...standing(case001World, "square"), delay: 1.0 },
  ],
  // The furniture people can stand behind: art/world/front.json, which a test keeps this the same as. Each one is
  // drawn over whoever stands behind it, from src/assets/world/case-001/front/<id>.webp (scripts/world-assets.py).
  // The desk's outline is its real shape; the others are their boxes, and their pictures carry the exact shape.
  occluders: [
    { id: "desk", outline: [[568, 6], [797.6, 6], [797.6, 94.8], [784, 113.2], [730.4, 113.2], [730.4, 133.2], [711.2, 133.2], [709.6, 113.2], [709.6, 144.4], [706.4, 150.8], [695.2, 150.8], [692, 144.4], [692, 113.2], [666.4, 113.2], [666.4, 153.2], [606.4, 153.2], [606.4, 113.2], [577.6, 113.2], [568, 94.8]] },
    { id: "lab-bench", outline: [[7.5, 305.5], [402.5, 305.5], [402.5, 452.5], [7.5, 452.5]] },
    { id: "lab-chair", outline: [[375.5, 306.5], [432.5, 306.5], [432.5, 418.5], [375.5, 418.5]] },
    { id: "printer-bench", outline: [[39.5, 6], [196.5, 6], [196.5, 124.5], [39.5, 124.5]] },
    { id: "stool", outline: [[221.5, 6], [250.5, 6], [250.5, 68.5], [221.5, 68.5]] },
    { id: "laser-cutter", outline: [[281.5, 5.5], [378.5, 5.5], [378.5, 102.5], [281.5, 102.5]] },
    { id: "corridor-bench", outline: [[699.5, 306], [820.5, 306], [820.5, 352.5], [699.5, 352.5]] },
    { id: "water-cooler", outline: [[903.5, 305.5], [936.5, 305.5], [936.5, 444.5], [903.5, 444.5]] },
  ],
  // Measured on the plate (art/world/world.py): the rain outside and over the roof, Lab 4's and the maker space's
  // windows, the badge readers, the printers, the roof antenna and the gate camera, the corridor's right-hand strip
  // light, Ozzy's flask on the desk, and the two wall clocks.
  ambience: {
    rain: [
      { x0: 974, x1: 1560, z0: -70, z1: 780 },
      { x0: -60, x1: 974, z0: 668, z1: 780 },
    ],
    windows: [
      { x0: 127, x1: 230, z0: 437, z1: 530 },
      { x0: 56, x1: 158, z0: 120, z1: 230 },
    ],
    leds: [
      { x: 529, z: 436, colour: 0x3dd68c, every: 2.4 },
      { x: 945, z: 130, colour: 0x3dd68c, every: 2.9 },
      { x: 83, z: 83, colour: 0x7fb2ff, every: 1.3 },
      { x: 131, z: 83, colour: 0x7fb2ff, every: 1.7 },
      { x: 179, z: 83, colour: 0x7fb2ff, every: 1.1 },
      { x: 880, z: 772, colour: 0xff3a3a, every: 2.0 },
      { x: 1332, z: 324, colour: 0xff3a3a, every: 3.3 },
    ],
    flicker: { x: 890, z: 575, w: 120, room: "corridor" },
    steam: [{ x: 701, z: 154 }],
    clocks: [
      { x: 312, z: 544, r: 17 },
      { x: 768, z: 532, r: 11 },
    ],
    clouds: { z0: 690, z1: 775 },
  },
};

const WORLDS: Record<string, WorldPlate> = { [case001.caseId]: case001 };

/** The case's painted building, or null while it has none. */
export const worldOf = (caseId: string): WorldPlate | null => WORLDS[caseId] ?? null;

/** Only cases with a painted building can open a world room. */
export const hasWorld = (caseId: string) => Boolean(worldOf(caseId));
