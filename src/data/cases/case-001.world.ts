import type { CaseWorld } from "@/lib/game/types";

/**
 * Case 001's building: the Halden Innovation Building at 12:40 AM, cut open. Lab 4 sits above the dark maker
 * space, the corridor above the lobby and its stairs; the car park and the North Gate are outside in the rain.
 *
 * Numbers come from the painter's manifest (art/world/world.json, painted by art/world/world.py) at 2 px per cm.
 * Spots the plate doesn't paint yet, to add in W2.1/W2.4: the door from the lobby into the maker space, the
 * lobby camera and the corridor's fuse cupboard.
 *
 * Nothing here may hint past the case file (docs/world-overhaul.md, rule 4): spots sit where their record is,
 * every suspect waits somewhere plain in a plain mood, and each one has a sore spot, the culprit no more than anyone.
 */
export const case001World: CaseWorld = {
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
  spots: [
    // Lab 4
    {
      id: "laptop",
      name: "Priya's laptop",
      room: "lab4",
      x: 228.8,
      z: 431.8,
      kind: "device",
      evidence: ["lab-chat", "device-log", "chat-history"],
      roles: ["archivist", "tech"],
    },
    {
      id: "cabinet",
      name: "Cabinet B",
      room: "lab4",
      x: 78.7,
      z: 473,
      kind: "object",
      evidence: ["dock-log", "asset-register"],
      roles: ["tech"],
    },
    {
      id: "lab-view",
      name: "Lab 4, as the photos saw it",
      room: "lab4",
      // Up by the lab clock, which both photos show, clear of anyone standing in the lab.
      x: 255,
      z: 530,
      kind: "view",
      evidence: ["photo-linkedin", "photo-incident"],
      roles: ["photographer"],
    },
    // Corridor
    {
      id: "lab-reader",
      name: "Lab 4's badge reader",
      room: "corridor",
      x: 529,
      z: 429,
      kind: "device",
      evidence: ["badge-log"],
      roles: ["tech"],
    },
    // Lobby
    {
      id: "lobby-reader",
      name: "The main door's badge reader",
      room: "lobby",
      x: 945.2,
      z: 122,
      kind: "device",
      evidence: ["badge-log"],
      roles: ["tech"],
    },
    {
      id: "security-desk",
      name: "The security desk",
      room: "lobby",
      // The key board and rounds rota on the wall behind the desk, between Ali and Ozzy.
      x: 672,
      z: 215,
      kind: "device",
      evidence: ["visitor-sheet", "guard-tour"],
      roles: ["archivist", "tech"],
    },
    {
      id: "lobby-camera",
      name: "The lobby camera",
      room: "lobby",
      x: 930,
      z: 265,
      kind: "device",
      evidence: ["cctv-lobby"],
      roles: ["tech"],
    },
    // Outside: the North Gate's number-plate camera.
    {
      id: "anpr",
      name: "The North Gate camera",
      room: "outside",
      x: 1392,
      z: 280,
      kind: "device",
      evidence: ["anpr"],
      roles: ["tech"],
    },
    // Side jobs
    {
      id: "drinks-machine",
      name: "The drinks machine",
      room: "lobby",
      // Up the front of the machine, over Squires's head.
      x: 912,
      z: 225,
      kind: "sidejob",
    },
    {
      id: "ozzy-phone",
      name: "Ozzy's phone",
      room: "lobby",
      // On the desk's front panel: Ozzy stands behind it, so his head and the phone stay tappable.
      x: 690,
      z: 50,
      kind: "sidejob",
    },
    {
      id: "flask",
      name: "The flask on the desk",
      room: "lobby",
      // On the desk's front panel, clear of Squires.
      x: 765,
      z: 50,
      kind: "sidejob",
    },
    {
      id: "printer",
      name: "The 3D printers",
      room: "maker",
      x: 118,
      z: 80,
      kind: "sidejob",
    },
    {
      id: "fuse-cupboard",
      name: "The fuse cupboard",
      room: "corridor",
      x: 930,
      z: 420,
      kind: "sidejob",
    },
    {
      id: "priya-bench",
      name: "Priya's stool",
      room: "lab4",
      // In the gap between Mei and Priya.
      x: 230,
      z: 340,
      kind: "sidejob",
    },
    {
      id: "breadboard",
      name: "The breadboard",
      room: "lab4",
      // At the bench's left end, by the cutting mat, clear of Mei.
      x: 95,
      z: 395,
      kind: "sidejob",
    },
  ],
  elsewhere: {
    "kestrel-staff": "Kestrel Dynamics' own website",
    "northgate-email": "the professor's inbox, on his phone",
  },
  // Where everyone waits at 12:40 AM, as the "001 · Close-up" board stands them. Ozzy is behind the security desk.
  people: {
    triangle: { room: "lab4", x: 300, z: 306, mood: "idle" },
    rectangle: { room: "corridor", x: 800, z: 306, mood: "idle" },
    circle: { room: "lobby", x: 748, z: 55, mood: "idle" },
    square: { room: "lobby", x: 870, z: 6, mood: "idle" },
  },
  // The eight games from the mockups' "Side mini-games" rows.
  sideJobs: [
    {
      id: "coffee-run",
      game: "coffee-run",
      spot: "drinks-machine",
      help: "coffee",
    },
    {
      id: "penalty-ozzy",
      game: "penalty",
      spot: "ozzy-phone",
      help: "sore-spot",
      suspect: "circle",
    },
    {
      id: "lights-out",
      game: "lights-out",
      spot: "fuse-cupboard",
      help: "lightbulb",
      event: true,
    },
    { id: "print-it", game: "print-it", spot: "printer", help: "lightbulb" },
    { id: "rewire", game: "rewire", spot: "fuse-cupboard", help: "lightbulb" },
    {
      id: "tea-squires",
      game: "tea",
      spot: "flask",
      help: "sore-spot",
      suspect: "square",
    },
    {
      id: "breathe-priya",
      game: "breathe",
      spot: "priya-bench",
      help: "sore-spot",
      suspect: "triangle",
    },
    {
      id: "race-rena",
      game: "race",
      spot: "breadboard",
      help: "sore-spot",
      suspect: "rectangle",
    },
  ],
  // Rena's is "leaving at nine", the same story the professor tells, so it can't single her out.
  soreSpots: {
    triangle: { topic: "the battery", about: ["lab-chat"] },
    square: {
      topic: "the visitor sheet",
      about: ["visitor-sheet", "question-squires-sheet"],
    },
    circle: { topic: "the match", about: ["crack-ozzy-match"] },
    rectangle: {
      topic: "leaving at nine",
      about: ["question-rena-after", "question-squires-left"],
    },
  },
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
