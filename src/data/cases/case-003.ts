import type { CaseFile } from "@/lib/game/types";

/**
 * Case 003: The Last Course.
 *
 * Truth: Ruth Vale, the pastry chef, laced the owner's gold-leaf chocolate
 * plate with peanut oil. Bertrand Carré is deadly allergic and tastes the
 * chocolate course at Table 9 every night. He was selling Maison Lune and
 * closing her section. At the pass, Olu the sommelier saw a smudge on the
 * critic's plate and sent the clean gold-leaf plate to Table 1 instead. The
 * critic, Celeste Hart, who is also allergic, ate the poison meant for
 * Bertrand.
 *
 * What makes it different: four chapters, a victim who wasn't the target,
 * and the most cross-checking of any case.
 *
 * Hand-offs: the critic's plate shows gold leaf (Photographer) → the house
 * rules say only the owner's plate gets gold leaf (Archivist); the pass camera
 * shows the swap; Olu mentions the storeroom → the Tech searches it.
 */
export const case003: CaseFile = {
  id: "case-003",
  code: "Case 003",
  title: "The Last Course",
  tagline: "The most feared critic in the country collapses after dessert. Four people touched that dinner.",
  theme: "bistro",
  // Rendered by art/omc_cinema/case003_film.py. Hidden clue: half a second of two plates on the pass, one with gold leaf.
  cinematic: { video: "/cinematics/case-003.mp4", poster: "/cinematics/case-003.jpg" },
  deadline: {
    what: "The kitchen is scrubbed clean at midnight",
    times: ["10:15 PM", "10:50 PM", "11:25 PM"],
    lost: "Midnight. The kitchen is scrubbed and the pass is spotless. Whatever was on that plate is gone, and so is your case.",
  },
  minPlayers: 2,
  maxPlayers: 4,
  story: [
    { kind: "effect", effect: "candles", text: "Course seven." },
    { kind: "title", text: "Maison Lune", sub: "Course seven · 9:52 PM" },
    { kind: "narration", text: "Tonight the most feared critic in the country, Celeste Hart, ate the seven-course tasting menu." },
    { kind: "message", from: "Celeste Hart (draft review)", time: "9:50 PM", text: "Course seven: chocolate, salt and smoke. Finally, a reason to—" },
    { kind: "narration", text: "Two minutes later she couldn't breathe. A severe allergic reaction. She's in hospital, and she'll recover." },
    { kind: "line", who: "triangle", text: "There isn't a single nut in my kitchen. There CAN'T be.", shocked: true },
    { kind: "narration", text: "Four people touched that dinner. One of them knew exactly what they were doing." },
  ],
  briefing:
    "At 9:52 PM the food critic Celeste Hart collapsed at Table 1 of Maison Lune, minutes after the seventh course, a chocolate dessert. Paramedics say it was a severe allergic reaction. The kitchen swears it's nut-free. Four people handled that dinner. Find out what she ate, who it was really meant for, and who did it.",
  suspects: [
    { id: "triangle", art: "triangle", name: "Amélie Duret", role: "Head chef", tint: 330, blurb: "A perfectionist. Tonight's review could make or break her." },
    { id: "square", art: "square", name: "Bertrand Carré", role: "Owner", tint: 20, blurb: "Owns Maison Lune. Tastes the chocolate course every night." },
    { id: "circle", art: "circle", name: "Olu Bello", role: "Sommelier", tint: 250, blurb: "Wine, charm and a habit of tidying other people's work." },
    { id: "rectangle", art: "rectangle", name: "Ruth Vale", role: "Pastry chef", tint: 110, blurb: "Twelve years of desserts. Every chocolate course is hers." },
  ],
  roles: [
    { id: "tech", core: true, ability: "search", name: "Tech", blurb: "You're in the restaurant's systems: bookings, kitchen tickets, the storeroom, emails. Type a name or thing to pull its records." },
    { id: "interviewer", core: true, ability: "interview", name: "Interviewer", blurb: "You talk to people. The team gets six questions across four chapters, so choose them together." },
    { id: "photographer", core: true, ability: "inspect", name: "Photographer", blurb: "You read pictures. Tap anything in a photo or camera still to look closer. Only you can." },
    { id: "archivist", core: true, ability: "crosscheck", name: "Archivist", blurb: "You keep the paperwork and you catch liars. Hold two pieces of evidence up against each other." },
    { id: "lookout", core: false, ability: "none", name: "Lookout", blurb: "You were front of house tonight. Diners notice things." },
    { id: "profiler", core: false, ability: "none", name: "Profiler", blurb: "You know this kitchen, and the people in it." },
  ],
  chapters: [
    {
      title: "Course seven",
      intro: "The kitchen swears it's nut-free. Find out what actually made Celeste collapse.",
      story: [],
      checkpoint: {
        question: "The kitchen swears the chocolate course was nut-free. What proves something got through?",
        proves: ["paramedic-note", "insight-nutfree"],
        reveal: "The paramedics found peanut, within minutes of course seven. The wine was barely touched. The 'nut-free' kitchen wasn't.",
      },
      hints: [
        "The paramedics wrote down exactly what she reacted to.",
        "The Archivist can hold the paramedics' note up against what the chef says about her kitchen.",
      ],
    },
    {
      title: "The pass",
      intro: "Course seven left the kitchen as two plates, a minute apart. Find out which one Celeste ate.",
      story: [
        { kind: "narration", text: "Peanut, in a nut-free kitchen. And course seven left the pass as two plates, a minute apart." },
        { kind: "line", who: "circle", text: "I keep that pass immaculate. Im-mac-u-late. Check the camera if you like." },
      ],
      checkpoint: {
        question: "Whose plate did Celeste actually eat? Show what proves it.",
        proves: ["detail-gone", "question-jo-plate", "question-olu-swap", "insight-gold"],
        reveal: "Olu sent the clean gold-leaf plate, the owner's, to Table 1, and wiped the smudged one for Bertrand. Celeste ate the owner's dessert.",
      },
      hints: [
        "Look for gold leaf. Who is it meant for?",
        "The pass camera shows both plates. Ask the person who decided which went where.",
      ],
    },
    {
      title: "The target",
      intro: "Celeste ate a plate that was never meant for her. So who was it meant for?",
      story: [
        { kind: "narration", text: "The critic ate a plate that was never meant for her. So whose plate was it?" },
        { kind: "line", who: "square", text: "I don't see why I'm being kept here. I have a restaurant to run. And a buyer to meet." },
      ],
      checkpoint: {
        question: "Who was the peanut really meant for? Show what proves it.",
        proves: ["detail-bracelet", "staff-medical", "question-bertrand-allergy", "insight-target"],
        reveal: "The poisoned plate was the owner's gold-leaf plate, and Bertrand is deadly allergic to peanuts. Celeste was an accident.",
      },
      hints: [
        "Someone at this restaurant shares the critic's allergy.",
        "Ask the owner about allergies, or look closely at his wrist.",
      ],
    },
    {
      title: "Sweet revenge",
      intro: "Someone tried to kill the owner with his own dessert. Find the peanut, and find out why.",
      story: [
        { kind: "line", who: "square", text: "Someone tried to poison ME? In my own restaurant?", shocked: true },
        { kind: "effect", effect: "flash", text: "The police photographer is in the kitchen." },
        { kind: "narration", text: "Only one section of the kitchen makes the gold-leaf plate. Find the peanut, and find out why." },
      ],
      hints: [
        "Ask who went to the storeroom tonight, then have the Tech look.",
        "Look closely at the pastry station photo.",
        "Bertrand has been emailing someone about the restaurant's future.",
      ],
    },
  ],
  questionBudget: 6,
  interrogation: {
    suspect: "rectangle",
    strikes: 3,
    opening: "Twelve years in that kitchen, and this is what I get? Fine. Quickly, I have a mousse setting.",
    claims: [
      { id: "twelve", text: "I've run the pastry section here for twelve years." },
      {
        id: "butter",
        text: "I went to the storeroom for butter. That's all.",
        lie: { breaks: ["storeroom-log", "insight-oil"], crack: "Peanut oil, butter. They're both fats." },
      },
      {
        id: "nuts",
        text: "No nut has ever been near my section. I would never take that risk.",
        lie: { breaks: ["detail-bottle", "insight-oil"], crack: "Anyone could hide a bottle behind my flour." },
      },
      {
        id: "plate",
        text: "Anyone in that kitchen could have touched the owner's plate.",
        lie: { breaks: ["question-amelie-gold", "detail-leaf", "house-rules"], crack: "Yes, the leaf is mine. The plate is mine. That isn't a crime." },
      },
      { id: "critic", text: "I never meant any harm to Celeste Hart." },
      {
        id: "allergy",
        text: "I had no idea Bertrand was allergic to anything.",
        lie: { breaks: ["staff-medical", "question-bertrand-allergy", "detail-bracelet"], crack: "Fine. Everybody knows. It's on his wrist." },
      },
      {
        id: "sale",
        text: "What sale? I make desserts. I don't read his emails.",
        lie: { breaks: ["detail-note", "ruth-letter", "sale-email"], crack: "Twelve years, and he told me with a form letter." },
      },
    ],
    walkout: "My mousse is splitting. We're finished here.",
  },
  evidence: [
    // ----- Chapter 1: course seven --------------------------------------------
    {
      id: "paramedic-note",
      role: "archivist",
      chapter: 1,
      access: { kind: "desk" },
      title: "Paramedics' note",
      body: {
        type: "document",
        text: "Patient: Celeste Hart.\nSevere allergic reaction (anaphylaxis). Trigger: PEANUT.\nOnset about five minutes after eating. Adrenaline given. Stable.",
      },
    },
    {
      id: "ticket-log",
      role: "tech",
      chapter: 1,
      access: { kind: "desk" },
      title: "Kitchen ticket screen",
      body: {
        type: "log",
        source: "Maison Lune · kitchen tickets",
        rows: [
          { time: "7:02 PM", text: "Table 1 · CRITIC · ⚠ NUT ALLERGY (severe)" },
          { time: "9:44 PM", text: "Table 1 · course 7 fired · pastry" },
          { time: "9:44 PM", text: "Table 9 · OWNER · course 7 fired · pastry" },
        ],
      },
    },
    {
      id: "statement-amelie",
      role: "interviewer",
      chapter: 1,
      access: { kind: "desk" },
      title: "Chef Amélie's statement",
      body: {
        type: "statement",
        speaker: "Amélie Duret",
        text: "This kitchen is nut-free. Completely. I banned them five years ago. Every plate passes my eyes. There is no way a peanut came out of my kitchen.",
      },
    },
    {
      id: "photo-table1",
      role: "photographer",
      chapter: 1,
      access: { kind: "desk" },
      title: "Table 1, after",
      body: {
        type: "scene",
        caption: "Taken by the paramedics · 10:05 PM · Table 1",
        look: "cafe",
        items: [
          { kind: "box", x: 0, y: 58, w: 100, h: 42, color: "#e9dcc7", radius: 1 },
          { kind: "box", x: 26, y: 54, w: 26, h: 16, color: "#fffaf0", radius: 50, hotspot: "plate" },
          { kind: "box", x: 34, y: 57, w: 10, h: 8, color: "#3b2416", radius: 50 },
          { kind: "box", x: 39, y: 56, w: 3, h: 2, color: "#f2b33d", radius: 10 },
          { kind: "box", x: 62, y: 30, w: 7, h: 26, color: "rgba(214,236,255,0.6)", radius: 20, hotspot: "wine" },
          { kind: "box", x: 76, y: 48, w: 14, h: 18, color: "#fff4e0", radius: 3, text: "VII", textColor: "#1b1f3b", hotspot: "card" },
        ],
      },
    },
    {
      id: "detail-plate-gold",
      role: "photographer",
      chapter: 1,
      access: { kind: "inspect", scene: "photo-table1", hotspot: "plate" },
      title: "Celeste's dessert",
      body: { type: "finding", text: "A half-eaten chocolate dome. On top: a flake of gold leaf." },
    },
    {
      id: "detail-wine",
      role: "photographer",
      chapter: 1,
      access: { kind: "inspect", scene: "photo-table1", hotspot: "wine" },
      title: "The wine glass",
      body: { type: "finding", text: "The glass of Pinot is still almost full. She barely drank." },
    },
    {
      id: "detail-menu",
      role: "photographer",
      chapter: 1,
      access: { kind: "inspect", scene: "photo-table1", hotspot: "card" },
      title: "The menu card",
      body: { type: "finding", text: "The menu card: 'VII. Midnight chocolate. Nut-free, as ever.'" },
    },
    {
      id: "booking",
      role: "tech",
      chapter: 1,
      access: { kind: "search", terms: ["celeste", "hart", "critic", "booking", "table1"] },
      title: "Booking: Celeste Hart",
      body: {
        type: "log",
        source: "Reservations · Table 1",
        rows: [
          { time: "8:00 PM", text: "Celeste Hart · party of one · tasting menu" },
          { time: "", text: "Note: SEVERE PEANUT ALLERGY · carries EpiPen" },
        ],
      },
    },
    {
      id: "question-olu-wine",
      role: "interviewer",
      chapter: 1,
      access: { kind: "interview", suspect: "Olu Bello", question: "What did the critic drink?" },
      title: "Olu: the wine",
      body: { type: "statement", speaker: "Olu Bello", text: "One glass of Pinot. She barely touched it. It wasn't the wine, I promise you that." },
    },
    {
      id: "question-amelie-who",
      role: "interviewer",
      chapter: 1,
      after: ["detail-menu"],
      access: { kind: "interview", suspect: "Amélie Duret", question: "Who made course seven?" },
      title: "Amélie: who made it",
      body: { type: "statement", speaker: "Amélie Duret", text: "Pastry. Ruth makes every chocolate course, start to finish. I only check the plates at the pass." },
    },
    {
      id: "insight-nutfree",
      role: "archivist",
      chapter: 1,
      access: { kind: "crosscheck", pair: ["detail-menu", "paramedic-note"] },
      title: "Not so nut-free",
      body: { type: "finding", text: "The menu swears it's nut-free, as ever. The paramedics say peanut." },
    },
    {
      id: "kitchen-notes",
      role: "profiler",
      chapter: 1,
      access: { kind: "desk" },
      title: "Notes on the kitchen",
      body: {
        type: "document",
        text: "Amélie: a perfectionist, terrified of tonight's review.\nBertrand: owner. Talks about 'exciting news' a lot lately.\nOlu: can't leave a plate alone.\nRuth: twelve years here. Bertrand calls her desserts 'his'.",
      },
    },

    // ----- Chapter 2: the pass ------------------------------------------------
    {
      id: "pass-camera",
      role: "photographer",
      chapter: 2,
      access: { kind: "desk" },
      title: "Pass camera",
      body: {
        type: "footage",
        caption: "Kitchen pass · camera 1 · scrub through it",
        look: "cctv",
        frames: [
          {
            time: "21:46:20",
            items: [
              { kind: "box", x: 0, y: 60, w: 100, h: 40, color: "#8a8a8a", radius: 1 },
              { kind: "box", x: 14, y: 50, w: 22, h: 14, color: "#e0e0e0", radius: 50, hotspot: "gold" },
              { kind: "box", x: 23, y: 52, w: 4, h: 3, color: "#ffffff", radius: 10 },
              { kind: "box", x: 56, y: 50, w: 22, h: 14, color: "#e0e0e0", radius: 50, hotspot: "smudge" },
              { kind: "box", x: 72, y: 58, w: 5, h: 3, color: "#555", radius: 20 },
            ],
          },
          {
            time: "21:46:48",
            items: [
              { kind: "box", x: 0, y: 60, w: 100, h: 40, color: "#8a8a8a", radius: 1 },
              { kind: "box", x: 14, y: 50, w: 22, h: 14, color: "#e0e0e0", radius: 50 },
              { kind: "box", x: 23, y: 52, w: 4, h: 3, color: "#ffffff", radius: 10 },
              { kind: "box", x: 56, y: 50, w: 22, h: 14, color: "#e0e0e0", radius: 50 },
              { kind: "art", x: 74, y: 14, w: 15, art: "suspect:circle", hotspot: "olu" },
            ],
          },
          {
            time: "21:47:05",
            items: [
              { kind: "box", x: 0, y: 60, w: 100, h: 40, color: "#8a8a8a", radius: 1 },
              { kind: "box", x: 14, y: 50, w: 22, h: 14, color: "#6a6a6a", radius: 50, hotspot: "gone" },
              { kind: "box", x: 56, y: 50, w: 22, h: 14, color: "#e0e0e0", radius: 50 },
              { kind: "box", x: 72, y: 58, w: 5, h: 3, color: "#555", radius: 20 },
            ],
          },
        ],
      },
    },
    {
      id: "detail-gold",
      role: "photographer",
      chapter: 2,
      access: { kind: "inspect", scene: "pass-camera", hotspot: "gold" },
      title: "The left plate",
      body: { type: "finding", text: "The left plate has a gold leaf. Its ticket reads TABLE 9 · OWNER." },
    },
    {
      id: "detail-smudge",
      role: "photographer",
      chapter: 2,
      access: { kind: "inspect", scene: "pass-camera", hotspot: "smudge" },
      title: "The right plate",
      body: { type: "finding", text: "The right plate, ticket TABLE 1, has a chocolate smudge on the rim. No gold leaf." },
    },
    {
      id: "detail-olu-points",
      role: "photographer",
      chapter: 2,
      access: { kind: "inspect", scene: "pass-camera", hotspot: "olu" },
      title: "Olu at the pass",
      body: { type: "finding", text: "Olu is pointing the runner at the LEFT plate." },
    },
    {
      id: "detail-gone",
      role: "photographer",
      chapter: 2,
      after: ["pass-log"],
      access: { kind: "inspect", scene: "pass-camera", hotspot: "gone" },
      title: "21:47:05",
      body: { type: "finding", text: "The gold-leaf plate is gone first, to Table 1. The smudged plate is left for Table 9." },
    },
    {
      id: "house-rules",
      role: "archivist",
      chapter: 2,
      access: { kind: "desk" },
      title: "House rules",
      body: {
        type: "document",
        text: "The owner tastes every chocolate course at Table 9.\nHis plate carries a gold leaf, so nobody mixes it up.\nGold leaf is kept and placed by the pastry section only.",
      },
    },
    {
      id: "pass-log",
      role: "tech",
      chapter: 2,
      access: { kind: "search", terms: ["pass", "runner", "table9", "plates", "jo"] },
      title: "Pass log",
      body: {
        type: "log",
        source: "Kitchen pass · plate log",
        rows: [
          { time: "9:46 PM", text: "Course 7 · TABLE 9 (owner) · ready · gold leaf" },
          { time: "9:46 PM", text: "Course 7 · TABLE 1 · ready" },
          { time: "9:47 PM", text: "Both collected · runner: Jo" },
        ],
      },
    },
    {
      id: "question-olu-swap",
      role: "interviewer",
      chapter: 2,
      access: { kind: "interview", suspect: "Olu Bello", question: "Did you touch the plates at the pass?" },
      title: "Olu: the plates",
      body: {
        type: "statement",
        speaker: "Olu Bello",
        text: "Yes. Table 1's plate had a smudge. You don't send a smudge to Celeste Hart. I sent her the clean one and wiped the other for Bertrand. He never looks.",
      },
    },
    {
      id: "question-jo-plate",
      role: "interviewer",
      chapter: 2,
      after: ["pass-log"],
      access: { kind: "interview", suspect: "Jo (runner)", question: "Which plate did you take to Table 1?" },
      title: "Jo: which plate",
      body: { type: "statement", speaker: "Jo (runner)", text: "The left one. Olu said so. The one with the little gold leaf." },
    },
    {
      id: "insight-gold",
      role: "archivist",
      chapter: 2,
      access: { kind: "crosscheck", pair: ["detail-plate-gold", "house-rules"] },
      title: "The wrong plate",
      body: { type: "finding", text: "Celeste's dessert had gold leaf, and only the owner's plate gets gold leaf." },
    },
    {
      id: "diner-message",
      role: "lookout",
      chapter: 2,
      access: { kind: "desk" },
      title: "A diner at Table 4",
      body: {
        type: "chat",
        title: "Feedback form",
        messages: [{ from: "Table 4", time: "10:30 PM", text: "Saw the sommelier fussing with two desserts at the pass right before the drama. Just saying." }],
      },
    },

    // ----- Chapter 3: the target ----------------------------------------------
    {
      id: "staff-medical",
      role: "archivist",
      chapter: 3,
      access: { kind: "desk" },
      title: "Staff medical sheet",
      body: {
        type: "document",
        text: "Kept in the office for emergencies.\nB. Carré (owner): SEVERE PEANUT ALLERGY. EpiPen in the top desk drawer.\nNo other staff allergies recorded.",
      },
    },
    {
      id: "photo-table9",
      role: "photographer",
      chapter: 3,
      access: { kind: "desk" },
      title: "Table 9",
      body: {
        type: "scene",
        caption: "Taken by Amélie · 10:10 PM · Table 9",
        look: "cafe",
        items: [
          { kind: "box", x: 0, y: 60, w: 100, h: 40, color: "#e9dcc7", radius: 1 },
          { kind: "art", x: 40, y: 20, w: 18, art: "suspect:square", hotspot: "bracelet" },
          { kind: "box", x: 18, y: 58, w: 22, h: 12, color: "#fffaf0", radius: 50, hotspot: "plate" },
        ],
      },
    },
    {
      id: "detail-bracelet",
      role: "photographer",
      chapter: 3,
      access: { kind: "inspect", scene: "photo-table9", hotspot: "bracelet" },
      title: "Bertrand's wrist",
      body: { type: "finding", text: "A medical bracelet on Bertrand's wrist: PEANUT ALLERGY. CARRIES EPIPEN." },
    },
    {
      id: "detail-clean-plate",
      role: "photographer",
      chapter: 3,
      after: ["bertrand-calendar"],
      access: { kind: "inspect", scene: "photo-table9", hotspot: "plate" },
      title: "Bertrand's plate",
      body: { type: "finding", text: "Bertrand's plate, scraped clean. He ate the critic's smudged dessert and felt fine." },
    },
    {
      id: "bertrand-calendar",
      role: "tech",
      chapter: 3,
      access: { kind: "search", terms: ["bertrand", "carre", "owner", "calendar"] },
      title: "Bertrand's calendar",
      body: {
        type: "log",
        source: "Calendar · B. Carré",
        rows: [
          { time: "Every night", text: "9:45 PM · Taste course 7 at Table 9" },
          { time: "Monday", text: "Sign the sale · Gastro Group" },
        ],
      },
    },
    {
      id: "question-bertrand-allergy",
      role: "interviewer",
      chapter: 3,
      access: { kind: "interview", suspect: "Bertrand Carré", question: "Do you have any allergies?" },
      title: "Bertrand: allergies",
      body: { type: "statement", speaker: "Bertrand Carré", text: "Peanuts. Deadly. Everyone here knows. Why do you ask?" },
    },
    {
      id: "question-amelie-gold",
      role: "interviewer",
      chapter: 3,
      after: ["insight-gold"],
      access: { kind: "interview", suspect: "Amélie Duret", question: "Who places the gold leaf?" },
      title: "Amélie: the gold leaf",
      body: { type: "statement", speaker: "Amélie Duret", text: "Ruth. Only Ruth. She plates the owner's dessert herself, every night." },
    },
    {
      id: "insight-target",
      role: "archivist",
      chapter: 3,
      access: { kind: "crosscheck", pair: ["insight-gold", "detail-bracelet"] },
      title: "Meant for the owner",
      body: { type: "finding", text: "The poisoned plate was the owner's, and the owner is deadly allergic to peanuts." },
    },

    // ----- Chapter 4: sweet revenge -------------------------------------------
    {
      id: "photo-pastry",
      role: "photographer",
      chapter: 4,
      access: { kind: "desk" },
      title: "The pastry station",
      body: {
        type: "scene",
        caption: "Taken by the police · 11:20 PM · pastry station",
        look: "kitchen",
        items: [
          { kind: "box", x: 0, y: 60, w: 100, h: 40, color: "#a7b0ba", radius: 1 },
          { kind: "box", x: 6, y: 30, w: 26, h: 32, color: "#f0ece4", radius: 4, text: "FLOUR", textColor: "#6b6b6b" },
          { kind: "box", x: 26, y: 40, w: 6, h: 20, color: "#d9a441", radius: 12, hotspot: "bottle" },
          { kind: "box", x: 44, y: 50, w: 14, h: 10, color: "#f2b33d", radius: 4, text: "Au", textColor: "#1b1f3b", hotspot: "leaf" },
          { kind: "box", x: 66, y: 46, w: 24, h: 14, color: "#c9ced4", radius: 6, text: "SCALE", textColor: "#6b6b6b" },
          { kind: "box", x: 72, y: 60, w: 12, h: 5, color: "#fff4e0", radius: 2, hotspot: "note" },
        ],
      },
    },
    {
      id: "detail-bottle",
      role: "photographer",
      chapter: 4,
      access: { kind: "inspect", scene: "photo-pastry", hotspot: "bottle" },
      title: "Behind the flour",
      body: { type: "finding", text: "Hidden behind the flour bins: a small bottle of peanut oil, a quarter gone." },
    },
    {
      id: "detail-leaf",
      role: "photographer",
      chapter: 4,
      access: { kind: "inspect", scene: "photo-pastry", hotspot: "leaf" },
      title: "Gold leaf",
      body: { type: "finding", text: "Booklets of gold leaf. The only ones in the whole kitchen." },
    },
    {
      id: "detail-note",
      role: "photographer",
      chapter: 4,
      access: { kind: "inspect", scene: "photo-pastry", hotspot: "note" },
      title: "Under the scale",
      body: { type: "finding", text: "A printed email, folded small: '…and the pastry section closes after the sale.'" },
    },
    {
      id: "storeroom-log",
      role: "tech",
      chapter: 4,
      after: ["detail-bottle"],
      access: { kind: "search", terms: ["storeroom", "stock", "peanutoil", "oil", "peanut"] },
      title: "Storeroom log",
      body: {
        type: "log",
        source: "Storeroom · sign-out sheet",
        rows: [
          { time: "9:15 PM", text: "Peanut oil, 250 ml · out · signed R. Vale" },
          { time: "", text: "Reason given: 'staff snacks'" },
          { time: "", text: "(Kept for the staff canteen, never for service)" },
        ],
      },
    },
    {
      id: "sale-email",
      role: "tech",
      chapter: 4,
      access: { kind: "search", terms: ["gastro", "gastrogroup", "sale", "buyer"] },
      title: "Email to Gastro Group",
      body: {
        type: "chat",
        title: "Sent · B. Carré → Gastro Group",
        messages: [
          { from: "Bertrand", time: "Tuesday", text: "After the sale, pastry goes. Keep Ruth's chocolate dome on the menu, we'll buy it in. Cheaper." },
        ],
      },
    },
    {
      id: "ruth-letter",
      role: "archivist",
      chapter: 4,
      access: { kind: "desk" },
      title: "A letter to Ruth",
      body: { type: "document", text: "To R. Vale, Pastry Chef.\nNotice: your position ends 31 March, following the change of ownership.\nB. Carré" },
    },
    {
      id: "question-ruth-nuts",
      role: "interviewer",
      chapter: 4,
      access: { kind: "interview", suspect: "Ruth Vale", question: "Is there anything with nuts in your section?" },
      title: "Ruth: nuts",
      body: { type: "statement", speaker: "Ruth Vale", text: "Never. This kitchen is nut-free. I would never take that risk." },
    },
    {
      id: "question-ruth-sale",
      role: "interviewer",
      chapter: 4,
      after: ["sale-email"],
      access: { kind: "interview", suspect: "Ruth Vale", question: "Did you know about the sale?" },
      title: "Ruth: the sale",
      body: { type: "statement", speaker: "Ruth Vale", text: "What sale? I make desserts. I don't read his emails." },
    },
    {
      id: "question-olu-storeroom",
      role: "interviewer",
      chapter: 4,
      after: ["storeroom-log"],
      access: { kind: "interview", suspect: "Olu Bello", question: "Did anyone go to the storeroom tonight?" },
      title: "Olu: the storeroom",
      body: { type: "statement", speaker: "Olu Bello", text: "Ruth, around quarter past nine. Said she was out of butter. Odd, mid-service." },
    },
    {
      id: "insight-oil",
      role: "archivist",
      chapter: 4,
      access: { kind: "crosscheck", pair: ["question-ruth-nuts", "storeroom-log"] },
      title: "Nut-free, apart from the oil",
      body: { type: "finding", text: "Ruth says no nuts ever come near her section. She signed out peanut oil at 9:15." },
    },
  ],
  solution: {
    culprit: "rectangle",
    motives: [
      { id: "revenge", label: "Revenge: he was selling up and closing her section" },
      { id: "review", label: "To ruin the review and the head chef" },
      { id: "critic", label: "She hated the critic" },
      { id: "accident", label: "An accident with the staff snacks" },
    ],
    motive: "revenge",
    keyEvidence: [
      "storeroom-log",
      "insight-oil",
      "detail-bottle",
      "detail-note",
      "sale-email",
      "ruth-letter",
      "insight-target",
      "staff-medical",
      "detail-bracelet",
      "question-amelie-gold",
      "detail-leaf",
      "house-rules",
      "insight-gold",
      "question-olu-storeroom",
      "detail-gone",
    ],
    explanation:
      "Ruth laced the owner's gold-leaf dessert with peanut oil she'd signed out at 9:15. Bertrand, deadly allergic, tastes it every night, and he was selling Maison Lune and closing her section. At the pass Olu swapped the plates over a smudge, so the critic, also allergic, ate the owner's plate. Bertrand ate hers and was fine.",
    timeline: [
      { time: "Tuesday", text: "Bertrand emails the buyer: pastry goes after the sale." },
      { time: "8:00 PM", text: "Celeste Hart sits at Table 1. Her booking flags a severe peanut allergy." },
      { time: "9:15 PM", text: "Ruth signs out peanut oil from the storeroom: 'staff snacks'." },
      { time: "9:44 PM", text: "Course seven is fired for Table 1 and for the owner at Table 9." },
      { time: "9:46 PM", text: "Ruth puts the gold-leaf plate, laced with oil, on the pass for Bertrand." },
      { time: "9:47 PM", text: "Olu spots a smudge on Table 1's plate and sends the clean gold-leaf plate to the critic." },
      { time: "9:52 PM", text: "Celeste collapses. Across the room, Bertrand finishes the smudged plate." },
    ],
    confession: [
      { kind: "line", who: "rectangle", text: "Twelve years of desserts. And he was going to sell the place and 'buy them in'." },
      { kind: "line", who: "rectangle", text: "One plate. His plate. I never meant the critic to touch it." },
      { kind: "line", who: "circle", text: "So my little smudge saved Bertrand's life. You're welcome." },
    ],
  },
};
