import type { CaseFile } from "@/lib/game/types";

/**
 * Case 004: Snowed In.
 *
 * Truth: Otto Brennan, the lodge owner, stole the Aurora necklace to save his
 * bankrupt lodge. He took Greta's master keycard at 8:30, used it to open the
 * breaker room at 11:59:40, cut the power at midnight, unlocked the display
 * case with his own key in the dark, slipped out the back door and hid the
 * necklace inside the snowman. His cane left a hole beside every left
 * footprint in snow that had stopped falling at 11:30.
 *
 * What makes it different: a locked room. Nobody could arrive or leave, so
 * the necklace never left the lodge. The stolen keycard frames Greta.
 *
 * Hand-offs: Otto blames the storm → the Tech checks the power company;
 * the breaker room log names Greta's card → the front desk book shows it was
 * stolen and the countdown video puts Greta at the microphone; Lily mentions
 * the snowman → the Photographer reads the footprints.
 */
export const case004: CaseFile = {
  id: "case-004",
  code: "Case 004",
  title: "Snowed In",
  tagline: "A blizzard, a blackout at midnight, and a diamond that never left the building.",
  theme: "frost",
  minPlayers: 2,
  maxPlayers: 6,
  story: [
    { kind: "title", text: "Pinecrest Lodge", sub: "New Year's Eve · midnight" },
    { kind: "narration", text: "The road has been closed since six. Nobody has come in or out. Inside, the countdown to midnight." },
    { kind: "line", who: "rectangle", text: "Five, four, three, two, one… Happy New Y—" },
    { kind: "effect", effect: "blackout", text: "…" },
    { kind: "narration", text: "Two minutes of darkness. When the lights came back, the Aurora necklace was gone from its case." },
    { kind: "message", from: "Dame Agatha Ashford", time: "12:03 AM", text: "Nobody leaves this room. Not that any of you can." },
    { kind: "narration", text: "The necklace is still somewhere in this lodge. So is the person who took it." },
  ],
  briefing:
    "At midnight on New Year's Eve the lights went out at snowbound Pinecrest Lodge. When they came back two minutes later, Dame Agatha's diamond necklace, the Aurora, was gone from its display case. The road has been closed since 6 PM, so nobody could arrive or leave. Find out who took it, and how.",
  suspects: [
    { id: "circle", art: "circle", name: "Otto Brennan", role: "Lodge owner", tint: 200, blurb: "Your host. Very keen on everyone's comfort, and on his old fireplaces." },
    { id: "triangle", art: "triangle", name: "Lily Ashford", role: "Dame Agatha's niece", tint: 300, blurb: "Nervous. Films everything on her phone." },
    { id: "square", art: "square", name: "Sir Reginald Pike", role: "Auctioneer", tint: 40, blurb: "Selling the Aurora tomorrow at ten. Holds a key to its case." },
    { id: "rectangle", art: "rectangle", name: "Greta Holm", role: "Mountain guide", tint: 140, blurb: "Runs the lodge's ski trips. Has a master keycard." },
  ],
  roles: [
    { id: "tech", core: true, ability: "search", name: "Tech", blurb: "You're in the lodge's systems: power, doors, keycards, the weather station. Type a name or thing to pull its records." },
    { id: "interviewer", core: true, ability: "interview", name: "Interviewer", blurb: "You talk to people. The team gets five questions for the whole case, so choose them together." },
    { id: "photographer", core: true, ability: "inspect", name: "Photographer", blurb: "You read pictures. Tap anything in a photo or video still to look closer. Only you can." },
    { id: "archivist", core: true, ability: "crosscheck", name: "Archivist", blurb: "You keep the paperwork and you catch liars. Hold two pieces of evidence up against each other." },
    { id: "lookout", core: false, ability: "none", name: "Lookout", blurb: "You talked to the night porter. He hears every door in the place." },
    { id: "profiler", core: false, ability: "none", name: "Profiler", blurb: "You know everyone staying at the lodge." },
  ],
  chapters: [
    {
      title: "Lights out",
      intro: "Otto blames the storm. Find out what really caused the blackout.",
      story: [],
      checkpoint: {
        question: "What caused the blackout at midnight?",
        options: [
          { id: "storm", label: "The storm brought the power lines down" },
          { id: "breaker", label: "Someone switched the main breaker off, inside the lodge" },
          { id: "generator", label: "The generator ran out of fuel" },
          { id: "fuse", label: "The party lights blew a fuse" },
        ],
        answer: "breaker",
        reveal: "The power company had no outages tonight. The lodge's main breaker was switched off by hand at 23:59:58, and on again two minutes later.",
      },
      hints: [
        "Check whether the storm actually cut anyone else's power.",
        "The lodge's own power log says how the lights went out.",
      ],
    },
    {
      title: "The master key",
      intro: "Someone walked into the breaker room just before midnight. Find out whose keycard let them in.",
      story: [
        { kind: "narration", text: "Not the storm. Somebody switched the lodge off by hand, from the breaker room." },
        { kind: "line", who: "circle", text: "The breaker room? Only staff cards open that door. Greta has one…" },
      ],
      checkpoint: {
        question: "Whose keycard opened the breaker room at 23:59:40?",
        options: [
          { id: "circle", label: "Otto's" },
          { id: "rectangle", label: "Greta's" },
          { id: "square", label: "Sir Reginald's" },
          { id: "triangle", label: "Lily's" },
        ],
        answer: "rectangle",
        reveal: "Greta's card opened the breaker room. But she reported it stolen at 8:30, and at 23:59:55 she was on the microphone upstairs.",
      },
      hints: [
        "The Tech can pull the lodge's door log.",
        "Whose card it was isn't the same as who was holding it. Check the front desk book.",
      ],
    },
    {
      title: "Footprints",
      intro: "Greta's card, but not Greta. The snow stopped at 11:30. Find who went outside, and why.",
      story: [
        { kind: "line", who: "rectangle", text: "My card was stolen at half eight, and I was counting down on the mic! Everyone saw me!" },
        { kind: "narration", text: "Someone used Greta's card. And during the blackout, the back door opened for fifty seconds." },
        { kind: "narration", text: "The snow stopped falling at 11:30. Whatever went out that door left tracks." },
      ],
      hints: [
        "Ask who built the snowman, and look at the garden photo closely.",
        "Something about the footprints only fits one person in the lodge.",
        "Why would anyone need £180,000 badly? The Tech can check the lodge's bank.",
      ],
    },
  ],
  questionBudget: 5,
  evidence: [
    // ----- Chapter 1: lights out ----------------------------------------------
    {
      id: "power-log",
      role: "tech",
      chapter: 1,
      access: { kind: "desk" },
      title: "Lodge power log",
      body: {
        type: "log",
        source: "Pinecrest Lodge · power",
        rows: [
          { time: "23:59:58", text: "Main breaker OFF · switched by hand" },
          { time: "00:02:05", text: "Main breaker ON · switched by hand" },
          { time: "", text: "Grid supply: normal all night" },
        ],
      },
    },
    {
      id: "statement-agatha",
      role: "interviewer",
      chapter: 1,
      access: { kind: "desk" },
      title: "Dame Agatha's statement",
      body: {
        type: "statement",
        speaker: "Dame Agatha Ashford",
        text: "At midnight the lights went out. Two minutes later my Aurora was gone. The glass wasn't broken. The case had been unlocked, as neat as you like.",
      },
    },
    {
      id: "front-desk",
      role: "archivist",
      chapter: 1,
      access: { kind: "desk" },
      title: "Front desk book",
      body: {
        type: "log",
        source: "Pinecrest Lodge · front desk",
        rows: [
          { time: "18:00", text: "Road closed by snow. No arrivals or departures." },
          { time: "20:30", text: "G. Holm reports MASTER-2 keycard missing" },
          { time: "23:00", text: "Aurora necklace placed on display, lounge" },
        ],
      },
    },
    {
      id: "photo-countdown",
      role: "photographer",
      chapter: 1,
      access: { kind: "desk" },
      title: "Lily's countdown photo",
      body: {
        type: "scene",
        caption: "Lily's phone · 23:58 · the lounge",
        look: "office",
        items: [
          { kind: "label", x: 74, y: 6, text: "23:58", style: "clock", hotspot: "clock" },
          { kind: "box", x: 0, y: 66, w: 100, h: 34, color: "#3b3346", radius: 1 },
          { kind: "box", x: 8, y: 34, w: 18, h: 34, color: "rgba(214,236,255,0.45)", radius: 4, hotspot: "case" },
          { kind: "box", x: 12, y: 44, w: 10, h: 6, color: "#e9f0fb", radius: 50 },
          { kind: "art", x: 40, y: 22, w: 15, art: "suspect:rectangle", hotspot: "greta" },
          { kind: "box", x: 70, y: 44, w: 20, h: 24, color: "#7a4a3a", radius: 10, text: "🔥" },
          { kind: "art", x: 74, y: 30, w: 12, art: "suspect:circle" },
        ],
      },
    },
    {
      id: "detail-case",
      role: "photographer",
      chapter: 1,
      access: { kind: "inspect", scene: "photo-countdown", hotspot: "case" },
      title: "The Aurora at 23:58",
      body: { type: "finding", text: "The Aurora necklace sits in its glass case at 23:58, two minutes before the blackout." },
    },
    {
      id: "detail-greta-mic",
      role: "photographer",
      chapter: 1,
      access: { kind: "inspect", scene: "photo-countdown", hotspot: "greta" },
      title: "Greta at the mic",
      body: { type: "finding", text: "Greta holds the microphone, ready to lead the countdown." },
    },
    {
      id: "detail-countdown-clock",
      role: "photographer",
      chapter: 1,
      access: { kind: "inspect", scene: "photo-countdown", hotspot: "clock" },
      title: "The lounge clock",
      body: { type: "finding", text: "The lounge clock reads 23:58. It matches Lily's phone exactly." },
    },
    {
      id: "grid-report",
      role: "tech",
      chapter: 1,
      access: { kind: "search", terms: ["grid", "alpinepower", "powercompany", "outage", "outages", "storm"] },
      title: "Alpine Power outage map",
      body: {
        type: "log",
        source: "Alpine Power · outages tonight",
        rows: [
          { time: "All night", text: "Pinecrest valley: no outages" },
          { time: "", text: "Lines inspected 22:00: undamaged" },
        ],
      },
    },
    {
      id: "question-otto-power",
      role: "interviewer",
      chapter: 1,
      access: { kind: "interview", suspect: "Otto Brennan", question: "What happened to the power?" },
      title: "Otto: the power",
      body: { type: "statement", speaker: "Otto Brennan", text: "The storm, surely. Happens every winter. The old lines up here can't take the weight of the snow." },
    },
    {
      id: "question-reginald-key",
      role: "interviewer",
      chapter: 1,
      access: { kind: "interview", suspect: "Sir Reginald Pike", question: "Who has a key to the display case?" },
      title: "Sir Reginald: the case key",
      body: { type: "statement", speaker: "Sir Reginald Pike", text: "Myself, as auctioneer, and Otto, as our host. Both kept on our persons all evening, naturally." },
    },
    {
      id: "insight-storm",
      role: "archivist",
      chapter: 1,
      access: { kind: "crosscheck", pair: ["question-otto-power", "grid-report"] },
      title: "No storm damage",
      body: { type: "finding", text: "Otto blames the storm. The power company had no outages in the valley tonight." },
    },
    {
      id: "guest-notes",
      role: "profiler",
      chapter: 1,
      access: { kind: "desk" },
      title: "Notes on the guests",
      body: {
        type: "document",
        text: "Otto: bought the lodge in 2019. Hasn't had a full season since.\nLily: films everything. Adores her aunt.\nSir Reginald: insured the Aurora for the auction.\nGreta: a guide, not a host. Doesn't love parties.",
      },
    },

    // ----- Chapter 2: the master key ------------------------------------------
    {
      id: "door-log",
      role: "tech",
      chapter: 2,
      access: { kind: "search", terms: ["breaker", "breakerroom", "doors", "door", "keycard", "master2"] },
      title: "Lodge door log",
      body: {
        type: "log",
        source: "Pinecrest Lodge · keycard doors",
        rows: [
          { time: "23:59:40", text: "Breaker room · keycard MASTER-2 (G. Holm)" },
          { time: "00:00:50", text: "Back door · opened (battery sensor)" },
          { time: "00:01:40", text: "Back door · closed" },
        ],
      },
    },
    {
      id: "keycard-register",
      role: "archivist",
      chapter: 2,
      access: { kind: "desk" },
      title: "Keycard register",
      body: {
        type: "log",
        source: "Staff keycards",
        rows: [
          { time: "", text: "MASTER-1 · O. Brennan · opens every door" },
          { time: "", text: "MASTER-2 · G. Holm · opens every door" },
          { time: "", text: "Guest cards · own room and lounge only" },
        ],
      },
    },
    {
      id: "video-still",
      role: "photographer",
      chapter: 2,
      access: { kind: "desk" },
      title: "Lily's countdown video",
      body: {
        type: "footage",
        caption: "Lily's phone video · the lounge, around midnight",
        look: "office",
        frames: [
          {
            time: "23:59:20",
            items: [
              { kind: "box", x: 0, y: 66, w: 100, h: 34, color: "#3b3346", radius: 1 },
              { kind: "box", x: 8, y: 34, w: 18, h: 34, color: "rgba(214,236,255,0.45)", radius: 4 },
              { kind: "box", x: 12, y: 44, w: 10, h: 6, color: "#e9f0fb", radius: 50 },
              { kind: "art", x: 40, y: 22, w: 15, art: "suspect:rectangle" },
              { kind: "box", x: 70, y: 44, w: 20, h: 24, color: "#7a4a3a", radius: 10, text: "🔥" },
              { kind: "art", x: 73, y: 28, w: 13, art: "suspect:circle", hotspot: "seated" },
            ],
          },
          {
            time: "23:59:55",
            items: [
              { kind: "box", x: 0, y: 66, w: 100, h: 34, color: "#3b3346", radius: 1 },
              { kind: "box", x: 8, y: 34, w: 18, h: 34, color: "rgba(214,236,255,0.45)", radius: 4 },
              { kind: "box", x: 12, y: 44, w: 10, h: 6, color: "#e9f0fb", radius: 50 },
              { kind: "art", x: 40, y: 22, w: 15, art: "suspect:rectangle", hotspot: "greta" },
              { kind: "box", x: 70, y: 44, w: 20, h: 24, color: "#7a4a3a", radius: 10, text: "🔥", hotspot: "chair" },
            ],
          },
          {
            time: "00:00:30",
            items: [
              { kind: "box", x: 0, y: 0, w: 100, h: 100, color: "#050508", radius: 0 },
              { kind: "label", x: 34, y: 46, text: "(darkness, shrieks)", style: "stamp" },
            ],
          },
          {
            time: "00:02:10",
            items: [
              { kind: "box", x: 0, y: 66, w: 100, h: 34, color: "#3b3346", radius: 1 },
              { kind: "box", x: 8, y: 34, w: 18, h: 34, color: "rgba(214,236,255,0.45)", radius: 4, hotspot: "empty-case" },
              { kind: "art", x: 40, y: 22, w: 15, art: "suspect:rectangle", shocked: true },
              { kind: "box", x: 70, y: 44, w: 20, h: 24, color: "#7a4a3a", radius: 10, text: "🔥" },
              { kind: "art", x: 73, y: 28, w: 13, art: "suspect:circle", shocked: true, hotspot: "back" },
            ],
          },
        ],
      },
    },
    {
      id: "detail-greta-counting",
      role: "photographer",
      chapter: 2,
      access: { kind: "inspect", scene: "video-still", hotspot: "greta" },
      title: "Greta, counting down",
      body: { type: "finding", text: "23:59:55: Greta is at the mic, counting down from five. The breaker room is two floors below." },
    },
    {
      id: "detail-chair",
      role: "photographer",
      chapter: 2,
      access: { kind: "inspect", scene: "video-still", hotspot: "chair" },
      title: "The armchair by the fire",
      body: { type: "finding", text: "Otto's armchair by the fire is empty. His cane is gone from the armrest too." },
    },
    {
      id: "detail-seated",
      role: "photographer",
      chapter: 2,
      access: { kind: "inspect", scene: "video-still", hotspot: "seated" },
      title: "23:59:20",
      body: { type: "finding", text: "Otto in his armchair by the fire, cane on the armrest, thirty-five seconds to midnight." },
    },
    {
      id: "detail-snowy-slippers",
      role: "photographer",
      chapter: 2,
      access: { kind: "inspect", scene: "video-still", hotspot: "back" },
      title: "00:02:10",
      body: { type: "finding", text: "Otto is back in his armchair, out of breath. There's snow melting on his slippers." },
    },
    {
      id: "detail-empty-case",
      role: "photographer",
      chapter: 2,
      access: { kind: "inspect", scene: "video-still", hotspot: "empty-case" },
      title: "The empty case",
      body: { type: "finding", text: "The display case is empty. Its little door is open, the lock unbroken." },
    },
    {
      id: "question-greta-card",
      role: "interviewer",
      chapter: 2,
      access: { kind: "interview", suspect: "Greta Holm", question: "Where was your keycard tonight?" },
      title: "Greta: her keycard",
      body: { type: "statement", speaker: "Greta Holm", text: "Gone from my jacket in the boot room by half eight. I reported it at the desk straight away. Ask the book." },
    },
    {
      id: "question-lily-missing",
      role: "interviewer",
      chapter: 2,
      access: { kind: "interview", suspect: "Lily Ashford", question: "Was anyone missing from the countdown?" },
      title: "Lily: who was missing",
      body: { type: "statement", speaker: "Lily Ashford", text: "Otto. He said he had to check the boiler. He was back the second the lights came on." },
    },
    {
      id: "question-otto-midnight",
      role: "interviewer",
      chapter: 2,
      access: { kind: "interview", suspect: "Otto Brennan", question: "Where were you at midnight?" },
      title: "Otto: midnight",
      body: { type: "statement", speaker: "Otto Brennan", text: "Right there in my armchair by the fire, counting down with everyone else." },
    },
    {
      id: "insight-armchair",
      role: "archivist",
      chapter: 2,
      access: { kind: "crosscheck", pair: ["question-otto-midnight", "detail-chair"] },
      title: "The empty armchair",
      body: { type: "finding", text: "Otto says he was in his armchair at midnight. At 23:59:55 it's empty, and so is his cane's armrest." },
    },
    {
      id: "insight-stolen-card",
      role: "archivist",
      chapter: 2,
      access: { kind: "crosscheck", pair: ["door-log", "front-desk"] },
      title: "A stolen card",
      body: { type: "finding", text: "The breaker room opened with MASTER-2, the card Greta reported stolen at 20:30." },
    },
    {
      id: "porter-message",
      role: "lookout",
      chapter: 2,
      access: { kind: "desk" },
      title: "The night porter",
      body: {
        type: "chat",
        title: "Night porter",
        messages: [{ from: "Henrik (porter)", time: "12:10 AM", text: "Heard the back door bang during the blackout. Then a tap-tap on the boot room tiles. Thought it was the wind." }],
      },
    },

    // ----- Chapter 3: footprints ----------------------------------------------
    {
      id: "photo-garden",
      role: "photographer",
      chapter: 3,
      access: { kind: "desk" },
      title: "The back garden",
      body: {
        type: "scene",
        caption: "Taken by Greta · 00:20 · the back garden, no lights",
        look: "snow",
        dark: true,
        items: [
          { kind: "box", x: 0, y: 64, w: 100, h: 36, color: "#eef3fb", radius: 1 },
          { kind: "box", x: 8, y: 78, w: 50, h: 4, color: "#b9c7de", radius: 20, hotspot: "prints" },
          { kind: "box", x: 12, y: 84, w: 3, h: 3, color: "#8fa0bd", radius: 50, hotspot: "holes" },
          { kind: "box", x: 64, y: 50, w: 20, h: 22, color: "#ffffff", radius: 50 },
          { kind: "box", x: 68, y: 32, w: 13, h: 18, color: "#ffffff", radius: 50, hotspot: "snowman" },
          { kind: "box", x: 73, y: 38, w: 2, h: 2, color: "#1b1f3b", radius: 50 },
          { kind: "box", x: 77, y: 38, w: 2, h: 2, color: "#1b1f3b", radius: 50 },
        ],
      },
    },
    {
      id: "detail-prints",
      role: "photographer",
      chapter: 3,
      access: { kind: "inspect", scene: "photo-garden", hotspot: "prints" },
      title: "Fresh footprints",
      body: { type: "finding", text: "One set of footprints from the back door to the snowman, and back. Fresh: no snow inside them." },
    },
    {
      id: "detail-holes",
      role: "photographer",
      chapter: 3,
      access: { kind: "inspect", scene: "photo-garden", hotspot: "holes" },
      title: "Small round holes",
      body: { type: "finding", text: "A small round hole beside every left footprint, like the tip of a walking cane." },
    },
    {
      id: "detail-snowman",
      role: "photographer",
      chapter: 3,
      access: { kind: "inspect", scene: "photo-garden", hotspot: "snowman" },
      title: "The snowman's head",
      body: { type: "finding", text: "The snowman's head sits crooked, freshly patted smooth, with a dark patch of wet snow." },
    },
    {
      id: "weather-station",
      role: "tech",
      chapter: 3,
      access: { kind: "search", terms: ["weather", "snow", "snowfall", "weatherstation"] },
      title: "Weather station",
      body: {
        type: "log",
        source: "Pinecrest Lodge · weather station",
        rows: [
          { time: "23:30", text: "Snowfall stopped" },
          { time: "23:30 – 06:00", text: "No new snow · −15 °C · calm" },
        ],
      },
    },
    {
      id: "bank-letter",
      role: "tech",
      chapter: 3,
      access: { kind: "search", terms: ["bank", "alpinebank", "loan", "otto", "brennan", "money"] },
      title: "Alpine Bank",
      body: {
        type: "document",
        text: "To O. Brennan, Pinecrest Lodge.\nYour loan is in default. Unless £160,000 is repaid, the bank will take possession of the lodge on 15 January.",
      },
    },
    {
      id: "valuation",
      role: "archivist",
      chapter: 3,
      access: { kind: "desk" },
      title: "Auction valuation",
      body: { type: "document", text: "Lot 1: the Aurora necklace.\nValuation: £180,000.\nAuction: tomorrow, 10 AM, Pinecrest Lodge.\nSir R. Pike" },
    },
    {
      id: "question-lily-snowman",
      role: "interviewer",
      chapter: 3,
      access: { kind: "interview", suspect: "Lily Ashford", question: "Who built the snowman?" },
      title: "Lily: the snowman",
      body: { type: "statement", speaker: "Lily Ashford", text: "All of us, this afternoon. Otto insisted on doing the head himself, after dinner." },
    },
    {
      id: "question-otto-cane",
      role: "interviewer",
      chapter: 3,
      access: { kind: "interview", suspect: "Otto Brennan", question: "Do you always walk with a cane?" },
      title: "Otto: the cane",
      body: { type: "statement", speaker: "Otto Brennan", text: "Since my fall in '19. Left knee. Why on earth do you ask?" },
    },
    {
      id: "question-reginald-outside",
      role: "interviewer",
      chapter: 3,
      access: { kind: "interview", suspect: "Sir Reginald Pike", question: "Did anyone go outside tonight?" },
      title: "Sir Reginald: outside",
      body: { type: "statement", speaker: "Sir Reginald Pike", text: "Outside? It's minus fifteen and pitch black. Nobody in their right mind." },
    },
    {
      id: "insight-cane",
      role: "archivist",
      chapter: 3,
      access: { kind: "crosscheck", pair: ["question-otto-cane", "detail-holes"] },
      title: "The cane in the snow",
      body: { type: "finding", text: "Otto walks with a cane, and a cane-tip hole sits beside every left footprint in the snow." },
    },
  ],
  solution: {
    culprit: "circle",
    motives: [
      { id: "bank", label: "To save his lodge from the bank" },
      { id: "frame", label: "To get Greta sacked" },
      { id: "revenge", label: "Revenge on the Ashford family" },
      { id: "prank", label: "A New Year's prank that went too far" },
    ],
    motive: "bank",
    keyEvidence: [
      "detail-holes",
      "insight-cane",
      "detail-prints",
      "detail-snowman",
      "weather-station",
      "door-log",
      "insight-armchair",
      "detail-chair",
      "insight-storm",
      "power-log",
      "bank-letter",
      "question-lily-snowman",
      "insight-stolen-card",
      "detail-snowy-slippers",
    ],
    explanation:
      "Otto owed the bank £160,000 by 15 January. He took Greta's keycard at 8:30, used it to open the breaker room and cut the power at midnight, unlocked the case with his own key in the dark, and slipped out of the back door to hide the Aurora in the snowman's head. The snow had stopped at 11:30, so his footprints, and his cane, gave him away.",
    timeline: [
      { time: "18:00", text: "The road closes. Nobody can arrive or leave." },
      { time: "20:30", text: "Greta reports her master keycard missing from the boot room." },
      { time: "After dinner", text: "Otto insists on making the snowman's head himself." },
      { time: "23:30", text: "The snow stops falling." },
      { time: "23:58", text: "Lily photographs the Aurora in its case." },
      { time: "23:59:40", text: "Otto opens the breaker room with Greta's stolen card." },
      { time: "Midnight", text: "Otto cuts the power, then unlocks the case with his own key in the dark." },
      { time: "00:00:50", text: "He slips out of the back door and hides the necklace in the snowman's head." },
      { time: "00:02:05", text: "The lights come back on. Otto is back in his armchair, snow melting on his slippers." },
    ],
    confession: [
      { kind: "line", who: "circle", text: "The bank takes Pinecrest in January. One necklace would have kept it." },
      { kind: "line", who: "circle", text: "I'd have dug it out after you'd all gone home. Who searches a snowman?" },
      { kind: "line", who: "square", text: "Lot one: a slightly damp diamond necklace. Shall we start the bidding?" },
    ],
  },
};
