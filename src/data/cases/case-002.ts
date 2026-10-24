import type { CaseFile } from "@/lib/game/types";

/**
 * Case 002: Dead Air.
 *
 * Truth: Vince Valentine staged the "attack" on his own show. He owed £4,800
 * to a betting site and had the £5,000 jackpot envelope in his hand. At 11:57
 * he lowered the booth blind, at 11:58 he pulled his own mic fader down, at
 * 11:59 he stepped out and locked Studio A with his own code, then lay down in
 * the corridor shouting about a masked attacker. At 12:31 he put the envelope
 * in his car boot.
 *
 * What makes it different: the "victim" did it. The case turns on what the
 * equipment says against what Vince says: the desk, the rack, the door.
 *
 * Hand-offs: the photo shows the cables are fine → the Archivist catches the
 * lie; the door log (Tech) shows nobody came in; Darla mentions SpinKings in
 * an interview → the Tech searches it.
 */
export const case002: CaseFile = {
  id: "case-002",
  code: "Case 002",
  title: "Dead Air",
  tagline: "Nine minutes of silence, one missing jackpot, and a victim who's a little too calm.",
  minPlayers: 2,
  maxPlayers: 6,
  story: [
    { kind: "title", text: "KNHT 99.1 FM", sub: "Night Owls · 11:58 PM" },
    { kind: "narration", text: "Vince Valentine was about to give away the £5,000 Night Owl jackpot, live. Then: nothing. Nine minutes of dead air." },
    { kind: "message", from: "Tess (producer)", time: "11:59 PM", text: "VINCE ARE YOU OK?? Why is the booth blind down??" },
    { kind: "line", who: "square", text: "Someone attacked me! A man in a balaclava! He took the jackpot!", shocked: true },
    { kind: "narration", text: "The station is locked down. Four people were in the building. Find out what really happened in Studio A." },
  ],
  briefing:
    "At 11:58 PM the Night Owls show on KNHT 99.1 went silent for nine minutes, just before host Vince Valentine was due to give away a £5,000 jackpot. Vince was found in the corridor outside his locked studio, saying a masked man attacked him and took the money. Four people were in the building. Work out what really happened.",
  suspects: [
    { id: "square", art: "square", name: "Vince Valentine", role: "Late-night host", blurb: "The voice of Night Owls. Loves an audience." },
    { id: "triangle", art: "triangle", name: "Tess Okoye", role: "Producer", blurb: "Runs the show from the control room. Panics quietly." },
    { id: "circle", art: "circle", name: "Gus Marley", role: "Night engineer", blurb: "Keeps the station on air. Takes a lot of smoke breaks." },
    { id: "rectangle", art: "rectangle", name: "Darla Kingsley", role: "Midnight DJ", blurb: "Hosts the show after Vince. Wants his slot, and says so." },
  ],
  roles: [
    { id: "tech", core: true, ability: "search", name: "Tech", blurb: "You're in the station's systems: transmitter, doors, phones. Type a name, place or company to pull its records." },
    { id: "interviewer", core: true, ability: "interview", name: "Interviewer", blurb: "You talk to people. The team gets six questions for the whole case, so choose them together." },
    { id: "photographer", core: true, ability: "inspect", name: "Photographer", blurb: "You read pictures. Tap anything in a photo or camera still to look closer. Only you can." },
    { id: "archivist", core: true, ability: "crosscheck", name: "Archivist", blurb: "You keep the paperwork and you catch liars. Hold two pieces of evidence up against each other." },
    { id: "lookout", core: false, ability: "none", name: "Lookout", blurb: "You took the listener calls tonight. Listeners hear everything." },
    { id: "profiler", core: false, ability: "none", name: "Profiler", blurb: "You know everyone at this station, and their habits." },
  ],
  chapters: [
    {
      title: "Dead air",
      intro: "Vince says the attacker ripped the cables out. Find out what really stopped the sound.",
      story: [],
      checkpoint: {
        question: "How was the show cut off at 11:58?",
        options: [
          { id: "rack", label: "Cables ripped out of the rack" },
          { id: "fader", label: "The mic fader pulled down at the desk, inside the booth" },
          { id: "transmitter", label: "The transmitter failed" },
          { id: "power", label: "A power cut" },
        ],
        answer: "fader",
        reveal: "Every cable was still plugged in and the transmitter was fine. Someone inside the booth pulled MIC 1 down at 11:58:02.",
      },
      hints: [
        "Find out what actually stopped the sound: the cables, the transmitter, or the desk.",
        "Look closely at the booth photo, and at the transmitter log's 11:58 lines.",
      ],
    },
    {
      title: "Locked out",
      intro: "Vince says the attacker shoved him out and slammed the door. Find out who locked Studio A.",
      story: [
        { kind: "narration", text: "Nothing was ripped out. Someone pulled the fader down by hand, inside the booth." },
        { kind: "line", who: "square", text: "Inside? Then he was in there with me! Obviously!" },
      ],
      checkpoint: {
        question: "Who locked the Studio A door at 11:59?",
        options: [
          { id: "triangle", label: "Tess Okoye" },
          { id: "square", label: "Vince Valentine" },
          { id: "circle", label: "Gus Marley" },
          { id: "rectangle", label: "Darla Kingsley" },
        ],
        answer: "square",
        reveal: "Nobody entered Studio A after Vince at 11:31. Tess was in the control room, Gus outside, Darla on the phone. Vince locked his own door.",
      },
      hints: [
        "Check who the door let in, not just who it locked.",
        "The Tech can pull the door log. Then check where each of the others was.",
      ],
    },
    {
      title: "The jackpot",
      intro: "There was no attacker. So where is the £5,000, and why would Vince take it?",
      story: [
        { kind: "narration", text: "Nobody came through that door after Vince. Nobody but Vince locked it." },
        { kind: "line", who: "square", text: "That keypad is broken! Everyone knows my code!", shocked: true },
        { kind: "narration", text: "There's still £5,000 missing. Find it, and find out why." },
      ],
      hints: [
        "Where did the jackpot envelope go? Look at the car park.",
        "Ask around about why Vince might need £5,000. Someone has noticed his phone.",
        "The Tech can search the betting company by name.",
      ],
    },
  ],
  questionBudget: 6,
  evidence: [
    // ----- Chapter 1: dead air ------------------------------------------------
    {
      id: "transmitter-log",
      role: "tech",
      chapter: 1,
      access: { kind: "desk" },
      title: "Transmitter log",
      body: {
        type: "log",
        source: "KNHT 99.1 · transmitter and desk",
        rows: [
          { time: "11:55:10", text: "Studio A on air · V. Valentine" },
          { time: "11:58:02", text: "Studio A desk · MIC 1 fader down" },
          { time: "11:58:04", text: "Silence alarm · Studio A output" },
          { time: "12:07:30", text: "Studio B on air · D. Kingsley" },
          { time: "", text: "Rack and transmitter: no faults all night" },
        ],
      },
    },
    {
      id: "statement-vince",
      role: "interviewer",
      chapter: 1,
      access: { kind: "desk" },
      title: "Vince's statement",
      body: {
        type: "statement",
        speaker: "Vince Valentine",
        text: "A man in a balaclava burst in, ripped the cables out of the rack and shoved me into the corridor. He slammed the door and took the jackpot. I banged on that door for ages!",
      },
    },
    {
      id: "jackpot-sheet",
      role: "archivist",
      chapter: 1,
      access: { kind: "desk" },
      title: "Jackpot sign-out sheet",
      body: {
        type: "log",
        source: "Station safe · sign-out sheet",
        rows: [
          { time: "11:40 PM", text: "Jackpot envelope (red) · £5,000 · out" },
          { time: "", text: "Signed: V. Valentine · 'for the live giveaway'" },
          { time: "", text: "Returned: (blank)" },
        ],
      },
    },
    {
      id: "photo-booth",
      role: "photographer",
      chapter: 1,
      access: { kind: "desk" },
      title: "Studio A, after",
      body: {
        type: "scene",
        caption: "Taken by Gus · 12:03 AM · Studio A",
        look: "office",
        items: [
          { kind: "label", x: 6, y: 6, text: "ON AIR", style: "sign" },
          { kind: "box", x: 64, y: 10, w: 30, h: 56, color: "#2b2b3a", radius: 3, text: "RACK", textColor: "#9aa3b5", hotspot: "rack" },
          { kind: "box", x: 0, y: 66, w: 100, h: 34, color: "#3b3346", radius: 1 },
          { kind: "box", x: 8, y: 54, w: 46, h: 14, color: "#1b1f3b", radius: 6 },
          { kind: "box", x: 14, y: 56, w: 5, h: 10, color: "#ef5b5b", radius: 2, text: "1", textColor: "#fff", hotspot: "fader" },
          { kind: "box", x: 22, y: 56, w: 5, h: 6, color: "#9aa3b5", radius: 2 },
          { kind: "box", x: 30, y: 56, w: 5, h: 6, color: "#9aa3b5", radius: 2 },
          { kind: "box", x: 44, y: 46, w: 7, h: 9, color: "#fff4e0", radius: 20, text: "☕", hotspot: "mug" },
          { kind: "box", x: 36, y: 74, w: 18, h: 8, color: "#ef5b5b", radius: 3, text: "JACKPOT", textColor: "#fff", hotspot: "tray" },
        ],
      },
    },
    {
      id: "detail-fader",
      role: "photographer",
      chapter: 1,
      access: { kind: "inspect", scene: "photo-booth", hotspot: "fader" },
      title: "The MIC 1 fader",
      body: { type: "finding", text: "MIC 1 is pulled all the way down, neatly. Every other fader is exactly where it was." },
    },
    {
      id: "detail-rack",
      role: "photographer",
      chapter: 1,
      access: { kind: "inspect", scene: "photo-booth", hotspot: "rack" },
      title: "The rack",
      body: { type: "finding", text: "Every cable in the rack is plugged in. Nothing ripped, nothing loose, nothing bent." },
    },
    {
      id: "detail-mug",
      role: "photographer",
      chapter: 1,
      access: { kind: "inspect", scene: "photo-booth", hotspot: "mug" },
      title: "A full mug",
      body: { type: "finding", text: "A full mug of coffee, upright on the very edge of the desk. Some struggle." },
    },
    {
      id: "detail-tray",
      role: "photographer",
      chapter: 1,
      access: { kind: "inspect", scene: "photo-booth", hotspot: "tray" },
      title: "The jackpot tray",
      body: { type: "finding", text: "The tray marked JACKPOT is empty. No envelope anywhere in the booth." },
    },
    {
      id: "booth-log",
      role: "tech",
      chapter: 1,
      access: { kind: "search", terms: ["booth", "blind", "boothcontrols"] },
      title: "Studio A booth controls",
      body: {
        type: "log",
        source: "Studio A · booth controls",
        rows: [
          { time: "11:57:12", text: "Booth blind lowered · host switch" },
          { time: "11:58:02", text: "MIC 1 fader down · desk" },
        ],
      },
    },
    {
      id: "question-tess-glass",
      role: "interviewer",
      chapter: 1,
      access: { kind: "interview", suspect: "Tess Okoye", question: "What did you see from the control room?" },
      title: "Tess: through the glass",
      body: { type: "statement", speaker: "Tess Okoye", text: "Nothing! The booth blind came down at 11:57. Then silence. I thought Vince had fainted." },
    },
    {
      id: "question-gus-cables",
      role: "interviewer",
      chapter: 1,
      access: { kind: "interview", suspect: "Gus Marley", question: "Did you check the cables?" },
      title: "Gus: the cables",
      body: { type: "statement", speaker: "Gus Marley", text: "First thing I did. All plugged in, all fine. Whatever cut the show, it wasn't the rack." },
    },
    {
      id: "insight-cables",
      role: "archivist",
      chapter: 1,
      access: { kind: "crosscheck", pair: ["statement-vince", "detail-rack"] },
      title: "The cables that weren't ripped",
      body: { type: "finding", text: "Vince says the cables were ripped out. Every cable in the rack is still plugged in." },
    },
    {
      id: "station-notes",
      role: "profiler",
      chapter: 1,
      access: { kind: "desk" },
      title: "Notes on the station",
      body: {
        type: "document",
        text: "Vince: contract talks next week. Always on his phone between songs.\nTess: by the book. Never leaves the control room.\nGus: smoke break every hour, on the hour.\nDarla: wants the Night Owls slot. Says so, loudly.",
      },
    },

    // ----- Chapter 2: locked out ----------------------------------------------
    {
      id: "staff-radio",
      role: "archivist",
      chapter: 2,
      access: { kind: "desk" },
      title: "Staff radio log",
      body: {
        type: "chat",
        title: "Station walkie-talkies",
        messages: [
          { from: "Tess", time: "12:00 AM", text: "Gus! Studio A, NOW. Vince is on the floor." },
          { from: "Gus", time: "12:00 AM", text: "Out back. Coming in the fire door, thirty seconds." },
          { from: "Darla", time: "12:06 AM", text: "Putting myself on air from Studio B. Someone has to." },
        ],
      },
    },
    {
      id: "photo-corridor",
      role: "photographer",
      chapter: 2,
      access: { kind: "desk" },
      title: "The corridor",
      body: {
        type: "scene",
        caption: "Taken by Gus · 12:02 AM · outside Studio A",
        look: "office",
        items: [
          { kind: "box", x: 58, y: 8, w: 26, h: 62, color: "#4a3d55", radius: 3, text: "STUDIO A", textColor: "#fff4e0" },
          { kind: "box", x: 86, y: 32, w: 8, h: 12, color: "#1b1f3b", radius: 4, text: "▦", textColor: "#3fb8af", hotspot: "keypad" },
          { kind: "box", x: 0, y: 72, w: 100, h: 28, color: "#3b3346", radius: 1 },
          { kind: "art", x: 16, y: 50, w: 16, art: "suspect:square", rotate: -70, hotspot: "vince" },
        ],
      },
    },
    {
      id: "detail-keypad",
      role: "photographer",
      chapter: 2,
      access: { kind: "inspect", scene: "photo-corridor", hotspot: "keypad" },
      title: "The keypad",
      body: { type: "finding", text: "The keypad's little screen still shows: LOCKED 23:59 · USER 0451." },
    },
    {
      id: "detail-vince-floor",
      role: "photographer",
      chapter: 2,
      access: { kind: "inspect", scene: "photo-corridor", hotspot: "vince" },
      title: "Vince on the floor",
      body: { type: "finding", text: "Vince on the corridor floor. Hair perfect, shirt tucked in, not a scratch on him." },
    },
    {
      id: "door-log",
      role: "tech",
      chapter: 2,
      access: { kind: "search", terms: ["door", "keypad", "lock", "0451"] },
      title: "Studio A door log",
      body: {
        type: "log",
        source: "Studio A · keypad",
        rows: [
          { time: "11:31:00", text: "Entry · code 0451 (V. Valentine)" },
          { time: "11:59:10", text: "Exit · from inside" },
          { time: "11:59:30", text: "Locked from corridor · code 0451 (V. Valentine)" },
          { time: "", text: "No other entries tonight" },
        ],
      },
    },
    {
      id: "darla-phone",
      role: "tech",
      chapter: 2,
      access: { kind: "search", terms: ["darla", "kingsley", "greenroom"] },
      title: "Darla's phone and the green room",
      body: {
        type: "log",
        source: "Phone records · D. Kingsley",
        rows: [
          { time: "11:54 PM", text: "Call to 'Agent - Mo' · 13 minutes" },
          { time: "11:56 PM", text: "Green room vending machine · card tap" },
        ],
      },
    },
    {
      id: "fire-door",
      role: "tech",
      chapter: 2,
      access: { kind: "search", terms: ["gus", "marley", "firedoor", "fire", "smoke"] },
      title: "Fire exit camera",
      body: {
        type: "log",
        source: "Fire exit · door and camera",
        rows: [
          { time: "11:56 PM", text: "Fire door out · G. Marley (camera: smoking)" },
          { time: "12:01 AM", text: "Fire door in · G. Marley" },
        ],
      },
    },
    {
      id: "question-vince-code",
      role: "interviewer",
      chapter: 2,
      access: { kind: "interview", suspect: "Vince Valentine", question: "Who knows your door code?" },
      title: "Vince: the code",
      body: { type: "statement", speaker: "Vince Valentine", text: "Everyone! It's 0451, my birthday's on the station wiki. The attacker must have used it." },
    },
    {
      id: "question-darla-where",
      role: "interviewer",
      chapter: 2,
      access: { kind: "interview", suspect: "Darla Kingsley", question: "Where were you at 11:58?" },
      title: "Darla: 11:58",
      body: { type: "statement", speaker: "Darla Kingsley", text: "Green room, on the phone to my agent about Vince's slot. Ask him. Ask the vending machine." },
    },
    {
      id: "question-gus-where",
      role: "interviewer",
      chapter: 2,
      access: { kind: "interview", suspect: "Gus Marley", question: "Where were you at midnight?" },
      title: "Gus: midnight",
      body: { type: "statement", speaker: "Gus Marley", text: "Out back having a smoke, like every hour. Came running the second Tess radioed." },
    },
    {
      id: "question-tess-blind",
      role: "interviewer",
      chapter: 2,
      access: { kind: "interview", suspect: "Tess Okoye", question: "Who can lower the booth blind?" },
      title: "Tess: the blind",
      body: { type: "statement", speaker: "Tess Okoye", text: "Only the host. The switch is on his desk, inside the booth." },
    },
    {
      id: "insight-nobody",
      role: "archivist",
      chapter: 2,
      access: { kind: "crosscheck", pair: ["statement-vince", "door-log"] },
      title: "Nobody burst in",
      body: { type: "finding", text: "Vince says an attacker burst in. The door log shows nobody entered after Vince himself at 11:31." },
    },
    {
      id: "listener-calls",
      role: "lookout",
      chapter: 2,
      access: { kind: "desk" },
      title: "Listener call log",
      body: {
        type: "chat",
        title: "Night Owls call line",
        messages: [
          { from: "Caller, Hollybrook", time: "11:57 PM", text: "Is Vince OK? He sounded like he was trying not to laugh just now." },
          { from: "Caller, East Pier", time: "12:01 AM", text: "Did I win the jackpot or not??" },
        ],
      },
    },

    // ----- Chapter 3: the jackpot ---------------------------------------------
    {
      id: "cctv-carpark",
      role: "photographer",
      chapter: 3,
      access: { kind: "desk" },
      title: "Car park camera",
      body: {
        type: "scene",
        caption: "KNHT car park · camera 4",
        look: "cctv",
        items: [
          { kind: "label", x: 4, y: 4, text: "CAM4 00:31:12", style: "stamp" },
          { kind: "box", x: 46, y: 46, w: 46, h: 26, color: "#7a7a7a", radius: 18, hotspot: "boot" },
          { kind: "art", x: 22, y: 26, w: 17, art: "suspect:square", hotspot: "vince" },
          { kind: "box", x: 36, y: 48, w: 8, h: 6, color: "#b0b0b0", radius: 2, hotspot: "envelope" },
        ],
      },
    },
    {
      id: "detail-envelope",
      role: "photographer",
      chapter: 3,
      access: { kind: "inspect", scene: "cctv-carpark", hotspot: "envelope" },
      title: "In his hand",
      body: { type: "finding", text: "An envelope in Vince's hand, the size of the jackpot envelope. In colour it would be red." },
    },
    {
      id: "detail-boot",
      role: "photographer",
      chapter: 3,
      access: { kind: "inspect", scene: "cctv-carpark", hotspot: "boot" },
      title: "The open boot",
      body: { type: "finding", text: "He's putting something into the boot, not taking anything out." },
    },
    {
      id: "detail-alone-car",
      role: "photographer",
      chapter: 3,
      access: { kind: "inspect", scene: "cctv-carpark", hotspot: "vince" },
      title: "Vince at his car",
      body: { type: "finding", text: "Vince at his car at 12:31, alone, half an hour before the police arrived." },
    },
    {
      id: "winner-message",
      role: "archivist",
      chapter: 3,
      access: { kind: "desk" },
      title: "The winner's message",
      body: {
        type: "chat",
        title: "Inbox · Night Owls",
        messages: [{ from: "Mrs Patel (winner)", time: "8:12 AM", text: "Vince read my name out at 11:55! When do I get my £5,000?" }],
      },
    },
    {
      id: "spinkings",
      role: "tech",
      chapter: 3,
      access: { kind: "search", terms: ["spinkings", "spinking", "betting", "bet", "gambling"] },
      title: "SpinKings account",
      body: {
        type: "log",
        source: "SpinKings · account V. Valentine",
        rows: [
          { time: "Tonight", text: "Balance owed: £4,800 · FINAL DEMAND" },
          { time: "9:00 AM", text: "Payment due, or the debt goes to collectors" },
          { time: "11:51 PM", text: "Logged in · Studio A Wi-Fi" },
        ],
      },
    },
    {
      id: "question-vince-envelope",
      role: "interviewer",
      chapter: 3,
      access: { kind: "interview", suspect: "Vince Valentine", question: "Where is the jackpot envelope?" },
      title: "Vince: the envelope",
      body: { type: "statement", speaker: "Vince Valentine", text: "The attacker took it, obviously! It was on the desk when he burst in." },
    },
    {
      id: "question-gus-after",
      role: "interviewer",
      chapter: 3,
      access: { kind: "interview", suspect: "Gus Marley", question: "Did you see Vince after the 'attack'?" },
      title: "Gus: after",
      body: { type: "statement", speaker: "Gus Marley", text: "He nipped out to his car before the police came. Said he needed his inhaler." },
    },
    {
      id: "question-darla-why",
      role: "interviewer",
      chapter: 3,
      access: { kind: "interview", suspect: "Darla Kingsley", question: "Who'd want to hurt Vince?" },
      title: "Darla: who'd want to",
      body: { type: "statement", speaker: "Darla Kingsley", text: "Nobody wants to HURT him. Ask SpinKings who he owes. He's on that betting app between every song." },
    },
    {
      id: "insight-envelope",
      role: "archivist",
      chapter: 3,
      access: { kind: "crosscheck", pair: ["question-vince-envelope", "detail-envelope"] },
      title: "The envelope he still had",
      body: { type: "finding", text: "Vince says the attacker took the envelope. At 12:31 it's in his hand in the car park." },
    },
  ],
  solution: {
    culprit: "square",
    motives: [
      { id: "debt", label: "He owed £4,800 to a betting site and took the jackpot" },
      { id: "darla", label: "To get Darla blamed and her show cancelled" },
      { id: "ratings", label: "A publicity stunt for ratings" },
      { id: "contract", label: "To get out of his contract" },
    ],
    motive: "debt",
    keyEvidence: [
      "transmitter-log",
      "booth-log",
      "detail-fader",
      "detail-rack",
      "insight-cables",
      "door-log",
      "insight-nobody",
      "detail-keypad",
      "cctv-carpark",
      "detail-envelope",
      "detail-boot",
      "insight-envelope",
      "spinkings",
      "question-gus-after",
    ],
    explanation:
      "There was no attacker. Vince owed SpinKings £4,800 by 9 AM and had the £5,000 jackpot in his hand. He lowered the blind, pulled his own mic down, locked Studio A with his own code and lay down in the corridor. Nobody else entered the studio all night. At 12:31 he put the envelope in his car boot.",
    timeline: [
      { time: "11:31 PM", text: "Vince enters Studio A. Nobody else enters all night." },
      { time: "11:40 PM", text: "Vince signs the £5,000 jackpot envelope out of the safe." },
      { time: "11:51 PM", text: "Vince checks his SpinKings account: £4,800 due by morning." },
      { time: "11:55 PM", text: "On air: 'The jackpot winner is… Mrs Patel! After the break!'" },
      { time: "11:57 PM", text: "Vince lowers the booth blind. Tess can't see in." },
      { time: "11:58 PM", text: "Vince pulls MIC 1 down. Dead air." },
      { time: "11:59 PM", text: "He steps out and locks Studio A with his own code, then lies down in the corridor." },
      { time: "12:07 AM", text: "Darla puts herself on air from Studio B." },
      { time: "12:31 AM", text: "Vince puts the jackpot envelope in his car boot." },
    ],
    confession: [
      { kind: "line", who: "square", text: "SpinKings wanted their money by nine. And the jackpot was right there in my hand." },
      { kind: "line", who: "square", text: "No attacker, no blame. I'd have been the brave survivor on every front page." },
      { kind: "line", who: "rectangle", text: "Next time, Vince, just play a record." },
    ],
  },
};
