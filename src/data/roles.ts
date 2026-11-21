import type { PropName } from "@/lib/art";

export type RoleId = "photographer" | "interviewer" | "tech" | "archivist";

export type RoleCard = {
  id: RoleId;
  name: string;
  prop: PropName;
  /** The role in three words, on its tab. */
  verb: string;
  /** What only this role can do. */
  power: string;
  /** Tab and tool colours, matching the role cards in the game. */
  tint: string;
};

/**
 * The four roles, shown with real evidence from Case 001's opening: Ozzy's
 * incident photo, how he found the cabinet, and his patrol log. None of it
 * answers a checkpoint, and the wall only says his 9:17 holds up, not that
 * he's innocent.
 */
export const roles: RoleCard[] = [
  {
    id: "photographer",
    name: "Photographer",
    prop: "polaroid",
    verb: "Shoots the details",
    power: "Your phone becomes a camera. Zoom in on anything that looks off and take the shot. Only you can, even on photos your friends pin.",
    tint: "bg-coral text-cream",
  },
  {
    id: "interviewer",
    name: "Interviewer",
    prop: "question",
    verb: "Works the room",
    power: "Bring a suspect into the chair and ask. Show them something from the board, and if it breaks their story, they crack.",
    tint: "bg-lilac text-ink",
  },
  {
    id: "tech",
    name: "Tech",
    prop: "keycard",
    verb: "Hacks the records",
    power: "Search any name, number or place, or tap a word in the evidence. Some files are locked, and a teammate holds the password.",
    tint: "bg-teal text-ink",
  },
  {
    id: "archivist",
    name: "Archivist",
    prop: "folder",
    verb: "Ties it together",
    power: "Run the team's evidence wall. Tie a string between two things that can't both be true, and it snaps tight.",
    tint: "bg-mustard text-ink",
  },
];

export const rolesDemo = {
  photo: {
    image: "/evidence/case001-incident.webp",
    caption: "Taken by Ozzy for the incident report · 9:20 PM",
    // Clue areas in percent, the same ones the game uses for this picture.
    spots: [{ id: "cabinet", x: 1, y: 9, w: 26, h: 44, title: "The empty cabinet", text: "Cabinet B: empty, not forced, the spare key in the lock." }],
  },
  interview: {
    /** The character's own look in the game (src/lib/cast-art.ts). */
    look: "c001-ozzy",
    name: "Ozzy",
    question: "When did you find the cabinet open?",
    answer: "9:17, on my round. Door wide open, key still in the lock. Check my rounds, badge S-42.",
    lead: "Ozzy's rounds",
  },
  search: {
    lead: "Ozzy's rounds",
    records: [
      {
        id: "rounds",
        terms: ["ozzy", "reyes", "guard", "rounds", "patrol", "security"],
        source: "Patrol checkpoints · O. Reyes",
        // Locked: the password is in Ozzy's answer, on the Interviewer's desk.
        lock: { hint: "Security system. Password hint: the night guard's badge number.", answers: ["S-42", "S42"] },
        rows: [
          { time: "9:00 PM", text: "Checkpoint: lobby" },
          { time: "9:10 PM", text: "Checkpoint: Lab 4 corridor" },
          { time: "9:17 PM", text: "Checkpoint: Lab 4 · alarm raised" },
        ],
      },
      {
        id: "register",
        terms: ["halo", "prototype", "glasses", "asset", "register"],
        source: "Asset register · HALO",
        rows: [
          { time: "Kept", text: "Cabinet B, Lab 4" },
          { time: "Keys", text: "P. Tran, E. Squires" },
          { time: "Spare", text: "Top drawer of the professor's desk" },
        ],
      },
    ],
  },
  wall: {
    verdict: "Checks out",
    text: "Ozzy says he found the cabinet open at 9:17, and his patrol log puts him at Lab 4 at 9:17. They agree, so the string hangs slack: no lie here. When two things can't both be true, it snaps tight, and you've caught a liar.",
  },
};
