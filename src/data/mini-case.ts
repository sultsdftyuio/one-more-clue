import type { SuspectId } from "./suspects";

export type Alibi = {
  suspect: SuspectId;
  /** What they say happened at 9:17. */
  claim: string;
  /** What they say when accused (the liar's line is a confession). */
  reaction: string;
};

export type EvidenceEntry = { time: string; text: string };

/**
 * A 30-second warm-up with exactly one contradiction: the outage report says
 * every street lamp was dark at 9:17, and only Rex's story needs one lit.
 */
export const miniCase = {
  code: "Case 000 · 30-second warm-up",
  title: "Who's lying?",
  briefing:
    "At 9:17 PM the whole block went dark for one minute. When the lights came back on, the lab's prototype was gone. Four suspects were out on the street. Check the evidence, read their alibis, then point your finger.",
  evidence: {
    source: "City Power · Outage report",
    entries: [
      { time: "9:17 PM", text: "Power cut across the whole block. Every window and every street lamp goes dark." },
      { time: "9:18 PM", text: "Power restored." },
    ] satisfies EvidenceEntry[],
  },
  alibis: [
    {
      suspect: "triangle",
      claim: "I was on the phone with my mum the whole time! Check my call log!",
      reaction: "M-me?! Phones work in a blackout! Mum can confirm!",
    },
    {
      suspect: "square",
      claim: "I was in the café, finishing my tea. Obviously.",
      reaction: "How dare you. One can sip tea perfectly well in the dark.",
    },
    {
      suspect: "circle",
      claim: "I was in the alley. Heard a crash, then the lights came back on. That's all I know.",
      reaction: "Look, I hang around alleys. Doesn't make me a thief.",
    },
    {
      suspect: "rectangle",
      claim: "I was under the street lamp, reading the bus timetable. The 9:20 was late again.",
      reaction: "…Fine. It was a very dark timetable.",
    },
  ] satisfies Alibi[],
  liar: "rectangle" as SuspectId,
  prompt: "Hit Accuse on the suspect whose story doesn't add up.",
  hints: [
    "Re-read the outage report. Whose story only works with the lights on?",
    "Someone says they were reading. What were they reading by?",
  ],
  reveal: {
    headline: "Busted!",
    explanation:
      "Rex says he was reading under a street lamp at 9:17, but the outage report says every lamp on the block was dark. Nobody reads a timetable in the dark.",
    nextStep:
      "That was the warm-up. Case 001 is a 20-minute investigation with five pieces of evidence and a twist at the end.",
  },
};
