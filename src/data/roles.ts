import type { PropName } from "@/lib/art";
import type { SuspectId } from "./suspects";

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
 * The four roles, shown with real evidence from the practice case (Café
 * Lumen). Only the setup and one innocent alibi are used, so nothing here
 * gives the practice case away.
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
    image: "/evidence/practice-instagram.webp",
    caption: "@cafelumen · posted 8:38 PM · “Thursday regulars ☕”",
    // Clue areas in percent, the same ones the game uses for this picture.
    spots: [
      { id: "jar", x: 33, y: 50, w: 9, h: 17, title: "The jar at 8:38", text: "The tip jar is on the counter at 8:38, stuffed with notes." },
      { id: "reader", x: 44, y: 55, w: 7, h: 12, title: "The card reader", text: "The card reader sits right next to the jar. Anyone paying there could touch it." },
    ],
  },
  interview: {
    suspect: "circle" as SuspectId,
    name: "Ollie",
    question: "Where were you between 8:41 and 8:44?",
    answer: "Next door at Page & Co., signing for parcels. My van's number 12, parked right outside. Check my scanner.",
    lead: "QuickParcel",
  },
  search: {
    lead: "QuickParcel",
    records: [
      {
        id: "scanner",
        terms: ["ollie", "quickparcel", "parcel", "courier", "scanner", "van"],
        source: "QuickParcel · courier Ollie",
        // Locked: the password is in Ollie's answer, on the Interviewer's desk.
        lock: { hint: "QuickParcel driver app. Password hint: Ollie's van number.", answers: ["12", "van12"] },
        rows: [
          { time: "8:41 PM", text: "Delivered at Page & Co. (next door) · signed by owner" },
          { time: "8:44 PM", text: "Delivered at Page & Co. (next door) · signed by owner" },
          { time: "8:47 PM", text: "Left Lumen Street" },
        ],
      },
      {
        id: "phone",
        terms: ["tri", "mum", "phone"],
        source: "Network records · Tri",
        rows: [
          { time: "8:35 PM", text: "Call to 'Mum ❤️' started" },
          { time: "8:51 PM", text: "Call ended (16 min)" },
        ],
      },
    ],
  },
  wall: {
    verdict: "Checks out",
    text: "Ollie says he was next door, and his scanner puts him there at 8:41 and 8:44. They agree, so the string hangs slack: no lie here, and one suspect is off your list. When two things can't both be true, it snaps tight, and you've caught a liar.",
  },
};
