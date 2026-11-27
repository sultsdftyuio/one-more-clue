import type { CaseWorld } from "@/lib/game/types";

/**
 * Case 001's building as anyone may see it: the plate, floors, rooms, the ways between them, where the suspects
 * wait, and the weather. It's safe in the browser (the world screen draws from it). What a spot holds, the side
 * jobs and the sore spots stay in case-001.world.ts, which only the server reads.
 *
 * Numbers come from the painter's manifest (art/world/world.json, painted by art/world/world.py) at 2 px per cm.
 * Since 2026-11-27 the building is two floors of four: the professor's office, Lab 4, the corridor and the staff
 * kitchen upstairs; the maker space, the security office and the lobby downstairs, then the covered entrance under
 * the kitchen and the car park.
 */
export const case001Building: Pick<CaseWorld, "plate" | "floors" | "rooms" | "links" | "people" | "ambience"> = {
  plate: {
    // Two tiles cut on the wall between the corridor and the kitchen (scripts/world-assets.py): no phone has to hold
    // a texture wider than 4096 px.
    layers: ["plate-0.webp", "plate-1.webp"],
    tiles: [
      { x: 0, w: 3456 },
      { x: 3456, w: 2864 },
    ],
    extent: { x0: -60, x1: 3100, z0: -70, z1: 780 },
    pxPerCm: 2,
    size: { w: 6320, h: 1700 },
  },
  floors: [
    { id: "ground", name: "Ground floor", z: 0 },
    { id: "first", name: "First floor", z: 300 },
  ],
  rooms: [
    { id: "office", name: "Prof. Squires's office", kind: "inside", floor: "first", box: { x0: 8, x1: 516, z0: 300, z1: 580 } },
    { id: "lab4", name: "Lab 4", kind: "inside", floor: "first", box: { x0: 532, x1: 1040, z0: 300, z1: 580 } },
    { id: "corridor", name: "Corridor", kind: "inside", floor: "first", box: { x0: 1056, x1: 1660, z0: 300, z1: 580 } },
    { id: "kitchen", name: "Staff kitchen", kind: "inside", floor: "first", box: { x0: 1676, x1: 2076, z0: 300, z1: 580 } },
    { id: "maker", name: "Maker space", kind: "inside", floor: "ground", box: { x0: 8, x1: 516, z0: 0, z1: 280 } },
    { id: "security", name: "Security office", kind: "inside", floor: "ground", box: { x0: 532, x1: 1040, z0: 0, z1: 280 } },
    { id: "lobby", name: "Lobby", kind: "inside", floor: "ground", box: { x0: 1056, x1: 1660, z0: 0, z1: 280 } },
    // From the glass doors: the covered entrance under the kitchen, the car park and the North Gate.
    { id: "outside", name: "Outside", kind: "outside", floor: "ground", box: { x0: 1682, x1: 3096, z0: 0, z1: 300 } },
    { id: "home", name: "Gone home", kind: "away" },
    { id: "kestrel", name: "Kestrel HQ", kind: "away" },
  ],
  links: [
    // Upstairs, west to east: the professor's door at Lab 4's far end, Lab 4's door (folded back against the
    // corridor wall), then the staff kitchen's door at the corridor's end.
    {
      from: "office",
      to: "lab4",
      kind: "door",
      path: [
        [504, 306],
        [544, 306],
      ],
    },
    {
      from: "lab4",
      to: "corridor",
      kind: "door",
      path: [
        [1028, 306],
        [1068, 306],
      ],
    },
    {
      from: "corridor",
      to: "kitchen",
      kind: "door",
      path: [
        [1648, 306],
        [1688, 306],
      ],
    },
    // The switchback stairs against the lobby's back wall: top, landing, foot.
    {
      from: "corridor",
      to: "lobby",
      kind: "stairs",
      path: [
        [1078, 306],
        [1064, 306],
        [1156, 156],
        [1064, 6],
        [1078, 6],
      ],
    },
    // Downstairs: the maker space (closed for the night) opens into the security office, which opens into the lobby
    // behind reception.
    {
      from: "maker",
      to: "security",
      kind: "door",
      path: [
        [504, 6],
        [544, 6],
      ],
    },
    {
      from: "security",
      to: "lobby",
      kind: "door",
      path: [
        [1028, 6],
        [1068, 6],
      ],
    },
    // The main door, under the EXIT sign, out under the canopy to the car park.
    {
      from: "lobby",
      to: "outside",
      kind: "door",
      path: [
        [1648, 6],
        [1698, 6],
      ],
    },
  ],
  people: {
    triangle: { room: "lab4", x: 908, z: 306, mood: "idle" },
    rectangle: { room: "corridor", x: 1408, z: 306, mood: "idle" },
    circle: { room: "lobby", x: 1356, z: 55, mood: "idle" },
    square: { room: "lobby", x: 1578, z: 6, mood: "idle" },
  },
  ambience: {
    weather: "rain",
    time: "12:40 AM",
    lights: {
      office: "dim",
      lab4: "on",
      corridor: "on",
      kitchen: "on",
      maker: "off",
      security: "dim",
      lobby: "on",
      outside: "dim",
    },
  },
};
