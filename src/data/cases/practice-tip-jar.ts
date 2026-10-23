import type { CaseFile } from "@/lib/game/types";

/**
 * A short practice case for building and testing the engine.
 *
 * Truth: Lord Squarington took the tip jar. He says he left at 8:30, but the
 * receipts have him paying at 8:42 (Archivist), the door log has one person
 * leaving at 8:43 (Tech), the photo shows the jar still there at 8:38
 * (Photographer) and the barista found it gone at 8:44 (Interviewer).
 * Every core role holds one link of that chain.
 */
export const practiceTipJar: CaseFile = {
  id: "practice-tip-jar",
  code: "Practice case",
  title: "The Tip Jar",
  minPlayers: 2,
  maxPlayers: 6,
  briefing:
    "Café Lumen, Thursday evening. At 8:44 PM the barista turned around and the tip jar was gone: three weeks of tips. Four regulars were around the café that evening. Each of you holds different evidence, so share what matters, talk it through and agree on who took it.",
  suspects: [
    { id: "triangle", art: "triangle", name: "Tri", blurb: "Nervous. Orders the same oat latte every night." },
    { id: "square", art: "square", name: "Lord Squarington", blurb: "Smug. Sits at table 3 and calls it his." },
    { id: "circle", art: "circle", name: "Ollie", blurb: "Shifty. Delivers parcels up and down the street." },
    { id: "rectangle", art: "rectangle", name: "Rex", blurb: "Stern. Takes the bus home from the stop opposite." },
  ],
  roles: [
    { id: "interviewer", core: true, name: "Interviewer", blurb: "You took everyone's statements. People lie to interviewers." },
    { id: "tech", core: true, name: "Tech", blurb: "You pulled the logs: the door, the scanners, anything with a timestamp." },
    { id: "photographer", core: true, name: "Photographer", blurb: "You collected every photo taken around the café that evening." },
    { id: "archivist", core: true, name: "Archivist", blurb: "You have the paperwork: receipts, notes and the staff chat." },
    { id: "lookout", core: false, name: "Lookout", blurb: "You asked around the street. Neighbours notice things." },
    { id: "profiler", core: false, name: "Profiler", blurb: "You know the regulars and their habits." },
  ],
  evidence: [
    {
      id: "statement-squarington",
      role: "interviewer",
      title: "Lord Squarington's statement",
      body: {
        type: "statement",
        speaker: "Lord Squarington",
        text: "I finished my tea and left at half past eight, as I always do. I was home before anything happened. Frankly I resent being asked.",
      },
    },
    {
      id: "statement-barista",
      role: "interviewer",
      title: "Mo the barista's statement",
      body: {
        type: "statement",
        speaker: "Mo, barista",
        text: "I turned to the machine at about 8:41 to make Tri's latte. When I turned back at 8:44 the jar was gone. Tri was the only customer still inside, and she let me look in her bag straight away. Nothing.",
      },
    },
    {
      id: "statement-tri",
      role: "interviewer",
      title: "Tri's statement",
      body: {
        type: "statement",
        speaker: "Tri",
        text: "I was on my phone at the counter, waiting for my latte. I didn't see anything! I stayed until about ten to nine. Please don't tell my mum.",
      },
    },
    {
      id: "door-log",
      role: "tech",
      title: "Front door chime log",
      body: {
        type: "log",
        source: "Café Lumen · door sensor",
        rows: [
          { time: "8:20 PM", text: "Door opened (in)" },
          { time: "8:31 PM", text: "Door opened (in)" },
          { time: "8:43 PM", text: "Door opened (out)" },
          { time: "8:52 PM", text: "Door opened (out)" },
        ],
      },
    },
    {
      id: "delivery-scans",
      role: "tech",
      title: "Parcel scanner log",
      body: {
        type: "log",
        source: "QuickParcel · courier Ollie",
        rows: [
          { time: "8:39 PM", text: "Arrived: Page & Co. bookshop (next door)" },
          { time: "8:40 PM", text: "Delivered: 3 boxes, signed by shop owner" },
          { time: "8:46 PM", text: "Delivered: 1 box, signed by shop owner" },
          { time: "8:47 PM", text: "Departed: Page & Co. bookshop" },
        ],
      },
    },
    {
      id: "photo-cafe",
      role: "photographer",
      title: "Café Lumen's Instagram post",
      body: {
        type: "photo",
        caption: "Posted 8:38 PM · \"Thursday regulars ☕\"",
        description:
          "The counter, with the tip jar stuffed full of notes. Tri leans on the counter, staring at her phone. Behind her, Lord Squarington sits at table 3, coat buttoned, cup in hand.",
      },
    },
    {
      id: "photo-bus-stop",
      role: "photographer",
      title: "A tourist's photo of the street",
      body: {
        type: "photo",
        caption: "Taken 8:41 PM, from across the road",
        description:
          "The bus stop opposite the café. Rex stands under the shelter reading the timetable, arms folded. The café door behind him is shut.",
      },
    },
    {
      id: "receipts",
      role: "archivist",
      title: "Today's card receipts",
      body: {
        type: "log",
        source: "Café Lumen · till",
        rows: [
          { time: "8:22 PM", text: "Table 3 · Earl Grey · card ending 0007" },
          { time: "8:41 PM", text: "Counter · Oat latte · cash" },
          { time: "8:42 PM", text: "Table 3 · Earl Grey ×2, lemon cake · card ending 0007 · tapped on the counter reader" },
        ],
      },
    },
    {
      id: "staff-chat",
      role: "archivist",
      title: "Staff group chat",
      body: {
        type: "chat",
        title: "Lumen crew",
        messages: [
          { from: "Mo", time: "8:24 PM", text: "His Lordship is in. Table 3. Third night this week" },
          { from: "Priya", time: "8:25 PM", text: "Did he ever pay off last month's tab??" },
          { from: "Mo", time: "8:26 PM", text: "Nope. Keeps saying 'next week'" },
          { from: "Mo", time: "8:45 PM", text: "JAR IS GONE. Nobody touch anything" },
        ],
      },
    },
    {
      id: "neighbour-text",
      role: "lookout",
      title: "A neighbour's message",
      body: {
        type: "chat",
        title: "Mrs. Okafor (flat above the café)",
        messages: [
          {
            from: "Mrs. Okafor",
            time: "9:05 PM",
            text: "Saw a gentleman in a long coat hurry out of the café at about quarter to nine. His pocket was clinking like a piggy bank.",
          },
        ],
      },
    },
    {
      id: "statement-rex",
      role: "lookout",
      title: "Rex's statement",
      body: {
        type: "statement",
        speaker: "Rex",
        text: "I never set foot in the café. I was at the stop from 8:35 for the 8:50 bus. It was late. It is always late.",
      },
    },
    {
      id: "regulars-notes",
      role: "profiler",
      title: "Notes on the regulars",
      body: {
        type: "document",
        text: "Tri: anxious, honest to a fault. Ollie: in and out all day, never sits down. Rex: never comes in after 8. Lord Squarington: owes the café £64 from last month and has been 'about to pay' for weeks.",
      },
    },
  ],
  hints: [
    "Line up everyone's times. Who was where at 8:42?",
    "Someone told the Interviewer they left at 8:30. Do the receipts agree?",
    "Only one person walked out between the photo at 8:38 and the jar going missing at 8:44. The door log says when.",
  ],
  solution: {
    culprit: "square",
    explanation:
      "Lord Squarington said he left at 8:30, but the café photo has him at table 3 at 8:38, and his card tapped the reader on the counter, right beside the tip jar, at 8:42, while Mo had her back turned. The door opened once, at 8:43, and nobody else went out before Mo found the jar gone at 8:44. Tri was searched, Ollie was signing for parcels next door, and Rex was photographed at the bus stop.",
  },
};
