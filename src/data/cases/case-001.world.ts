import type { CaseWorld } from "@/lib/game/types";
import { case001Building } from "./case-001.building.ts";

/**
 * Case 001's building: the Halden Innovation Building at 12:40 AM, cut open. Lab 4 sits above the dark maker
 * space, the corridor above the lobby and its stairs; the car park and the North Gate are outside in the rain.
 *
 * Numbers come from the painter's manifest (art/world/world.json, painted by art/world/world.py) at 2 px per cm.
 *
 * Nothing here may hint past the case file (docs/world-overhaul.md, rule 4): spots sit where their record is,
 * every suspect waits somewhere plain in a plain mood, and each one has a sore spot, the culprit no more than anyone.
 *
 * Server only: the browser gets the building alone (case-001.building.ts), never what's at each spot or the sore spots.
 */
export const case001World: CaseWorld = {
  ...case001Building,
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
      // On its bracket under the ceiling, left of the EXIT sign.
      x: 876,
      z: 258,
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
      // On the wall over the water cooler, past Lab 5's door.
      x: 935,
      z: 478,
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
};
