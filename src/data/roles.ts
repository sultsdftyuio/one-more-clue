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
    verb: "Reads pictures",
    power: "Tap anything in a photo to look closer. Only you can, even on photos your friends pin.",
    tint: "bg-coral text-cream",
  },
  {
    id: "interviewer",
    name: "Interviewer",
    prop: "question",
    verb: "Talks to people",
    power: "The whole team shares a handful of questions, so you choose who to ask, and what, together.",
    tint: "bg-lilac text-ink",
  },
  {
    id: "tech",
    name: "Tech",
    prop: "keycard",
    verb: "Pulls records",
    power: "Card readers, doors, couriers, phones. Type a name, number or place to pull its records.",
    tint: "bg-teal text-ink",
  },
  {
    id: "archivist",
    name: "Archivist",
    prop: "folder",
    verb: "Catches liars",
    power: "Hold two pieces of evidence up against each other. If they can't both be true, someone's lying.",
    tint: "bg-mustard text-ink",
  },
];

export const rolesDemo = {
  photo: {
    image: "/evidence/practice-instagram.webp",
    caption: "@cafelumen · posted 8:38 PM · “Thursday regulars ☕”",
    // Tap areas in percent, the same ones the game uses for this picture.
    spots: [
      { id: "jar", x: 33, y: 50, w: 9, h: 17, title: "The jar at 8:38", text: "The tip jar is on the counter at 8:38, stuffed with notes." },
      { id: "reader", x: 44, y: 55, w: 7, h: 12, title: "The card reader", text: "The card reader sits right next to the jar. Anyone paying there could touch it." },
    ],
  },
  interview: {
    suspect: "circle" as SuspectId,
    name: "Ollie",
    budget: 5,
    question: "Where were you between 8:41 and 8:44?",
    answer: "Next door at Page & Co., signing for parcels. Check my scanner if you don't believe me.",
    lead: "Ollie's QuickParcel scanner",
  },
  search: {
    lead: "QuickParcel",
    records: [
      {
        id: "scanner",
        terms: ["ollie", "quickparcel", "parcel", "courier", "scanner"],
        source: "QuickParcel · courier Ollie",
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
  crosscheck: {
    verdict: "They agree.",
    text: "Ollie says he was next door, and his scanner puts him there at 8:41 and 8:44. No lie here: one suspect off the list. When two pieces don't agree, that's your liar.",
  },
};
