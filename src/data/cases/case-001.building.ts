import type { CaseWorld } from "@/lib/game/types";

/**
 * Case 001's building as anyone may see it: the plate, floors, rooms, the ways between them, where the suspects
 * wait, and the weather. It's safe in the browser (the world screen draws from it). What a spot holds, the side
 * jobs and the sore spots stay in case-001.world.ts, which only the server reads.
 *
 * Numbers come from the painter's manifest (art/world/world.json, painted by art/world/world.py) at 2 px per cm.
 */
export const case001Building: Pick<CaseWorld, "plate" | "floors" | "rooms" | "links" | "people" | "ambience"> = {
  plate: {
    layers: ["plate.webp"],
    extent: { x0: -60, x1: 1560, z0: -70, z1: 780 },
    pxPerCm: 2,
    size: { w: 3240, h: 1700 },
  },
  floors: [
    { id: "ground", name: "Ground floor", z: 0 },
    { id: "first", name: "First floor", z: 300 },
  ],
  rooms: [
    {
      id: "lab4",
      name: "Lab 4",
      kind: "inside",
      floor: "first",
      box: { x0: 8, x1: 432, z0: 300, z1: 580 },
    },
    {
      id: "maker",
      name: "Maker space",
      kind: "inside",
      floor: "ground",
      box: { x0: 8, x1: 432, z0: 0, z1: 280 },
    },
    {
      id: "corridor",
      name: "Corridor",
      kind: "inside",
      floor: "first",
      box: { x0: 448, x1: 952, z0: 300, z1: 580 },
    },
    {
      id: "lobby",
      name: "Lobby",
      kind: "inside",
      floor: "ground",
      box: { x0: 448, x1: 952, z0: 0, z1: 280 },
    },
    {
      id: "outside",
      name: "Outside",
      kind: "outside",
      floor: "ground",
      box: { x0: 974, x1: 1556, z0: 0, z1: 300 },
    },
    { id: "home", name: "Gone home", kind: "away" },
    { id: "kestrel", name: "Kestrel HQ", kind: "away" },
  ],
  links: [
    // Lab 4's door, folded back against the corridor wall (lab_door in the manifest).
    {
      from: "lab4",
      to: "corridor",
      kind: "door",
      path: [
        [420, 306],
        [460, 306],
      ],
    },
    // The switchback stairs against the lobby's back wall: top, landing, foot.
    {
      from: "corridor",
      to: "lobby",
      kind: "stairs",
      path: [
        [470, 306],
        [456, 306],
        [548, 156],
        [456, 6],
        [470, 6],
      ],
    },
    // Not painted yet: the maker space is closed for the night, but its door opens off the lobby.
    {
      from: "maker",
      to: "lobby",
      kind: "door",
      path: [
        [420, 6],
        [460, 6],
      ],
    },
    // The main door, under the EXIT sign, out to the car park.
    {
      from: "lobby",
      to: "outside",
      kind: "door",
      path: [
        [940, 6],
        [990, 6],
      ],
    },
  ],
  people: {
    triangle: { room: "lab4", x: 300, z: 306, mood: "idle" },
    rectangle: { room: "corridor", x: 800, z: 306, mood: "idle" },
    circle: { room: "lobby", x: 748, z: 55, mood: "idle" },
    square: { room: "lobby", x: 870, z: 6, mood: "idle" },
  },
  // The eight games from the mockups' "Side mini-games" rows.
  ambience: {
    weather: "rain",
    time: "12:40 AM",
    lights: {
      lab4: "on",
      corridor: "on",
      lobby: "on",
      maker: "off",
      outside: "dim",
    },
  },
};
