/**
 * The case format and the room state. A case is pure data: who the suspects are,
 * which roles exist, which evidence each role holds, the hints and the solution.
 * The engine (engine.ts) runs any case written in this format.
 */

// ---------------------------------------------------------------------------
// Case files

export type CaseSuspect = {
  id: string;
  name: string;
  /** One line shown on the suspect card. */
  blurb: string;
  /** Optional art key, e.g. a SuspectId from src/data/suspects.ts. */
  art?: string;
};

export type CaseRole = {
  id: string;
  name: string;
  /** What this role is about, shown to the player who holds it. */
  blurb: string;
  /**
   * Core roles are always in play: their evidence is needed to solve the case.
   * Extra roles only join with more players, so their evidence must be bonus
   * corroboration, never the only route to the answer.
   */
  core: boolean;
};

export type ChatMessage = { from: string; time: string; text: string; edited?: boolean };
export type LogRow = { time: string; text: string };

export type EvidenceBody =
  | { type: "statement"; speaker: string; text: string }
  | { type: "chat"; title: string; messages: ChatMessage[] }
  | { type: "log"; source: string; rows: LogRow[] }
  | { type: "photo"; caption: string; description: string; image?: string }
  | { type: "document"; text: string };

export type CaseEvidence = {
  id: string;
  /** The role that starts with this evidence. */
  role: string;
  title: string;
  body: EvidenceBody;
};

export type CaseFile = {
  id: string;
  /** Shown as the case number, e.g. "Case 001". */
  code: string;
  title: string;
  minPlayers: number;
  maxPlayers: number;
  briefing: string;
  suspects: CaseSuspect[];
  /** Core roles first, then extras in the order they join. */
  roles: CaseRole[];
  evidence: CaseEvidence[];
  /** Released one at a time when the group votes for a hint. */
  hints: string[];
  solution: { culprit: string; explanation: string };
};

// ---------------------------------------------------------------------------
// Rooms

export type Mode = "together" | "remote";
export type Phase = "lobby" | "briefing" | "investigation" | "reveal";

export type Player = {
  /** Public id, shown to other players (votes, board). */
  id: string;
  /** Secret that proves who this player is. Never sent to other players. */
  token: string;
  name: string;
  roles: string[];
  joinedAt: number;
  left: boolean;
};

/** A group decision. Hints and giving up go through the same vote as accusations. */
export type ProposalKind = "accuse" | "hint" | "giveUp";

export type Proposal = {
  id: string;
  kind: ProposalKind;
  /** The accused suspect, for "accuse". */
  suspectId?: string;
  by: string;
  at: number;
  votes: Record<string, "yes" | "no">;
};

export type DecidedProposal = Omit<Proposal, "votes"> & { passed: boolean; decidedAt: number };

export type BoardItem = { evidenceId: string; sharedBy: string; at: number };
export type ChatLine = { id: string; playerId: string; text: string; at: number };

export type Outcome = { kind: "solved" | "wrong" | "gaveUp"; suspectId?: string; at: number };

export type RoomState = {
  code: string;
  caseId: string;
  mode: Mode;
  hostId: string;
  phase: Phase;
  /** Bumped on every change; storage uses it to reject conflicting writes. */
  version: number;
  createdAt: number;
  players: Player[];
  /** Players who finished reading the briefing. */
  ready: string[];
  board: BoardItem[];
  chat: ChatLine[];
  hintsUnlocked: number;
  proposal: Proposal | null;
  decided: DecidedProposal[];
  outcome: Outcome | null;
};

export type Action =
  | { type: "setMode"; mode: Mode }
  | { type: "start" }
  | { type: "ready" }
  | { type: "share"; evidenceId: string }
  | { type: "chat"; text: string }
  | { type: "propose"; kind: ProposalKind; suspectId?: string }
  | { type: "vote"; proposalId: string; vote: "yes" | "no" }
  | { type: "withdraw"; proposalId: string }
  | { type: "leave" }
  | { type: "kick"; playerId: string };
