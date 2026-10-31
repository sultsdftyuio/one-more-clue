/**
 * The case format and the room state. A case is pure data: chapters with a
 * checkpoint question each, roles with an ability each, evidence that is
 * either handed out or has to be found, and the solution. The engine
 * (engine.ts) runs any case written in this format. See docs/case-system.md.
 */

// ---------------------------------------------------------------------------
// Case files

export type CaseSuspect = {
  id: string;
  name: string;
  /** Who they are in this case, e.g. "Lab director". */
  role?: string;
  /** One line shown on the suspect card. */
  blurb: string;
  /** Optional art key, e.g. a SuspectId from src/data/suspects.ts. */
  art?: string;
  /** Recolours the house character for this case (a hue rotation in degrees), so each cast looks its own. */
  tint?: number;
};

/** A case's look, sound and weather. See src/components/game/themes.ts. */
export type ThemeId = "noir" | "radio" | "bistro" | "frost";

/**
 * One pop-up moment in a story sequence. Cases tell their story in short
 * beats (the briefing, each chapter opening, the culprit's confession)
 * instead of paragraphs. Keep each one to a sentence or two.
 */
export type Beat =
  /** A big stamped title card. */
  | { kind: "title"; text: string; sub?: string }
  /** The narrator, in a caption box. */
  | { kind: "narration"; text: string }
  /** A text message popping up on a phone. */
  | { kind: "message"; from: string; time?: string; text: string; edited?: boolean }
  /** A character speaking. `who` is a suspect id (shown with their portrait) or any name. */
  | { kind: "line"; who: string; text: string; shocked?: boolean }
  /** A full-screen moment: the lights going out, radio static, a camera flash, candles guttering. */
  | { kind: "effect"; effect: "blackout" | "static" | "flash" | "candles"; text?: string };

/**
 * What a role can do besides reading its own evidence:
 * - search: type a name, time or place to pull matching records
 * - interview: spend the team's limited questions on suspects and witnesses
 * - inspect: tap scenes (photos, camera stills) to find hidden details
 * - crosscheck: hold two pieces of evidence up against each other to expose a contradiction
 * - none: evidence only (extra roles)
 */
export type Ability = "search" | "interview" | "inspect" | "crosscheck" | "none";

export type CaseRole = {
  id: string;
  name: string;
  /** Who this role is, shown to the player who holds it. */
  blurb: string;
  ability: Ability;
  /**
   * Core roles are always in play: their evidence and ability are needed to
   * solve the case. Extra roles only join with more players, so their evidence
   * must be bonus corroboration, never the only route to the answer.
   */
  core: boolean;
};

export type ChatMessage = { from: string; time: string; text: string; edited?: boolean };
export type LogRow = { time: string; text: string };

export type SceneLook = "cafe" | "street" | "cctv" | "lab" | "office" | "kitchen" | "snow";

/** Positions and sizes are percentages of the scene frame (4:3). */
type Place = { x: number; y: number; hotspot?: string };
export type SceneItem =
  | (Place & { kind: "art"; art: string; w: number; rotate?: number; flip?: boolean; shocked?: boolean })
  | (Place & { kind: "box"; w: number; h: number; color: string; radius?: number; text?: string; textColor?: string })
  | (Place & { kind: "label"; text: string; style: "clock" | "sign" | "note" | "stamp"; rotate?: number });

/** What a moment on a recording sounds like; the tape player synthesises each one. */
export type TapeSound = "speech" | "music" | "jingle" | "static" | "click" | "creak" | "breath" | "beep" | "door" | "silence";
export type TapeSegment = { at: string; text: string; sound: TapeSound };

/** One frame of camera footage: a timestamp and a scene drawn like any other. */
export type FootageFrame = { time: string; items: SceneItem[] };

export type EvidenceBody =
  | { type: "statement"; speaker: string; text: string }
  | { type: "chat"; title: string; messages: ChatMessage[] }
  | { type: "log"; source: string; rows: LogRow[] }
  | { type: "document"; text: string }
  /** A photo. `dark` scenes can only be searched with a flashlight. */
  | { type: "scene"; caption: string; look: SceneLook; items: SceneItem[]; dark?: boolean }
  /** Camera footage: frames you scrub through. Hotspots in any frame can be inspected. */
  | { type: "footage"; caption: string; look: SceneLook; frames: FootageFrame[] }
  /** An audio recording, played back with captions and synthesised sounds. */
  | { type: "recording"; caption: string; segments: TapeSegment[] }
  /** A detail found by inspecting a scene, or a contradiction found by cross-checking. */
  | { type: "finding"; text: string };

/** How a piece of evidence reaches the players. */
export type Access =
  /** Handed to the role's holder when its chapter opens. */
  | { kind: "desk" }
  /** Found when the role's holder searches for one of these terms. */
  | { kind: "search"; terms: string[] }
  /** One of the Interviewer's questions; the evidence is the answer. */
  | { kind: "interview"; suspect: string; question: string }
  /** A hidden detail: a hotspot inside a scene. */
  | { kind: "inspect"; scene: string; hotspot: string }
  /** A contradiction between two pieces of evidence. */
  | { kind: "crosscheck"; pair: [string, string] };

export type CaseEvidence = {
  /** Evidence that has to be found first. Until then this stays hidden, so one player's find opens another's next move. */
  after?: string[];
  id: string;
  /** The role this evidence belongs to: its holder can see it once it's available. */
  role: string;
  /** The chapter (1-based) from which it exists. */
  chapter: number;
  title: string;
  body: EvidenceBody;
  access: Access;
};

export type Chapter = {
  title: string;
  /** One line on what this chapter is about, shown while it's open. */
  intro: string;
  /** Plays when the chapter opens (after the first, which opens with the case story). */
  story: Beat[];
  /** Answering it correctly opens the next chapter. The last chapter has none: it ends with the final report. */
  checkpoint?: { question: string; options: { id: string; label: string }[]; answer: string; reveal: string };
  hints: string[];
};

/** One thing a suspect says under interrogation. A lie names the pinned evidence that breaks it. */
export type InterrogationClaim = { id: string; text: string; lie?: { breaks: string[]; crack: string } };

/**
 * A suspect's story, told claim by claim. Only the Interviewer hears the
 * claims and reads them out; anyone can call a lie by presenting a piece of
 * pinned evidence. Break every lie and the suspect confesses; make too many
 * wrong calls and they walk out.
 */
export type Interrogation = {
  /** Suspect id: always the culprit, because only the right accusation opens it. */
  suspect: string;
  /** Wrong calls allowed before the suspect walks out. */
  strikes: number;
  /** Their first words when the team confronts them. */
  opening: string;
  claims: InterrogationClaim[];
  /** What the suspect says as they walk out. */
  walkout: string;
};

/** The story's clock. Every wrong answer loses time, and when it runs out the case is lost. */
export type Deadline = {
  /** What's coming, e.g. "The investors arrive at 9:00 AM". */
  what: string;
  /** The time at the start, then after each wrong answer. One wrong answer past the last ends the case. */
  times: string[];
  /** How it ends when time runs out. */
  lost: string;
};

export type CaseFile = {
  id: string;
  /** Shown as the case number, e.g. "Case 001". */
  code: string;
  title: string;
  tagline: string;
  /** The case's look, music and weather; noir if left out. */
  theme?: ThemeId;
  minPlayers: number;
  maxPlayers: number;
  /** The briefing as one short paragraph, kept on the case file for reference. */
  briefing: string;
  /** The briefing as it's first told: a few pop-up beats. */
  story: Beat[];
  suspects: CaseSuspect[];
  /** Core roles first, then extras in the order they join. */
  roles: CaseRole[];
  chapters: Chapter[];
  /** Interview questions the whole team can ask over the case. */
  questionBudget: number;
  /** The ending: name the culprit and they're confronted, their lies broken with pinned evidence. Without one, a report closes the case. */
  interrogation?: Interrogation;
  deadline?: Deadline;
  /** The opening film, played to everyone when the case starts. Without one, the story beats play instead. */
  cinematic?: { video: string; poster?: string };
  evidence: CaseEvidence[];
  solution: {
    culprit: string;
    motives: { id: string; label: string }[];
    motive: string;
    /** Proof that counts: a final report earns its evidence star if both picks are in here. */
    keyEvidence: string[];
    explanation: string;
    timeline: LogRow[];
    /** The culprit's last words, played at the reveal. */
    confession: Beat[];
  };
};

// ---------------------------------------------------------------------------
// Rooms

export type Mode = "together" | "remote";
export type Phase = "lobby" | "briefing" | "investigation" | "reveal";

export type Player = {
  /** Public id, shown to other players. */
  id: string;
  /** Secret that proves who this player is. Never sent to other players. */
  token: string;
  name: string;
  roles: string[];
  joinedAt: number;
  left: boolean;
  /** A computer player, for testing (see bots.ts). */
  bot?: boolean;
};

export type FinalReport = { suspectId: string; motiveId: string; evidenceIds: string[] };

/** A group decision: every one needs a majority. */
export type ProposalKind = "answer" | "final" | "hint" | "giveUp";

export type Proposal = {
  id: string;
  kind: ProposalKind;
  /** The checkpoint option, for "answer". */
  optionId?: string;
  /** For "final". */
  report?: FinalReport;
  by: string;
  at: number;
  votes: Record<string, "yes" | "no">;
};

export type DecidedProposal = Omit<Proposal, "votes"> & { passed: boolean; decidedAt: number; correct?: boolean };

export type Pin = { evidenceId: string; by: string; at: number };
export type Discovery = { by: string; at: number };
export type Search = { id: string; by: string; query: string; hit: string | null; at: number };
export type ChatLine = { id: string; playerId: string; text: string; at: number };

export type ActivityKind = "found" | "miss" | "pin" | "unpin" | "chapter" | "wrong" | "hint" | "join" | "leave" | "lie" | "lead";
export type Activity = { id: string; at: number; kind: ActivityKind; playerId?: string; text: string; evidenceId?: string };

export type Score = { stars: number; culprit: boolean; motive: boolean; evidence: boolean; sharp: boolean };
export type Outcome = { kind: "solved" | "wrong" | "gaveUp" | "tooLate" | "walkedOut"; report?: FinalReport; score: Score; at: number };

export type RoomState = {
  code: string;
  caseId: string;
  mode: Mode;
  hostId: string;
  phase: Phase;
  /** Bumped on every change; storage uses it to reject conflicting writes. */
  version: number;
  createdAt: number;
  startedAt?: number;
  players: Player[];
  /** Players who finished reading the briefing. */
  ready: string[];
  /** The open chapter, 1-based. */
  chapter: number;
  /** Evidence that had to be found (not handed out), and who found it. */
  found: Record<string, Discovery>;
  pins: Pin[];
  questionsUsed: number;
  searches: Search[];
  /** Cross-checks that found nothing, so nobody repeats them. */
  checked: string[];
  /** Cross-checks that found nothing, by chapter number (missing in rooms made before the limit). */
  emptyChecks?: Record<number, number>;
  /** The confrontation, once the team has named the right person. */
  interrogation?: InterrogationState;
  /** The report that named them, held until the confrontation ends. */
  accusation?: FinalReport;
  chat: ChatLine[];
  activity: Activity[];
  hintsUsed: number;
  /** Hints opened in each chapter, by chapter number. */
  hintsOpen: Record<number, number>;
  wrongAnswers: number;
  proposal: Proposal | null;
  decided: DecidedProposal[];
  outcome: Outcome | null;
  /** When a bot last made a move, so they act at a human pace. */
  botMovedAt?: number;
};

export type InterrogationState = {
  /** The claim the suspect is on, as an index into the case's claims. */
  claim: number;
  /** Claim ids whose lies have been broken. */
  broken: string[];
  strikes: number;
  over?: "confessed" | "walkedOut";
};

export type Action =
  | { type: "setMode"; mode: Mode }
  /** In the lobby: change your own detective name. */
  | { type: "rename"; name: string }
  | { type: "start" }
  | { type: "ready" }
  | { type: "search"; query: string }
  | { type: "ask"; evidenceId: string }
  | { type: "inspect"; scene: string; hotspot: string }
  | { type: "crosscheck"; a: string; b: string }
  /** Interrogation: move the suspect on to their next (or previous) claim. */
  | { type: "press"; step: 1 | -1 }
  /** Interrogation: call the current claim a lie, presenting a pinned piece of evidence. */
  | { type: "callLie"; evidenceId: string }
  | { type: "pin"; evidenceId: string }
  | { type: "unpin"; evidenceId: string }
  | { type: "chat"; text: string }
  | { type: "propose"; kind: ProposalKind; optionId?: string; report?: FinalReport }
  | { type: "vote"; proposalId: string; vote: "yes" | "no" }
  | { type: "withdraw"; proposalId: string }
  | { type: "leave" }
  | { type: "kick"; playerId: string }
  /** Test builds only; handled by the room service, not the engine. */
  | { type: "addBot" };
