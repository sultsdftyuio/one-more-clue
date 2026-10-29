import type { CaseFile } from "@/lib/game/types";

/**
 * Case 001: The Last Message.
 *
 * Truth: Rena Voss took HALO. She came to the lab as "Northgate Capital's
 * engineer", but she works for Kestrel Dynamics, a rival. Professor Squires
 * broke the rules and left her alone in Lab 4 at 9:02. At 9:12 she used
 * Priya's unlocked laptop to edit Priya's 8:40 message into "Taking HALO
 * home", took HALO with the spare key, and walked out at 9:19. Her car reached
 * Kestrel's HQ at 9:48.
 *
 * Red herrings: Priya (the edited message), Professor Squires, who lies
 * about leaving with Rena and backfills the visitor sheet to hide that he left
 * a visitor alone, and Ozzy, whose round passes Lab 4 at 9:10. Checkpoint 2
 * catches the professor's lie, so the culprit is only named in the final report.
 *
 * Signature: the interrogation. In chapter 3 Rena tells her story claim by
 * claim; the team breaks each lie by presenting pinned evidence, and if they
 * catch all five she confesses.
 *
 * Hand-offs: the Archivist's chat shows the edit → the Tech searches the chat
 * history and Priya's laptop; the Photographer's 8:58 photo shows HALO still
 * there; the visitor sheet gives badge V-117 and a number plate for the Tech;
 * the lobby camera shows the Kestrel lanyard for the Tech to search.
 */
export const case001: CaseFile = {
  id: "case-001",
  code: "Case 001",
  title: "The Last Message",
  tagline: "A prototype vanishes. The last message says who took it. The message is lying.",
  theme: "noir",
  // Rendered by art/omc_cinema/case001_film.py. Hidden clue: the laptop's clock reads 9:12 while the message is rewritten.
  cinematic: { video: "/cinematics/case-001.mp4", poster: "/cinematics/case-001.jpg" },
  minPlayers: 2,
  maxPlayers: 6,
  story: [
    { kind: "title", text: "Halden University", sub: "Innovation Lab 4 · 9:17 PM" },
    { kind: "effect", effect: "flash", text: "9:17 PM. Cabinet B, wide open." },
    { kind: "message", from: "Ozzy (security)", time: "9:17 PM", text: "Lab 4, Cabinet B is wide open. HALO is GONE. Calling it in." },
    { kind: "narration", text: "HALO: smart glasses, three years of Priya Tran's work. The investor demo is tomorrow at nine." },
    { kind: "message", from: "Priya", time: "8:40 PM", text: "Taking HALO home tonight to fix the battery, don't panic", edited: true },
    { kind: "line", who: "triangle", text: "I didn't write that. I swear I didn't write that!", shocked: true },
    { kind: "narration", text: "Four people were in the building tonight. One of them is lying. Each of you holds different evidence. Talk." },
  ],
  briefing:
    "At 9:17 PM the night guard found Cabinet B in Lab 4 open and HALO, a smart-glasses prototype, gone. The last message in the lab chat says its creator, Priya, took it home. Priya says she never wrote it. Four people were in the building. Work out who took HALO, and why.",
  suspects: [
    { id: "triangle", art: "triangle", name: "Priya Tran", role: "PhD researcher", tint: 30, blurb: "Built HALO. Hasn't slept properly in a month." },
    { id: "square", art: "square", name: "Prof. Edmund Squires", role: "Lab director", tint: 310, blurb: "Needs tomorrow's investor demo to go perfectly." },
    { id: "circle", art: "circle", name: "Ozzy Reyes", role: "Night security", tint: 330, blurb: "Knows every corridor, and every football score." },
    { id: "rectangle", art: "rectangle", name: "Rena Voss", role: "Visiting engineer", tint: 20, blurb: "Here from Northgate Capital, the investors. Nobody had met her before tonight." },
  ],
  roles: [
    {
      id: "tech",
      core: true,
      ability: "search",
      name: "Tech",
      blurb: "You're in the university's systems: badges, laptops, chats, cars. Type a name, number or place to pull its records.",
    },
    {
      id: "interviewer",
      core: true,
      ability: "interview",
      name: "Interviewer",
      blurb: "You talk to people. The team gets six questions for the whole case, so choose them together.",
    },
    {
      id: "photographer",
      core: true,
      ability: "inspect",
      name: "Photographer",
      blurb: "You read pictures. Tap anything in a photo or camera still to look closer. Only you can, even on photos others pin.",
    },
    {
      id: "archivist",
      core: true,
      ability: "crosscheck",
      name: "Archivist",
      blurb: "You keep the paperwork and you catch liars. Hold two pieces of evidence up against each other to expose a contradiction.",
    },
    { id: "lookout", core: false, ability: "none", name: "Lookout", blurb: "You asked around campus. People notice cars." },
    { id: "profiler", core: false, ability: "none", name: "Profiler", blurb: "You know the people in this lab, and their habits." },
  ],
  chapters: [
    {
      title: "The last message",
      intro: "Priya's message says she took HALO home. Test it against the evidence.",
      story: [],
      checkpoint: {
        question: "Priya's message says she took HALO home. What's wrong with that?",
        options: [
          { id: "nothing", label: "Nothing. She took it." },
          { id: "after", label: "She left at 8:45, but HALO was still in the lab after that" },
          { id: "never", label: "She was never in the lab tonight" },
          { id: "phone", label: "It was sent from her phone at home" },
        ],
        answer: "after",
        reveal: "Priya badged out at 8:45, but HALO was still in Cabinet B at 8:58. And the message was edited on her laptop, in the lab, at 9:12.",
      },
      hints: [
        "Check when Priya left the building, then look at what the photos show after that.",
        "HALO is in a photo taken after Priya left. Look at the cabinet, and at the clock.",
      ],
    },
    {
      title: "The visitor",
      intro: "Someone in Lab 4 edited Priya's message at 9:12. Find out whose story about tonight doesn't hold up.",
      story: [
        { kind: "narration", text: "Priya's laptop was edited in the lab at 9:12, long after she'd gone. Who was still inside?" },
        { kind: "line", who: "square", text: "Ms Voss and I left together at nine. I'd stake my reputation on it." },
        { kind: "narration", text: "The security desk has dug out tonight's visitor sheet." },
      ],
      checkpoint: {
        question: "The professor says he and Rena left together at nine. What's wrong with his story?",
        options: [
          { id: "true", label: "Nothing. They walked out together." },
          { id: "early", label: "He left at 9:02, and filled in her sign-out later" },
          { id: "stayed", label: "He stayed in Lab 4 until 9:20" },
          { id: "ozzy", label: "Ozzy escorted her out, not him" },
        ],
        answer: "early",
        reveal: "The professor's badge left at 9:02, but the sheet says he signed his visitor out at 9:20. He filled it in later. So who was still in the building?",
      },
      hints: [
        "Compare when the professor's badge left with when he 'signed' his visitor out.",
        "The Archivist can hold the visitor sheet up against the badge log.",
      ],
    },
    {
      title: "The last clue",
      intro: "The professor left at 9:02. Someone still in the building took HALO. Rena has agreed to talk. Catch her lies, prove who took it, and why.",
      story: [
        { kind: "line", who: "square", text: "All right! I left her alone to take a call from the Dean. I filled in the sheet the next morning.", shocked: true },
        { kind: "narration", text: "After 9:02, two people were still near Lab 4: a visitor nobody knew, and a guard on his rounds." },
        { kind: "line", who: "circle", text: "I walk past that lab every night! Check my patrol log if you don't believe me.", shocked: true },
        { kind: "line", who: "rectangle", text: "I've told you everything. I drove home at nine." },
        { kind: "narration", text: "She's agreed to one interview. Pin what breaks her story, and listen closely." },
      ],
      hints: [
        "Two people were still around after 9:02. Check where each of them was at 9:12, and where each one went.",
        "The visitor sheet has a number plate. The Tech can search it.",
        "Look closely at her coat in the lobby camera.",
      ],
    },
  ],
  questionBudget: 6,
  interrogation: {
    suspect: "rectangle",
    chapter: 3,
    strikes: 3,
    claims: [
      { id: "invited", text: "Professor Squires invited me to see HALO before the demo." },
      {
        id: "northgate",
        text: "I'm a senior engineer at Northgate Capital.",
        lie: {
          breaks: ["kestrel-staff", "northgate-email", "detail-lanyard", "insight-employer"],
          crack: "Northgate, Kestrel… investors all look the same in the end, don't they?",
        },
      },
      {
        id: "together",
        text: "The professor was with me every single minute.",
        lie: {
          breaks: ["badge-log", "insight-sheet", "question-ozzy-round", "insight-together", "question-squires-sheet", "detail-alone"],
          crack: "Fine. He took a call from the Dean and left me waiting. Is that my fault?",
        },
      },
      { id: "priya", text: "I'd never met Priya Tran. I still haven't." },
      {
        id: "touched",
        text: "I didn't touch a single thing in that lab.",
        lie: {
          breaks: ["device-log", "chat-history", "detail-badge-clip", "detail-screen"],
          crack: "I checked something on a laptop. One laptop. Briefly.",
        },
      },
      {
        id: "coat",
        text: "I walked out with nothing but my coat.",
        lie: { breaks: ["detail-bag", "question-ozzy-bag", "cctv-lobby"], crack: "It's a tote bag. Everyone carries a tote bag." },
      },
      {
        id: "home",
        text: "And then I drove straight home.",
        lie: { breaks: ["anpr", "insight-home"], crack: "…I'd like to stop talking now." },
      },
    ],
    confession: "rena-confession",
    walkout: "This is harassment. I'm leaving, and Northgate's lawyers will be in touch.",
  },
  evidence: [
    // ----- Chapter 1: the last message ---------------------------------------
    {
      id: "lab-chat",
      role: "archivist",
      chapter: 1,
      access: { kind: "desk" },
      title: "Lab 4 group chat",
      body: {
        type: "chat",
        title: "Lab 4 crew",
        messages: [
          { from: "Prof. Squires", time: "6:05 PM", text: "Northgate demo at 9 tomorrow. NOBODY touches HALO." },
          { from: "Priya", time: "8:40 PM", text: "Taking HALO home tonight to fix the battery, don't panic", edited: true },
          { from: "Ozzy", time: "9:18 PM", text: "Cabinet B is open and EMPTY. Who has HALO??" },
          { from: "Prof. Squires", time: "9:25 PM", text: "Priya?! The demo is in twelve hours." },
        ],
      },
    },
    {
      id: "badge-log",
      role: "tech",
      chapter: 1,
      access: { kind: "desk" },
      title: "Building badge log",
      body: {
        type: "log",
        source: "Halden Innovation Building · badge readers",
        rows: [
          { time: "6:12 PM", text: "P. Tran · in · main door" },
          { time: "8:45 PM", text: "P. Tran · out · main door" },
          { time: "8:55 PM", text: "E. Squires + visitor V-117 · in · main door" },
          { time: "9:02 PM", text: "E. Squires · out · main door" },
          { time: "9:14 PM", text: "V-117 · out · Lab 4 door" },
          { time: "9:19 PM", text: "V-117 · out · main door" },
        ],
      },
    },
    {
      id: "statement-priya",
      role: "interviewer",
      chapter: 1,
      access: { kind: "desk" },
      title: "Priya's statement",
      body: {
        type: "statement",
        speaker: "Priya Tran",
        text: "I locked HALO in Cabinet B and left at quarter to nine. I posted that I'd LEFT it there. I never wrote 'taking it home'. Why would I steal my own project?",
      },
    },
    {
      id: "photo-linkedin",
      role: "photographer",
      chapter: 1,
      access: { kind: "desk" },
      title: "The professor's LinkedIn post",
      body: {
        type: "scene",
        caption: "Prof. Squires · posted 9:05 PM · \"Late-night demo prep with our friends at Northgate 🚀\"",
        look: "lab",
        items: [
          { kind: "label", x: 4, y: 5, text: "LAB 4", style: "sign" },
          { kind: "label", x: 72, y: 5, text: "8:58", style: "clock", hotspot: "clock" },
          { kind: "box", x: 5, y: 18, w: 22, h: 48, color: "#55667b", radius: 4 },
          { kind: "box", x: 8, y: 22, w: 16, h: 6, color: "#e9eef4", radius: 2, text: "B", textColor: "#1b1f3b" },
          { kind: "box", x: 9, y: 40, w: 14, h: 8, color: "#f2b33d", radius: 20, text: "HALO", textColor: "#1b1f3b", hotspot: "halo" },
          { kind: "box", x: 0, y: 70, w: 100, h: 30, color: "#7d8ea3", radius: 1 },
          { kind: "box", x: 36, y: 57, w: 16, h: 13, color: "#1b1f3b", radius: 6, text: "💬", hotspot: "laptop" },
          { kind: "art", x: 55, y: 22, w: 15, art: "suspect:square" },
          { kind: "art", x: 74, y: 27, w: 13, art: "suspect:rectangle", hotspot: "rena" },
          { kind: "box", x: 86, y: 58, w: 12, h: 13, color: "#3a2f4a", radius: 8, hotspot: "coat" },
        ],
      },
    },
    {
      id: "detail-halo",
      role: "photographer",
      chapter: 1,
      access: { kind: "inspect", scene: "photo-linkedin", hotspot: "halo" },
      title: "HALO in Cabinet B",
      body: { type: "finding", text: "HALO is sitting in Cabinet B, door open. Priya had already badged out." },
    },
    {
      id: "detail-clock",
      role: "photographer",
      chapter: 1,
      access: { kind: "inspect", scene: "photo-linkedin", hotspot: "clock" },
      title: "The lab clock",
      body: { type: "finding", text: "The wall clock reads 8:58. Posted at 9:05, but taken seven minutes earlier." },
    },
    {
      id: "detail-laptop",
      role: "photographer",
      chapter: 1,
      access: { kind: "inspect", scene: "photo-linkedin", hotspot: "laptop" },
      title: "Priya's laptop",
      body: { type: "finding", text: "Priya's laptop is open on the bench, unlocked, with the lab chat on screen." },
    },
    {
      id: "detail-rena",
      role: "photographer",
      chapter: 1,
      access: { kind: "inspect", scene: "photo-linkedin", hotspot: "rena" },
      title: "The visitor",
      body: { type: "finding", text: "The visitor, Rena Voss, is standing right beside Priya's open laptop." },
    },
    {
      id: "detail-lanyard-bird",
      role: "photographer",
      chapter: 1,
      access: { kind: "inspect", scene: "photo-linkedin", hotspot: "coat" },
      title: "A coat on the chair",
      body: { type: "finding", text: "A black lanyard pokes out of the coat on the chair. All you can see is a bird logo." },
    },
    {
      id: "device-log",
      role: "tech",
      chapter: 1,
      access: { kind: "search", terms: ["priya", "tran", "laptop", "priyalaptop"] },
      title: "PRIYA-LAPTOP",
      body: {
        type: "log",
        source: "University device management · PRIYA-LAPTOP",
        rows: [
          { time: "6:20 PM", text: "Logged in · Lab 4 Wi-Fi" },
          { time: "9:12 PM", text: "Lab chat: message edited" },
          { time: "9:16 PM", text: "Screen locked automatically" },
        ],
      },
    },
    {
      id: "asset-register",
      role: "tech",
      chapter: 1,
      access: { kind: "search", terms: ["halo", "cabinet", "cabinetb", "prototype"] },
      title: "Asset register: HALO",
      body: {
        type: "document",
        text: "HALO prototype (smart glasses). Kept in Cabinet B, Lab 4.\nKeys: P. Tran, E. Squires.\nSpare key: top drawer of the professor's desk.",
      },
    },
    {
      id: "question-priya-laptop",
      role: "interviewer",
      chapter: 1,
      access: { kind: "interview", suspect: "Priya Tran", question: "Did you leave your laptop in the lab?" },
      title: "Priya: her laptop",
      body: { type: "statement", speaker: "Priya Tran", text: "Yes, charging on the bench. I always do. I... didn't lock it. I never lock it." },
    },
    {
      id: "question-ozzy-found",
      role: "interviewer",
      chapter: 1,
      access: { kind: "interview", suspect: "Ozzy Reyes", question: "When did you find the cabinet open?" },
      title: "Ozzy: finding the cabinet",
      body: { type: "statement", speaker: "Ozzy Reyes", text: "9:17, on my round. Door wide open, key still in the lock. I called it in straight away." },
    },
    {
      id: "insight-message",
      role: "archivist",
      chapter: 1,
      access: { kind: "crosscheck", pair: ["lab-chat", "detail-halo"] },
      title: "The message doesn't fit",
      body: { type: "finding", text: "The chat says Priya took HALO home, but HALO is still in Cabinet B after she'd gone." },
    },
    {
      id: "profile-notes",
      role: "profiler",
      chapter: 1,
      access: { kind: "desk" },
      title: "Notes on the people",
      body: {
        type: "document",
        text: "Priya: three years on HALO. Sleeps in the lab some nights.\nProf. Squires: needs Northgate's money badly. Hates paperwork.\nOzzy: night guard, football on his phone.\nRena Voss: nobody had heard of her before today.",
      },
    },

    // ----- Chapter 2: the visitor ---------------------------------------------
    {
      id: "visitor-sheet",
      role: "archivist",
      chapter: 2,
      access: { kind: "desk" },
      title: "Tonight's visitor sheet",
      body: {
        type: "log",
        source: "Security desk · visitor sheet",
        rows: [
          { time: "8:55 PM", text: "Rena Voss · Northgate Capital · badge V-117" },
          { time: "", text: "Host: E. Squires · car: KX24 RVS" },
          { time: "9:20 PM", text: "Signed out (signed: E. Squires)" },
        ],
      },
    },
    {
      id: "photo-incident",
      role: "photographer",
      chapter: 2,
      access: { kind: "desk" },
      title: "Ozzy's incident photo",
      body: {
        type: "scene",
        caption: "Taken by Ozzy for the incident report · 9:20 PM",
        look: "lab",
        items: [
          { kind: "label", x: 4, y: 5, text: "LAB 4", style: "sign" },
          { kind: "label", x: 72, y: 5, text: "9:20", style: "clock" },
          { kind: "box", x: 5, y: 18, w: 22, h: 48, color: "#55667b", radius: 4, hotspot: "cabinet" },
          { kind: "box", x: 8, y: 22, w: 16, h: 6, color: "#e9eef4", radius: 2, text: "B", textColor: "#1b1f3b" },
          { kind: "box", x: 0, y: 70, w: 100, h: 30, color: "#7d8ea3", radius: 1 },
          { kind: "box", x: 36, y: 57, w: 16, h: 13, color: "#1b1f3b", radius: 6, text: "🔒", hotspot: "screen" },
          { kind: "box", x: 64, y: 86, w: 6, h: 4, color: "#ef5b5b", radius: 30, hotspot: "clip" },
        ],
      },
    },
    {
      id: "detail-cabinet",
      role: "photographer",
      chapter: 2,
      access: { kind: "inspect", scene: "photo-incident", hotspot: "cabinet" },
      title: "The empty cabinet",
      body: { type: "finding", text: "Cabinet B is empty and unforced. The key in the lock is the spare from the professor's desk." },
    },
    {
      id: "detail-screen",
      role: "photographer",
      chapter: 2,
      access: { kind: "inspect", scene: "photo-incident", hotspot: "screen" },
      title: "The laptop screen",
      body: { type: "finding", text: "Priya's laptop locked itself at 9:16. Someone used it just before." },
    },
    {
      id: "detail-badge-clip",
      role: "photographer",
      chapter: 2,
      access: { kind: "inspect", scene: "photo-incident", hotspot: "clip" },
      title: "Under the bench",
      body: { type: "finding", text: "A visitor badge clip under the bench. Printed on it: V-117." },
    },
    {
      id: "chat-history",
      role: "tech",
      chapter: 2,
      access: { kind: "search", terms: ["edit", "history", "chat", "labchat", "message"] },
      title: "Lab chat: edit history",
      body: {
        type: "log",
        source: "Lab 4 crew · message history",
        rows: [
          { time: "8:40 PM", text: "Priya: \"Leaving HALO in Cabinet B, locked. Night all\"" },
          { time: "9:12 PM", text: "Edited on PRIYA-LAPTOP (Lab 4 Wi-Fi)" },
          { time: "9:12 PM", text: "Now: \"Taking HALO home tonight to fix the battery…\"" },
        ],
      },
    },
    {
      id: "guard-tour",
      role: "tech",
      chapter: 2,
      access: { kind: "search", terms: ["ozzy", "reyes", "guard", "rounds", "patrol", "security"] },
      title: "Guard tour log: Ozzy",
      body: {
        type: "log",
        source: "Patrol checkpoints · O. Reyes",
        rows: [
          { time: "9:00 PM", text: "Checkpoint: lobby" },
          { time: "9:10 PM", text: "Checkpoint: Lab 4 corridor" },
          { time: "9:17 PM", text: "Checkpoint: Lab 4 · alarm raised" },
        ],
      },
    },
    {
      id: "question-squires-left",
      role: "interviewer",
      chapter: 2,
      access: { kind: "interview", suspect: "Prof. Edmund Squires", question: "When did you leave, and who with?" },
      title: "Squires: leaving",
      body: { type: "statement", speaker: "Prof. Edmund Squires", text: "Nine o'clock. Ms Voss and I walked out together, naturally. Visitors are always escorted." },
    },
    {
      id: "question-ozzy-round",
      role: "interviewer",
      chapter: 2,
      access: { kind: "interview", suspect: "Ozzy Reyes", question: "Who did you see on your 9:10 round?" },
      title: "Ozzy: the 9:10 round",
      body: { type: "statement", speaker: "Ozzy Reyes", text: "The visitor lady, alone at the Lab 4 door. Said she was waiting for the professor." },
    },
    {
      id: "question-rena-after",
      role: "interviewer",
      chapter: 2,
      access: { kind: "interview", suspect: "Rena Voss", question: "What did you do after the demo prep?" },
      title: "Rena: after the demo prep",
      body: { type: "statement", speaker: "Rena Voss", text: "Professor Squires and I left at nine. I drove straight home." },
    },
    {
      id: "question-priya-visitor",
      role: "interviewer",
      chapter: 2,
      access: { kind: "interview", suspect: "Priya Tran", question: "Did you know a visitor was coming?" },
      title: "Priya: the visitor",
      body: { type: "statement", speaker: "Priya Tran", text: "The professor said Northgate's engineer was coming at nine. I'd gone by then. I never met her." },
    },
    {
      id: "insight-sheet",
      role: "archivist",
      chapter: 2,
      access: { kind: "crosscheck", pair: ["visitor-sheet", "badge-log"] },
      title: "The sign-out that can't be",
      body: { type: "finding", text: "The professor 'signed Rena out' at 9:20, but his badge left the building at 9:02." },
    },
    {
      id: "insight-together",
      role: "archivist",
      chapter: 2,
      access: { kind: "crosscheck", pair: ["question-squires-left", "question-ozzy-round"] },
      title: "Not together after all",
      body: { type: "finding", text: "The professor says he and Rena left together at nine. Ozzy saw her alone at 9:10." },
    },
    {
      id: "car-park-message",
      role: "lookout",
      chapter: 2,
      access: { kind: "desk" },
      title: "The car park attendant",
      body: {
        type: "chat",
        title: "North Gate car park",
        messages: [{ from: "Dev (attendant)", time: "9:40 PM", text: "Silver hatchback left in a real hurry about 9:21. Lights off till the barrier." }],
      },
    },

    // ----- Chapter 3: the last clue -------------------------------------------
    {
      id: "cctv-lobby",
      role: "photographer",
      chapter: 3,
      access: { kind: "desk" },
      title: "Lobby camera",
      body: {
        type: "scene",
        caption: "Halden Innovation Building · lobby camera 2",
        look: "cctv",
        items: [
          { kind: "label", x: 4, y: 4, text: "CAM2 21:19:40", style: "stamp" },
          { kind: "box", x: 58, y: 12, w: 32, h: 72, color: "#6d6d6d", radius: 3, text: "EXIT", textColor: "#cfcfcf" },
          { kind: "art", x: 30, y: 28, w: 16, art: "suspect:rectangle", hotspot: "rena" },
          { kind: "box", x: 40, y: 56, w: 12, h: 14, color: "#8a8a8a", radius: 12, hotspot: "bag" },
          { kind: "label", x: 30, y: 74, text: "▮ K·ES·TR…", style: "stamp", hotspot: "lanyard" },
        ],
      },
    },
    {
      id: "detail-alone",
      role: "photographer",
      chapter: 3,
      access: { kind: "inspect", scene: "cctv-lobby", hotspot: "rena" },
      title: "Leaving alone",
      body: { type: "finding", text: "Rena Voss crossing the lobby at 9:19, alone. No professor anywhere." },
    },
    {
      id: "detail-bag",
      role: "photographer",
      chapter: 3,
      access: { kind: "inspect", scene: "cctv-lobby", hotspot: "bag" },
      title: "The tote bag",
      body: { type: "finding", text: "A big tote bag, held in both arms. Something rigid and boxy inside." },
    },
    {
      id: "detail-lanyard",
      role: "photographer",
      chapter: 3,
      access: { kind: "inspect", scene: "cctv-lobby", hotspot: "lanyard" },
      title: "The lanyard",
      body: { type: "finding", text: "Her lanyard has slipped out of her coat. The bird logo, and the letters KESTREL." },
    },
    {
      id: "anpr",
      role: "tech",
      chapter: 3,
      access: { kind: "search", terms: ["kx24rvs", "kx24", "plate", "anpr", "car", "numberplate"] },
      title: "Number plate KX24 RVS",
      body: {
        type: "log",
        source: "City number-plate cameras · KX24 RVS",
        rows: [
          { time: "9:21 PM", text: "Exit · Halden campus, North Gate" },
          { time: "9:48 PM", text: "Entry · Kestrel Dynamics HQ car park" },
        ],
      },
    },
    {
      id: "kestrel-staff",
      role: "tech",
      chapter: 3,
      access: { kind: "search", terms: ["kestrel", "kestreldynamics"] },
      title: "Kestrel Dynamics",
      body: {
        type: "document",
        text: "Kestrel Dynamics: smart-glasses start-up, Halden's biggest rival.\nTeam page: Rena Voss, Senior Engineer (joined March).\nNews: 'Kestrel promises glasses launch within the year.'",
      },
    },
    {
      id: "northgate-email",
      role: "archivist",
      chapter: 3,
      access: { kind: "desk" },
      title: "Email from Northgate Capital",
      body: {
        type: "chat",
        title: "Inbox · Prof. Squires",
        messages: [
          {
            from: "Northgate Capital",
            time: "8:10 AM",
            text: "Professor, we don't have an engineer called Rena Voss. Our technical visit is next Tuesday. Is everything all right?",
          },
        ],
      },
    },
    {
      id: "question-rena-employer",
      role: "interviewer",
      chapter: 3,
      access: { kind: "interview", suspect: "Rena Voss", question: "Who do you really work for?" },
      title: "Rena: her employer",
      body: { type: "statement", speaker: "Rena Voss", text: "Northgate Capital. As I've said. Several times." },
    },
    {
      id: "question-squires-sheet",
      role: "interviewer",
      chapter: 3,
      access: { kind: "interview", suspect: "Prof. Edmund Squires", question: "Why did you sign her out at 9:20?" },
      title: "Squires: the visitor sheet",
      body: {
        type: "statement",
        speaker: "Prof. Edmund Squires",
        text: "I filled it in the next morning. The Dean called about our funding and I... left her alone. Against the rules, I know.",
      },
    },
    {
      id: "question-ozzy-bag",
      role: "interviewer",
      chapter: 3,
      access: { kind: "interview", suspect: "Ozzy Reyes", question: "Did the visitor carry anything out?" },
      title: "Ozzy: the bag",
      body: { type: "statement", speaker: "Ozzy Reyes", text: "A big tote bag. Held it like a baby. Didn't think anything of it at the time." },
    },
    {
      id: "insight-employer",
      role: "archivist",
      chapter: 3,
      access: { kind: "crosscheck", pair: ["question-rena-employer", "kestrel-staff"] },
      title: "Northgate? No, Kestrel",
      body: { type: "finding", text: "Rena says she works for Northgate. Kestrel Dynamics lists her as a senior engineer." },
    },
    {
      id: "insight-home",
      role: "archivist",
      chapter: 3,
      access: { kind: "crosscheck", pair: ["question-rena-after", "anpr"] },
      title: "Not home",
      body: { type: "finding", text: "Rena says she drove straight home. Her car went to Kestrel's headquarters at 9:48." },
    },
    {
      id: "rena-confession",
      role: "interviewer",
      chapter: 3,
      access: { kind: "interrogation" },
      title: "Rena's confession",
      body: {
        type: "statement",
        speaker: "Rena Voss",
        text: "Kestrel sent me. When the professor left, I changed Priya's message on her laptop, opened the cabinet with his spare key and carried HALO out in my bag. It's in Kestrel's lab now.",
      },
    },
  ],
  solution: {
    culprit: "rectangle",
    motives: [
      { id: "rival", label: "She was stealing HALO for a rival company" },
      { id: "revenge", label: "Revenge on Professor Squires" },
      { id: "frame", label: "To get Priya thrown out and take her place" },
      { id: "test", label: "To test the lab's security for the investors" },
    ],
    motive: "rival",
    keyEvidence: [
      "rena-confession",
      "anpr",
      "kestrel-staff",
      "northgate-email",
      "insight-employer",
      "insight-home",
      "detail-lanyard",
      "detail-bag",
      "detail-badge-clip",
      "insight-together",
      "insight-sheet",
      "question-ozzy-round",
      "chat-history",
      "cctv-lobby",
    ],
    explanation:
      "Rena Voss wasn't Northgate's engineer: she works for Kestrel Dynamics, Halden's rival. Professor Squires left her alone in Lab 4 at 9:02. At 9:12 she used Priya's unlocked laptop to edit Priya's message so everyone would chase Priya, took HALO with the spare key, and carried it out in a tote bag at 9:19. By 9:48 her car was at Kestrel's HQ. The professor lied only to hide that he'd left a visitor alone.",
    timeline: [
      { time: "8:40 PM", text: "Priya posts: \"Leaving HALO in Cabinet B, locked.\"" },
      { time: "8:45 PM", text: "Priya leaves her laptop charging, unlocked, and badges out." },
      { time: "8:55 PM", text: "Professor Squires signs in Rena Voss as Northgate's engineer." },
      { time: "8:58 PM", text: "Squires takes a photo for LinkedIn. HALO is in the cabinet." },
      { time: "9:02 PM", text: "The Dean calls. Squires leaves Rena alone in Lab 4." },
      { time: "9:10 PM", text: "Ozzy sees Rena waiting at the lab door. She says she's waiting for the professor." },
      { time: "9:12 PM", text: "Rena edits Priya's message on Priya's laptop, then opens Cabinet B with the spare key." },
      { time: "9:17 PM", text: "Ozzy finds Cabinet B empty and raises the alarm." },
      { time: "9:19 PM", text: "Rena walks out through the lobby with a heavy tote bag." },
      { time: "9:48 PM", text: "Rena's car pulls into Kestrel Dynamics' car park." },
    ],
    confession: [
      { kind: "line", who: "rectangle", text: "Kestrel was paying three times what Northgate ever would have." },
      { kind: "line", who: "rectangle", text: "Priya left her laptop unlocked. One edit, and you'd all chase her instead of me." },
      { kind: "line", who: "triangle", text: "Three years of my life. In a tote bag." },
      { kind: "line", who: "square", text: "I am... going to need a new visitor policy." },
    ],
  },
};
