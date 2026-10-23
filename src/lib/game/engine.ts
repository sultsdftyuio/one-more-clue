/**
 * The rules of a room, as pure functions: no storage, no network, no clock.
 * The server is the referee: it runs every action through applyAction and
 * sends each player only what viewFor lets them see.
 */
import type {
  Action,
  BoardItem,
  CaseEvidence,
  CaseFile,
  CaseRole,
  CaseSuspect,
  ChatLine,
  DecidedProposal,
  Mode,
  Outcome,
  Phase,
  Player,
  Proposal,
  RoomState,
} from "./types";

export const MAX_NAME = 24;
export const MAX_CHAT = 300;
const CHAT_KEPT = 200;

export type Result = { ok: true; state: RoomState } | { ok: false; error: string };

const fail = (error: string): Result => ({ ok: false, error });

export const activePlayers = (state: RoomState) => state.players.filter((p) => !p.left);

/** More than half of the players still in the room. */
export const votesNeeded = (state: RoomState) => Math.floor(activePlayers(state).length / 2) + 1;

export function cleanName(name: string) {
  return name.replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
}

export function createRoom(input: {
  code: string;
  caseFile: CaseFile;
  host: { id: string; token: string; name: string };
  mode: Mode;
  now: number;
}): RoomState {
  return {
    code: input.code,
    caseId: input.caseFile.id,
    mode: input.mode,
    hostId: input.host.id,
    phase: "lobby",
    version: 1,
    createdAt: input.now,
    players: [{ ...input.host, name: cleanName(input.host.name), roles: [], joinedAt: input.now, left: false }],
    ready: [],
    board: [],
    chat: [],
    hintsUnlocked: 0,
    proposal: null,
    decided: [],
    outcome: null,
  };
}

/** New players can only join in the lobby; returning players are recognised by their token instead. */
export function addPlayer(
  state: RoomState,
  caseFile: CaseFile,
  player: { id: string; token: string; name: string },
  now: number,
): Result {
  const name = cleanName(player.name);
  if (!name) return fail("Pick a name first.");
  if (state.phase !== "lobby") return fail("This case has already started.");
  const active = activePlayers(state);
  if (active.length >= caseFile.maxPlayers) return fail(`This room is full (${caseFile.maxPlayers} players).`);
  if (active.some((p) => p.name.toLowerCase() === name.toLowerCase())) return fail("Someone here already has that name.");

  const next = structuredClone(state);
  next.players.push({ ...player, name, roles: [], joinedAt: now, left: false });
  next.version++;
  return { ok: true, state: next };
}

/**
 * Core roles are always dealt; extra roles join one per player beyond the core count.
 * Roles go round the table, so with fewer players than core roles some hold two.
 */
export function dealRoles(caseFile: CaseFile, playerIds: string[]): Record<string, string[]> {
  const core = caseFile.roles.filter((r) => r.core);
  const extras = caseFile.roles.filter((r) => !r.core);
  const inPlay = [...core, ...extras.slice(0, Math.max(0, playerIds.length - core.length))];
  const dealt: Record<string, string[]> = Object.fromEntries(playerIds.map((id) => [id, []]));
  inPlay.forEach((role, i) => dealt[playerIds[i % playerIds.length]].push(role.id));
  return dealt;
}

/** A player who leaves mid-case hands each role to whoever holds the fewest, so no evidence is lost. */
function handOverRoles(state: RoomState, leaving: Player) {
  for (const role of leaving.roles) {
    const takers = activePlayers(state).filter((p) => p.id !== leaving.id);
    if (!takers.length) break;
    const taker = takers.reduce((a, b) => (b.roles.length < a.roles.length ? b : a));
    taker.roles.push(role);
  }
  leaving.roles = [];
}

function removePlayer(state: RoomState, player: Player, now: number) {
  if (state.phase === "lobby") {
    state.players = state.players.filter((p) => p.id !== player.id);
  } else {
    handOverRoles(state, player);
    player.left = true;
  }
  state.ready = state.ready.filter((id) => id !== player.id);
  if (state.proposal) delete state.proposal.votes[player.id];
  if (state.hostId === player.id) {
    const heir = activePlayers(state)[0];
    if (heir) state.hostId = heir.id;
  }
  if (state.phase === "briefing") startInvestigationIfReady(state);
  resolveProposal(state, now);
}

function startInvestigationIfReady(state: RoomState) {
  const active = activePlayers(state);
  if (active.length && active.every((p) => state.ready.includes(p.id))) state.phase = "investigation";
}

/** Settles the open proposal once a majority is for it, or once it can no longer get one. */
function resolveProposal(state: RoomState, now: number) {
  const proposal = state.proposal;
  if (!proposal) return;
  const active = activePlayers(state);
  const needed = votesNeeded(state);
  const yes = active.filter((p) => proposal.votes[p.id] === "yes").length;
  const no = active.filter((p) => proposal.votes[p.id] === "no").length;
  const passed = yes >= needed;
  const failed = active.length - no < needed;
  if (!passed && !failed) return;

  state.decided.push({
    id: proposal.id,
    kind: proposal.kind,
    suspectId: proposal.suspectId,
    by: proposal.by,
    at: proposal.at,
    passed,
    decidedAt: now,
  });
  state.proposal = null;
  if (!passed) return;

  if (proposal.kind === "hint") state.hintsUnlocked++;
  if (proposal.kind === "accuse" || proposal.kind === "giveUp") {
    state.outcome = {
      kind: proposal.kind === "giveUp" ? "gaveUp" : "wrong",
      suspectId: proposal.suspectId,
      at: now,
    } satisfies Outcome;
    state.phase = "reveal";
  }
}

const OPEN_PHASES: Phase[] = ["investigation"];

export function applyAction(
  state: RoomState,
  caseFile: CaseFile,
  playerId: string,
  action: Action,
  now: number,
  newId: () => string,
): Result {
  const me = state.players.find((p) => p.id === playerId && !p.left);
  if (!me) return fail("You're not in this room.");
  const isHost = state.hostId === me.id;
  const next = structuredClone(state);
  const self = next.players.find((p) => p.id === me.id)!;

  switch (action.type) {
    case "setMode": {
      if (!isHost) return fail("Only the host can change this.");
      if (action.mode !== "together" && action.mode !== "remote") return fail("Unknown mode.");
      next.mode = action.mode;
      break;
    }

    case "start": {
      if (!isHost) return fail("Only the host can start the case.");
      if (state.phase !== "lobby") return fail("The case has already started.");
      const players = activePlayers(next);
      if (players.length < caseFile.minPlayers) return fail(`You need at least ${caseFile.minPlayers} players.`);
      const dealt = dealRoles(
        caseFile,
        players.map((p) => p.id),
      );
      players.forEach((p) => (p.roles = dealt[p.id]));
      next.phase = "briefing";
      break;
    }

    case "ready": {
      if (state.phase !== "briefing") return fail("There's nothing to get ready for.");
      if (!next.ready.includes(me.id)) next.ready.push(me.id);
      startInvestigationIfReady(next);
      break;
    }

    case "share": {
      if (!OPEN_PHASES.includes(state.phase)) return fail("You can only share evidence during the investigation.");
      const evidence = caseFile.evidence.find((e) => e.id === action.evidenceId);
      if (!evidence || !self.roles.includes(evidence.role)) return fail("That isn't your evidence to share.");
      if (next.board.some((b) => b.evidenceId === evidence.id)) return fail("That's already on the board.");
      next.board.push({ evidenceId: evidence.id, sharedBy: me.id, at: now } satisfies BoardItem);
      break;
    }

    case "chat": {
      if (state.mode !== "remote") return fail("Chat is only on in remote rooms.");
      const text = String(action.text ?? "").trim().slice(0, MAX_CHAT);
      if (!text) return fail("Say something first.");
      next.chat.push({ id: newId(), playerId: me.id, text, at: now } satisfies ChatLine);
      next.chat = next.chat.slice(-CHAT_KEPT);
      break;
    }

    case "propose": {
      if (!OPEN_PHASES.includes(state.phase)) return fail("Proposals open once the investigation starts.");
      if (state.proposal) return fail("Settle the current vote first.");
      if (action.kind === "accuse" && !caseFile.suspects.some((s) => s.id === action.suspectId)) {
        return fail("Pick a suspect to accuse.");
      }
      if (action.kind === "hint" && state.hintsUnlocked >= caseFile.hints.length) return fail("There are no hints left.");
      if (!["accuse", "hint", "giveUp"].includes(action.kind)) return fail("Unknown proposal.");
      next.proposal = {
        id: newId(),
        kind: action.kind,
        suspectId: action.kind === "accuse" ? action.suspectId : undefined,
        by: me.id,
        at: now,
        votes: { [me.id]: "yes" },
      } satisfies Proposal;
      break;
    }

    case "vote": {
      if (!next.proposal || next.proposal.id !== action.proposalId) return fail("That vote is already over.");
      if (action.vote !== "yes" && action.vote !== "no") return fail("Vote yes or no.");
      next.proposal.votes[me.id] = action.vote;
      break;
    }

    case "withdraw": {
      if (!next.proposal || next.proposal.id !== action.proposalId) return fail("That vote is already over.");
      if (next.proposal.by !== me.id) return fail("Only the person who proposed it can withdraw it.");
      next.proposal = null;
      break;
    }

    case "leave": {
      removePlayer(next, self, now);
      break;
    }

    case "kick": {
      if (!isHost) return fail("Only the host can remove players.");
      const target = next.players.find((p) => p.id === action.playerId && !p.left);
      if (!target || target.id === me.id) return fail("Can't remove that player.");
      removePlayer(next, target, now);
      break;
    }

    default:
      return fail("Unknown action.");
  }

  resolveProposal(next, now);
  // An accusation only becomes "solved" here, where the solution is known.
  if (next.outcome?.kind === "wrong" && next.outcome.suspectId === caseFile.solution.culprit) next.outcome.kind = "solved";
  next.version++;
  return { ok: true, state: next };
}

/** Authoring mistakes in a case file. An empty list means the case can run. */
export function checkCase(caseFile: CaseFile): string[] {
  const problems: string[] = [];
  const roleIds = new Set(caseFile.roles.map((r) => r.id));
  const core = caseFile.roles.filter((r) => r.core);
  if (!core.length) problems.push("needs at least one core role");
  if (caseFile.minPlayers < 1 || caseFile.maxPlayers < caseFile.minPlayers) problems.push("player range is invalid");
  if (caseFile.maxPlayers > caseFile.roles.length) {
    problems.push("more players than roles: someone would get no evidence");
  }
  for (const role of caseFile.roles) {
    if (!caseFile.evidence.some((e) => e.role === role.id)) problems.push(`role "${role.id}" has no evidence`);
  }
  for (const e of caseFile.evidence) {
    if (!roleIds.has(e.role)) problems.push(`evidence "${e.id}" belongs to unknown role "${e.role}"`);
  }
  const ids = caseFile.evidence.map((e) => e.id);
  if (new Set(ids).size !== ids.length) problems.push("evidence ids are not unique");
  if (!caseFile.suspects.some((s) => s.id === caseFile.solution.culprit)) problems.push("the culprit is not a suspect");
  return problems;
}

// ---------------------------------------------------------------------------
// What each player is allowed to see

export type PublicPlayer = {
  id: string;
  name: string;
  roles: string[];
  isHost: boolean;
  online: boolean;
  ready: boolean;
};

export type PlayerView = {
  code: string;
  version: number;
  phase: Phase;
  mode: Mode;
  me: PublicPlayer;
  case: {
    id: string;
    code: string;
    title: string;
    briefing: string;
    minPlayers: number;
    maxPlayers: number;
    suspects: CaseSuspect[];
    roles: CaseRole[];
    hintsTotal: number;
  };
  players: PublicPlayer[];
  /** Evidence held through this player's roles. */
  myEvidence: CaseEvidence[];
  board: (BoardItem & { evidence: CaseEvidence })[];
  chat: ChatLine[];
  hints: string[];
  proposal: Proposal | null;
  votesNeeded: number;
  decided: DecidedProposal[];
  outcome: Outcome | null;
  /** Only after the reveal: the answer, and every piece of evidence for the recap. */
  solution: CaseFile["solution"] | null;
  allEvidence: CaseEvidence[] | null;
};

export function viewFor(state: RoomState, caseFile: CaseFile, playerId: string, online: Set<string>): PlayerView {
  const toPublic = (p: Player): PublicPlayer => ({
    id: p.id,
    name: p.name,
    roles: p.roles,
    isHost: p.id === state.hostId,
    online: online.has(p.id),
    ready: state.ready.includes(p.id),
  });
  const me = state.players.find((p) => p.id === playerId)!;
  const revealed = state.phase === "reveal";
  const evidenceById = new Map(caseFile.evidence.map((e) => [e.id, e]));

  return {
    code: state.code,
    version: state.version,
    phase: state.phase,
    mode: state.mode,
    me: toPublic(me),
    case: {
      id: caseFile.id,
      code: caseFile.code,
      title: caseFile.title,
      briefing: caseFile.briefing,
      minPlayers: caseFile.minPlayers,
      maxPlayers: caseFile.maxPlayers,
      suspects: caseFile.suspects,
      roles: caseFile.roles,
      hintsTotal: caseFile.hints.length,
    },
    players: activePlayers(state).map(toPublic),
    myEvidence: caseFile.evidence.filter((e) => me.roles.includes(e.role)),
    board: state.board.map((b) => ({ ...b, evidence: evidenceById.get(b.evidenceId)! })),
    chat: state.mode === "remote" ? state.chat : [],
    hints: caseFile.hints.slice(0, state.hintsUnlocked),
    proposal: state.proposal,
    votesNeeded: votesNeeded(state),
    decided: state.decided.slice(-5),
    outcome: state.outcome,
    solution: revealed ? caseFile.solution : null,
    allEvidence: revealed ? caseFile.evidence : null,
  };
}
