import type { CaseWorld } from "@/lib/game/types";
import { case001Building } from "./case-001.building.ts";

/**
 * Case 001's building: the Halden Innovation Building at 12:40 AM, cut open. Upstairs, the professor's office, Lab 4,
 * the corridor and the staff kitchen; downstairs, the dark maker space, the security office and the lobby with its
 * stairs; the car park and the North Gate are outside in the rain.
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
    // The professor's office
    {
      id: "filing-cabinet",
      name: "The professor's filing cabinet",
      room: "office",
      // The register lives in his filing cabinet now, not in Cabinet B: it's his record of the lab's kit.
      x: 204,
      z: 380,
      kind: "object",
      evidence: ["asset-register"],
      roles: ["tech"],
    },
    {
      id: "prof-screen",
      name: "The professor's computer",
      room: "office",
      // His desk screen, asleep: the same inbox as his phone.
      x: 406,
      z: 418,
      kind: "device",
      evidence: ["northgate-email"],
      roles: ["archivist"],
    },
    // Lab 4
    {
      id: "laptop",
      name: "Priya's laptop",
      room: "lab4",
      x: 836.8,
      z: 431.8,
      kind: "device",
      evidence: ["lab-chat", "device-log", "chat-history"],
      roles: ["archivist", "tech"],
    },
    {
      id: "cabinet",
      name: "Cabinet B",
      room: "lab4",
      x: 686.7,
      z: 473,
      kind: "object",
      evidence: ["dock-log"],
      roles: ["tech"],
    },
    {
      id: "lab-view",
      name: "Lab 4, as the photos saw it",
      room: "lab4",
      // Up by the lab clock, which both photos show, clear of anyone standing in the lab.
      x: 863,
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
      x: 1137,
      z: 429,
      kind: "device",
      evidence: ["badge-log"],
      roles: ["tech"],
    },
    // Security office
    {
      id: "security-screens",
      name: "The camera screens",
      room: "security",
      // The bank of six screens over the desk: the lobby camera's footage plays here.
      x: 860,
      z: 205,
      kind: "device",
      evidence: ["cctv-lobby"],
      roles: ["tech"],
    },
    {
      id: "rounds-clipboard",
      name: "The rounds clipboard",
      room: "security",
      // On its hook by the door to the lobby, with the tour wand's charger on the desk below.
      x: 940,
      z: 158,
      kind: "object",
      evidence: ["guard-tour"],
      roles: ["tech"],
    },
    // Lobby
    {
      id: "lobby-reader",
      name: "The main door's badge reader",
      room: "lobby",
      x: 1653.2,
      z: 122,
      kind: "device",
      evidence: ["badge-log"],
      roles: ["tech"],
    },
    {
      id: "security-desk",
      name: "The security desk",
      room: "lobby",
      // The key board and rounds rota on the wall behind the desk, between Ali and Ozzy: visitors sign in here.
      x: 1280,
      z: 215,
      kind: "device",
      evidence: ["visitor-sheet"],
      roles: ["archivist"],
    },
    // Outside: the North Gate's number-plate camera.
    {
      id: "anpr",
      name: "The North Gate camera",
      room: "outside",
      x: 2916,
      z: 280,
      kind: "device",
      evidence: ["anpr"],
      roles: ["tech"],
    },
    // Side jobs
    {
      id: "coffee-machine",
      name: "The coffee machine",
      room: "kitchen",
      x: 1923,
      z: 434,
      kind: "sidejob",
    },
    {
      id: "kettle",
      name: "The kettle",
      room: "kitchen",
      x: 1778,
      z: 414,
      kind: "sidejob",
    },
    {
      id: "ozzy-phone",
      name: "Ozzy's phone",
      room: "lobby",
      // On the desk's front panel: Ozzy stands behind it, so his head and the phone stay tappable.
      x: 1298,
      z: 50,
      kind: "sidejob",
    },
    {
      id: "printer",
      name: "The 3D printers",
      room: "maker",
      x: 202,
      z: 80,
      kind: "sidejob",
    },
    {
      id: "fuse-cupboard",
      name: "The fuse cupboard",
      room: "corridor",
      // On the wall over the water cooler, past Lab 5's door.
      x: 1543,
      z: 478,
      kind: "sidejob",
    },
    {
      id: "priya-bench",
      name: "Priya's stool",
      room: "lab4",
      // In the gap between Mei and Priya.
      x: 838,
      z: 340,
      kind: "sidejob",
    },
    {
      id: "breadboard",
      name: "The breadboard",
      room: "lab4",
      // At the bench's left end, by the cutting mat, clear of Mei.
      x: 703,
      z: 395,
      kind: "sidejob",
    },
    {
      id: "demo-case",
      name: "The demo case",
      room: "office",
      // The aluminium flight case on the floor by the bookcase, packed for tomorrow's investor demo.
      x: 332,
      z: 330,
      kind: "sidejob",
    },
    {
      id: "monitor-desk",
      name: "The monitor desk",
      room: "security",
      // The keyboard under the screens, left of the camera footage.
      x: 750,
      z: 110,
      kind: "sidejob",
    },
    {
      id: "barrier",
      name: "The barrier",
      room: "outside",
      // The North Gate's arm, by the attendant's booth.
      x: 2951,
      z: 100,
      kind: "sidejob",
    },
  ],
  elsewhere: {
    "kestrel-staff": "Kestrel Dynamics' own website",
  },
  sideJobs: [
    {
      id: "coffee-run",
      game: "coffee-run",
      spot: "coffee-machine",
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
      spot: "kettle",
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
    // The bigger building's three: one for each new room that would otherwise only fill up in later chapters.
    { id: "pack-case", game: "pack-case", spot: "demo-case", help: "lightbulb" },
    { id: "watch-monitors", game: "watch-monitors", spot: "monitor-desk", help: "lightbulb" },
    { id: "time-barrier", game: "time-barrier", spot: "barrier", help: "coffee" },
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
