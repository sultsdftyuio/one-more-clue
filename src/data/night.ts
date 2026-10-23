import type { PropName } from "@/lib/art";
import type { SuspectId } from "./suspects";

export type Evidence = { prop: PropName; label: string };

/** The three things on the page that don't add up. */
export type ClueId = "zipline" | "bus" | "keycard";

export type Clue = { label: string; found: string; hint: string };

/**
 * One beat of the night, shown while the scroll clock is at or past `minute` (minutes after 9 PM).
 * `cluePhrase` is a part of `text` that can be tapped to find the "bus" clue.
 */
export type NightEvent = {
  minute: number;
  suspect?: SuspectId;
  text: string;
  cluePhrase?: string;
  evidence: Evidence[];
};

/** Copy for the "One Night" prototype landing page at /night. */
export const night = {
  arrival: {
    message: {
      from: "Unknown number",
      time: "9:00 PM",
      text: "Something is going to happen on Mercer Street tonight. Watch closely.",
    },
    pitch: "A co-op mystery you crack with friends, right in the browser. Tonight's case starts now.",
    cta: "Notify me at launch",
    scrollHint: "Scroll. The clock is ticking.",
    bubble: "One of us is lying.",
  },
  eyebrow: "Mercer Street · tonight",
  events: [
    {
      minute: 1,
      text: "The block hums. Four people are out on Mercer Street tonight. Keep an eye on all of them.",
      evidence: [],
    },
    {
      minute: 4,
      suspect: "square",
      text: "Lord Squarington orders his third tea at the café. He pays exactly. He always pays exactly.",
      evidence: [{ prop: "folder", label: "Café receipt, 9:04 PM" }],
    },
    {
      minute: 8,
      suspect: "triangle",
      text: "Tri calls Mum. Again. The call log will say eleven minutes.",
      evidence: [{ prop: "phone", label: "Call log" }],
    },
    {
      minute: 11,
      suspect: "circle",
      text: "Ollie slips into the alley behind the lab. Nobody sees him come out.",
      evidence: [{ prop: "fingerprint", label: "Prints on the side door" }],
    },
    {
      minute: 14,
      suspect: "rectangle",
      text: "Rex stops under the street lamp, grumbling that the 9:20 bus has already been and gone.",
      cluePhrase: "the 9:20 bus has already been and gone",
      evidence: [{ prop: "polaroid", label: "A photo of the street" }],
    },
    {
      minute: 16,
      text: "Every move tonight left a trace. In One More Clue your group gets all of them, then argues it out.",
      evidence: [
        { prop: "phone", label: "Chats" },
        { prop: "keycard", label: "Access logs" },
        { prop: "polaroid", label: "Photos" },
        { prop: "question", label: "Alibis" },
      ],
    },
  ] satisfies NightEvent[],
  blackout: {
    title: "9:17. Blackout.",
    fine: "Move your mouse to shine a light. Something just hit the ground.",
    coarse: "Drag your finger to shine a light. Something just hit the ground.",
    whispers: {
      triangle: "Who turned the lights off?!",
      square: "Someone trod on my shoe.",
      circle: "Did you hear that crash?",
      rectangle: "Hey! I was reading that.",
    } satisfies Record<SuspectId, string>,
  },
  /** Minutes 10 to 12: a round shadow slides along a zipline over the street. */
  zipline: { from: 10 * 60, to: 13 * 60 },
  clues: {
    zipline: {
      label: "Catch the shadow on the zipline",
      found: "A round shadow ziplined over the street at 9:11. Didn't Ollie go into the alley?",
      hint: "Look up at about 9:11. Scroll slowly.",
    },
    bus: {
      label: "Point out the impossible bus",
      found: "At 9:14, the 9:20 bus can't have been and gone. Rex's story is off.",
      hint: "One story gets the time wrong. Tap the words that don't add up.",
    },
    keycard: {
      label: "Pick up the dropped keycard",
      found: "A lab keycard, dropped in the dark.",
      hint: "Something hit the ground at 9:17. Search the dark.",
    },
  } satisfies Record<ClueId, Clue>,
  lights: {
    eyebrow: "9:18 PM · Lights back on",
    title: "The prototype is gone.",
    text: "Four suspects. One of them is lying. Can your group work out who?",
    primary: "Crack the 30-second case",
    secondary: "Notify me at launch",
    progress: "clues found. Hint:",
    complete: "All three clues found. Sharp eyes, detective. Case 001 is going to love you.",
  },
  pokes: {
    triangle: "Wh-what? I didn't do anything!",
    square: "Unhand me. I am a Lord.",
    circle: "Personal space, detective.",
    rectangle: "Move along. Nothing to see.",
  } satisfies Record<SuspectId, string>,
  rushed: "Slow down, detective! You'll miss things.",
  idle: "Still there, detective? The clock's ticking.",
  sameTime: "It's 9:17 where you are too. Coincidence?",
};
