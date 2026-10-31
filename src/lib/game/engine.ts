/**
 * The rules of a room, as pure functions: no storage, no network, no clock.
 * The server is the referee: it runs every action through applyAction and
 * sends each player only what viewFor lets them see.
 */
import type {
  Ability,
  Action,
  Activity,
  ActivityKind,
  Beat,
  CaseEvidence,
  CaseFile,
  CaseRole,
  CaseSuspect,
  ChatLine,
  DecidedProposal,
  FinalReport,
  Interrogation,
  InterrogationState,
  Mode,
  Phase,
  Pin,
  Player,
  Proposal,
  RoomState,
  Score,
  ThemeId,
} from "./types";

export const MAX_NAME = 24;
export const MAX_CHAT = 300;
export const MAX_QUERY = 40;
/** The board only holds this many pins, so the group has to agree on what matters. */
export const PIN_LIMIT = 8;
/** Cross-checks that find nothing are limited per chapter, so the Archivist has to reason, not try every pair. */
export const EMPTY_CHECKS = 3;
const CHAT_KEPT = 200;
const ACTIVITY_KEPT = 120;
const SEARCHES_KEPT = 60;

export type Result = { ok: true; state: RoomState } | { ok: false; error: string };

const fail = (error: string): Result => ({ ok: false, error });

export const activePlayers = (state: RoomState) => state.players.filter((p) => !p.left);

/** More than half of the players still in the room. */
export const votesNeeded = (state: RoomState) => Math.floor(activePlayers(state).length / 2) + 1;

export function cleanName(name: string) {
  return name.replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
}

/** Search terms compare without case, spaces, punctuation or accents: "Page & Co." matches "pageco". */
export function normalizeTerm(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const pairKey = (a: string, b: string) => [a, b].sort().join("+");

/** Whether everything a piece of evidence depends on has turned up. */
export const opened = (state: Pick<RoomState, "found">, evidence: CaseEvidence) => (evidence.after ?? []).every((id) => state.found[id]);

/**
 * The record a search finds. An exact term wins; otherwise the longest term
 * found inside the query, so "studio a door" finds the door log, not the studio.
 * With `state`, records still waiting on a lead stay hidden.
 */
export function bestSearchHit(caseFile: CaseFile, chapter: number, term: string, state?: Pick<RoomState, "found">) {
  let best: { evidence: CaseEvidence; score: number } | null = null;
  for (const e of caseFile.evidence) {
    if (e.access.kind !== "search" || e.chapter > chapter || (state && !opened(state, e))) continue;
    for (const t of e.access.terms) {
      const score = term === t ? 1000 + t.length : t.length >= 3 && term.includes(t) ? t.length : 0;
      if (score > (best?.score ?? 0)) best = { evidence: e, score };
    }
  }
  return best?.evidence;
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
    chapter: 1,
    found: {},
    pins: [],
    questionsUsed: 0,
    searches: [],
    checked: [],
    emptyChecks: {},
    chat: [],
    activity: [],
    hintsUsed: 0,
    hintsOpen: {},
    wrongAnswers: 0,
    proposal: null,
    decided: [],
    outcome: null,
  };
}

/** New players can only join in the lobby; returning players are recognised by their token instead. */
export function addPlayer(
  state: RoomState,
  caseFile: CaseFile,
  player: { id: string; token: string; name: string; bot?: boolean },
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

/** The abilities a player has through the roles they hold. */
export function abilitiesOf(caseFile: CaseFile, player: Pick<Player, "roles">): Ability[] {
  return caseFile.roles.filter((r) => player.roles.includes(r.id) && r.ability !== "none").map((r) => r.ability);
}

/** Whether a player can see a piece of evidence right now. */
export function canSee(state: RoomState, player: Pick<Player, "id" | "roles">, evidence: CaseEvidence) {
  if (state.phase === "reveal") return true;
  if (evidence.chapter > state.chapter) return false;
  if (state.pins.some((p) => p.evidenceId === evidence.id)) return true;
  if (evidence.access.kind === "desk") return player.roles.includes(evidence.role);
  const found = state.found[evidence.id];
  return Boolean(found) && (player.roles.includes(evidence.role) || found.by === player.id);
}

/** The confrontation, once the team has named the right person. */
function openInterrogation(state: RoomState, caseFile: CaseFile): Interrogation | undefined {
  return state.interrogation ? caseFile.interrogation : undefined;
}

/** The Interviewer runs the interrogation; when only bots hold that role, anyone can. */
function leadsInterrogation(state: RoomState, caseFile: CaseFile, player: Pick<Player, "id">) {
  const leads = activePlayers(state).filter((p) => abilitiesOf(caseFile, p).includes("interview"));
  return leads.some((p) => p.id === player.id) || leads.every((p) => p.bot);
}

/** Tells the team when a find opens someone else's next move. It doesn't say what: they have to ask. */
function announceLeads(state: RoomState, caseFile: CaseFile, foundId: string, finder: Player, now: number, newId: () => string) {
  const roles = new Set(
    caseFile.evidence.filter((e) => e.after?.includes(foundId) && e.chapter <= state.chapter && !state.found[e.id] && opened(state, e)).map((e) => e.role),
  );
  for (const role of roles) {
    const name = caseFile.roles.find((r) => r.id === role)?.name ?? role;
    log(state, newId, now, "lead", `${finder.name}'s find gives the ${name} a new lead.`, finder.id, foundId);
  }
}

function log(state: RoomState, newId: () => string, now: number, kind: ActivityKind, text: string, playerId?: string, evidenceId?: string) {
  state.activity.push({ id: newId(), at: now, kind, text, playerId, evidenceId } satisfies Activity);
  state.activity = state.activity.slice(-ACTIVITY_KEPT);
}

/** A player who leaves mid-case hands each role to whoever holds the fewest, so no evidence or ability is lost. */
function handOverRoles(state: RoomState, leaving: Player) {
  for (const role of leaving.roles) {
    const takers = activePlayers(state).filter((p) => p.id !== leaving.id);
    if (!takers.length) break;
    const taker = takers.reduce((a, b) => (b.roles.length < a.roles.length ? b : a));
    taker.roles.push(role);
  }
  leaving.roles = [];
}

function removePlayer(state: RoomState, caseFile: CaseFile, player: Player, now: number, newId: () => string) {
  if (state.phase === "lobby") {
    state.players = state.players.filter((p) => p.id !== player.id);
  } else {
    handOverRoles(state, player);
    player.left = true;
    log(state, newId, now, "leave", `${player.name} left. Their roles were passed on.`, player.id);
  }
  state.ready = state.ready.filter((id) => id !== player.id);
  if (state.proposal) delete state.proposal.votes[player.id];
  if (state.hostId === player.id) {
    const heir = activePlayers(state)[0];
    if (heir) state.hostId = heir.id;
  }
  if (state.phase === "briefing") startInvestigationIfReady(state, now);
  resolveProposal(state, caseFile, now, newId);
}

function startInvestigationIfReady(state: RoomState, now: number) {
  const active = activePlayers(state);
  if (active.length && active.every((p) => state.ready.includes(p.id))) {
    state.phase = "investigation";
    state.startedAt = now;
  }
}

export function scoreReport(state: RoomState, caseFile: CaseFile, report: FinalReport): Score {
  const { solution } = caseFile;
  const culprit = report.suspectId === solution.culprit;
  const motive = culprit && report.motiveId === solution.motive;
  const evidence = caseFile.interrogation
    ? culprit && state.interrogation?.over === "confessed"
    : culprit && new Set(report.evidenceIds).size === 2 && report.evidenceIds.every((id) => solution.keyEvidence.includes(id));
  const sharp = culprit && state.hintsUsed <= 1 && state.wrongAnswers === 0 && state.interrogation?.over !== "walkedOut";
  return { culprit, motive, evidence, sharp, stars: culprit ? 2 + Number(motive) + Number(evidence) + Number(sharp) : 0 };
}

const NO_SCORE: Score = { stars: 0, culprit: false, motive: false, evidence: false, sharp: false };

function closeCase(state: RoomState, caseFile: CaseFile, report: FinalReport, kind: "solved" | "wrong" | "walkedOut", now: number) {
  state.outcome = { kind, report, score: scoreReport(state, caseFile, report), at: now };
  state.phase = "reveal";
}

/** One fixed order per room. Without it, the right answer sits in the same place case after case and players learn the place. */
function shuffledFor<T extends { id: string }>(code: string, items: T[]) {
  const rank = (id: string) => [...`${code}:${id}`].reduce((hash, ch) => Math.imul(hash ^ ch.charCodeAt(0), 16777619), 2166136261) >>> 0;
  return [...items].sort((a, b) => rank(a.id) - rank(b.id));
}

/** Settles the open proposal once a majority is for it, or once it can no longer get one. */
function resolveProposal(state: RoomState, caseFile: CaseFile, now: number, newId: () => string) {
  const proposal = state.proposal;
  if (!proposal) return;
  const active = activePlayers(state);
  const needed = votesNeeded(state);
  const yes = active.filter((p) => proposal.votes[p.id] === "yes").length;
  const no = active.filter((p) => proposal.votes[p.id] === "no").length;
  const passed = yes >= needed;
  const failed = active.length - no < needed;
  if (!passed && !failed) return;

  const decided: DecidedProposal = {
    id: proposal.id,
    kind: proposal.kind,
    evidenceId: proposal.evidenceId,
    report: proposal.report,
    by: proposal.by,
    at: proposal.at,
    passed,
    decidedAt: now,
  };
  state.proposal = null;

  if (passed) {
    const chapter = caseFile.chapters[state.chapter - 1];
    if (proposal.kind === "answer" && chapter.checkpoint) {
      decided.correct = chapter.checkpoint.proves.includes(proposal.evidenceId ?? "");
      if (decided.correct) {
        state.chapter++;
        const opened = caseFile.chapters[state.chapter - 1];
        log(state, newId, now, "chapter", `Chapter ${state.chapter} unlocked: ${opened.title}`);
      } else {
        state.wrongAnswers++;
        const title = caseFile.evidence.find((e) => e.id === proposal.evidenceId)?.title;
        const time = caseFile.deadline?.times[state.wrongAnswers];
        log(state, newId, now, "wrong", `"${title}" doesn't prove it. ${time ? `The hours slip away. It's ${time}.` : "Look again."}`);
        if (caseFile.deadline && !time) {
          state.outcome = { kind: "tooLate", score: NO_SCORE, at: now };
          state.phase = "reveal";
        }
      }
    }
    if (proposal.kind === "hint") {
      state.hintsOpen[state.chapter] = (state.hintsOpen[state.chapter] ?? 0) + 1;
      state.hintsUsed++;
      log(state, newId, now, "hint", "A hint was opened.");
    }
    if (proposal.kind === "final" && proposal.report) {
      const culprit = proposal.report.suspectId === caseFile.solution.culprit;
      if (culprit && caseFile.interrogation) {
        state.accusation = proposal.report;
        state.interrogation = { claim: 0, broken: [], strikes: 0 };
        log(state, newId, now, "chapter", "You've named them. Now break their story.");
      } else {
        closeCase(state, caseFile, proposal.report, culprit ? "solved" : "wrong", now);
      }
    }
    if (proposal.kind === "giveUp") {
      state.outcome = { kind: "gaveUp", score: NO_SCORE, at: now };
      state.phase = "reveal";
    }
  }
  state.decided.push(decided);
  state.decided = state.decided.slice(-20);
}

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
  const abilities = abilitiesOf(caseFile, self);
  const investigating = state.phase === "investigation";
  const evidenceById = (id: string) => caseFile.evidence.find((e) => e.id === id);

  switch (action.type) {
    case "setMode": {
      if (!isHost) return fail("Only the host can change this.");
      if (state.phase !== "lobby") return fail("The case has already started.");
      if (action.mode !== "together" && action.mode !== "remote") return fail("Unknown mode.");
      next.mode = action.mode;
      break;
    }

    case "rename": {
      if (state.phase !== "lobby") return fail("Names are set once the case starts.");
      const name = cleanName(String(action.name ?? ""));
      if (!name) return fail("Pick a name first.");
      if (activePlayers(state).some((p) => p.id !== me.id && p.name.toLowerCase() === name.toLowerCase())) return fail("Someone here already has that name.");
      self.name = name;
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
      startInvestigationIfReady(next, now);
      break;
    }

    case "search": {
      if (!investigating) return fail("Searches open once the investigation starts.");
      if (!abilities.includes("search")) return fail("Only the Tech can search the records.");
      const query = String(action.query ?? "").trim().slice(0, MAX_QUERY);
      const term = normalizeTerm(query);
      if (term.length < 2) return fail("Type a name, number or place to search for.");
      const hit = bestSearchHit(caseFile, state.chapter, term, state);
      next.searches.push({ id: newId(), by: me.id, query, hit: hit?.id ?? null, at: now });
      next.searches = next.searches.slice(-SEARCHES_KEPT);
      if (hit && !next.found[hit.id]) {
        next.found[hit.id] = { by: me.id, at: now };
        log(next, newId, now, "found", `${me.name} searched "${query}" and found: ${hit.title}`, me.id, hit.id);
        announceLeads(next, caseFile, hit.id, self, now, newId);
      } else if (!hit) {
        log(next, newId, now, "miss", `${me.name} searched "${query}". No records.`, me.id);
      }
      break;
    }

    case "ask": {
      if (!investigating) return fail("Interviews open once the investigation starts.");
      if (!abilities.includes("interview")) return fail("Only the Interviewer can ask questions.");
      const question = evidenceById(action.evidenceId);
      if (!question || question.access.kind !== "interview" || question.chapter > state.chapter) return fail("That question isn't available.");
      if (next.found[question.id]) return fail("You've already asked that.");
      if (!opened(state, question)) return fail("That isn't a question you can ask yet.");
      // Following a lead is free: running out of questions must never lock the team out of a chain.
      if (!question.after) {
        if (next.questionsUsed >= caseFile.questionBudget) return fail("The team has used all its questions.");
        next.questionsUsed++;
      }
      next.found[question.id] = { by: me.id, at: now };
      log(next, newId, now, "found", `${me.name} asked ${question.access.suspect}: "${question.access.question}"`, me.id, question.id);
      announceLeads(next, caseFile, question.id, self, now, newId);
      break;
    }

    case "inspect": {
      if (!investigating) return fail("Nothing to inspect yet.");
      if (!abilities.includes("inspect")) return fail("Only the Photographer can inspect photos.");
      const scene = evidenceById(action.scene);
      if (!scene || (scene.body.type !== "scene" && scene.body.type !== "footage") || !canSee(state, self, scene)) {
        return fail("You can't see that photo.");
      }
      const detail = caseFile.evidence.find(
        (e) =>
          e.access.kind === "inspect" &&
          e.access.scene === scene.id &&
          e.access.hotspot === action.hotspot &&
          e.chapter <= state.chapter,
      );
      if (!detail) return fail("Nothing unusual there.");
      if (next.found[detail.id]) return fail("Already noted.");
      if (!opened(state, detail)) return fail("Nothing stands out yet.");
      next.found[detail.id] = { by: me.id, at: now };
      log(next, newId, now, "found", `${me.name} spotted something in "${scene.title}": ${detail.title}`, me.id, detail.id);
      announceLeads(next, caseFile, detail.id, self, now, newId);
      break;
    }

    case "crosscheck": {
      if (!investigating) return fail("Nothing to cross-check yet.");
      if (!abilities.includes("crosscheck")) return fail("Only the Archivist can cross-check evidence.");
      const a = evidenceById(action.a);
      const b = evidenceById(action.b);
      if (!a || !b || a.id === b.id) return fail("Pick two different pieces of evidence.");
      if (!canSee(state, self, a) || !canSee(state, self, b)) return fail("You can only compare evidence you can see.");
      const key = pairKey(a.id, b.id);
      const insight = caseFile.evidence.find(
        (e) => e.access.kind === "crosscheck" && pairKey(...e.access.pair) === key && e.chapter <= state.chapter,
      );
      if (insight) {
        if (next.found[insight.id]) return fail("You've already caught that one.");
        next.found[insight.id] = { by: me.id, at: now };
        log(next, newId, now, "found", `${me.name} caught a lie: ${insight.title}`, me.id, insight.id);
        announceLeads(next, caseFile, insight.id, self, now, newId);
      } else {
        if (next.checked.includes(key)) return fail("You've already compared those two.");
        const empty = next.emptyChecks?.[state.chapter] ?? 0;
        if (empty >= EMPTY_CHECKS) return fail("Those two agree, and you're out of hunches this chapter. Only a real contradiction counts now.");
        next.checked.push(key);
        next.emptyChecks = { ...next.emptyChecks, [state.chapter]: empty + 1 };
        log(next, newId, now, "miss", `${me.name} compared "${a.title}" with "${b.title}". They agree.`, me.id);
      }
      break;
    }

    case "press": {
      const interrogation = openInterrogation(state, caseFile);
      if (!investigating || !interrogation) return fail("There's nobody to interrogate yet.");
      if (!leadsInterrogation(state, caseFile, self)) return fail("Only the Interviewer can press on.");
      const room: InterrogationState = next.interrogation ?? { claim: 0, broken: [], strikes: 0 };
      if (room.over) return fail("The interrogation is over.");
      const total = interrogation.claims.length;
      room.claim = (room.claim + (action.step === -1 ? -1 : 1) + total) % total;
      next.interrogation = room;
      break;
    }

    case "callLie": {
      const interrogation = openInterrogation(state, caseFile);
      if (!investigating || !interrogation) return fail("There's nobody to interrogate yet.");
      const room: InterrogationState = next.interrogation ?? { claim: 0, broken: [], strikes: 0 };
      if (room.over) return fail("The interrogation is over.");
      const evidence = evidenceById(action.evidenceId);
      if (!evidence || !state.pins.some((p) => p.evidenceId === evidence.id)) return fail("Present something from the board, so everyone can see it.");
      const claim = interrogation.claims[room.claim];
      if (room.broken.includes(claim.id)) return fail("You've already caught that lie.");
      const suspect = caseFile.suspects.find((s) => s.id === interrogation.suspect)?.name ?? "The suspect";
      if (claim.lie?.breaks.includes(evidence.id)) {
        room.broken.push(claim.id);
        log(next, newId, now, "lie", `${me.name} caught ${suspect} lying: "${claim.text}"`, me.id, evidence.id);
        if (interrogation.claims.every((c) => !c.lie || room.broken.includes(c.id))) room.over = "confessed";
      } else {
        room.strikes++;
        log(next, newId, now, "wrong", `${me.name} presented ${evidence.title}. It doesn't break that claim. Strike ${room.strikes} of ${interrogation.strikes}.`, me.id);
        if (room.strikes >= interrogation.strikes) {
          room.over = "walkedOut";
          log(next, newId, now, "wrong", `${suspect} has had enough and walks out.`);
        }
      }
      next.interrogation = room;
      if (room.over) closeCase(next, caseFile, next.accusation!, room.over === "confessed" ? "solved" : "walkedOut", now);
      break;
    }

    case "pin": {
      if (!investigating) return fail("The board opens once the investigation starts.");
      const evidence = evidenceById(action.evidenceId);
      if (!evidence || !canSee(state, self, evidence)) return fail("You can't pin that.");
      if (next.pins.some((p) => p.evidenceId === evidence.id)) return fail("That's already on the board.");
      if (next.pins.length >= PIN_LIMIT) return fail(`The board is full (${PIN_LIMIT}). Unpin something first.`);
      next.pins.push({ evidenceId: evidence.id, by: me.id, at: now } satisfies Pin);
      log(next, newId, now, "pin", `${me.name} pinned ${evidence.title}`, me.id, evidence.id);
      break;
    }

    case "unpin": {
      if (!investigating) return fail("The board is closed.");
      const pin = next.pins.find((p) => p.evidenceId === action.evidenceId);
      if (!pin) return fail("That isn't on the board.");
      if (next.proposal?.report?.evidenceIds.includes(pin.evidenceId) || next.proposal?.evidenceId === pin.evidenceId) return fail("That's part of the vote in progress.");
      next.pins = next.pins.filter((p) => p !== pin);
      log(next, newId, now, "unpin", `${me.name} unpinned ${evidenceById(pin.evidenceId)?.title}`, me.id, pin.evidenceId);
      break;
    }

    case "chat": {
      const text = String(action.text ?? "").trim().slice(0, MAX_CHAT);
      if (!text) return fail("Say something first.");
      next.chat.push({ id: newId(), playerId: me.id, text, at: now } satisfies ChatLine);
      next.chat = next.chat.slice(-CHAT_KEPT);
      break;
    }

    case "propose": {
      if (!investigating) return fail("Proposals open once the investigation starts.");
      if (state.proposal) return fail("Settle the current vote first.");
      const chapter = caseFile.chapters[state.chapter - 1];
      const proposal: Proposal = { id: newId(), kind: action.kind, by: me.id, at: now, votes: { [me.id]: "yes" } };

      if (action.kind === "answer") {
        if (!chapter.checkpoint) return fail("This chapter ends with the final report.");
        if (!state.pins.some((p) => p.evidenceId === action.evidenceId)) return fail("Present something from the board, so everyone can see it.");
        proposal.evidenceId = action.evidenceId;
      } else if (action.kind === "final") {
        if (chapter.checkpoint) return fail("Solve this chapter's question first.");
        if (state.interrogation) return fail("You've already named them. Now break their story.");
        const report = action.report;
        if (!report || !caseFile.suspects.some((s) => s.id === report.suspectId)) return fail("Name a suspect.");
        if (!caseFile.solution.motives.some((m) => m.id === report.motiveId)) return fail("Pick a motive.");
        const ids = Array.isArray(report.evidenceIds) ? report.evidenceIds.map(String) : [];
        if (!caseFile.interrogation) {
          if (ids.length !== 2 || ids[0] === ids[1]) return fail("Pick two different pieces of proof.");
          if (!ids.every((id) => state.pins.some((p) => p.evidenceId === id))) return fail("Your proof has to be pinned on the board.");
        }
        proposal.report = { suspectId: report.suspectId, motiveId: report.motiveId, evidenceIds: caseFile.interrogation ? [] : ids };
      } else if (action.kind === "hint") {
        if ((state.hintsOpen[state.chapter] ?? 0) >= chapter.hints.length) return fail("There are no hints left in this chapter.");
      } else if (action.kind !== "giveUp") {
        return fail("Unknown proposal.");
      }
      next.proposal = proposal;
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
      removePlayer(next, caseFile, self, now, newId);
      break;
    }

    case "kick": {
      if (!isHost) return fail("Only the host can remove players.");
      const target = next.players.find((p) => p.id === action.playerId && !p.left);
      if (!target || target.id === me.id) return fail("Can't remove that player.");
      removePlayer(next, caseFile, target, now, newId);
      break;
    }

    default:
      return fail("Unknown action.");
  }

  resolveProposal(next, caseFile, now, newId);
  next.version++;
  return { ok: true, state: next };
}

/** Authoring mistakes in a case file. An empty list means the case can run. */
export function checkCase(caseFile: CaseFile): string[] {
  const problems: string[] = [];
  const byId = new Map(caseFile.evidence.map((e) => [e.id, e]));
  const roleIds = new Set(caseFile.roles.map((r) => r.id));
  const chapters = caseFile.chapters.length;

  if (!caseFile.roles.some((r) => r.core)) problems.push("needs at least one core role");
  if (caseFile.minPlayers < 1 || caseFile.maxPlayers < caseFile.minPlayers) problems.push("player range is invalid");
  if (caseFile.maxPlayers > caseFile.roles.length) problems.push("more players than roles: someone would get nothing");
  if (!chapters) problems.push("needs at least one chapter");
  caseFile.chapters.forEach((c, i) => {
    const last = i === chapters - 1;
    if (last && c.checkpoint) problems.push(`the last chapter must end with the final report, not a checkpoint`);
    if (!last && !c.checkpoint) problems.push(`chapter ${i + 1} needs a checkpoint to open the next one`);
    if (c.checkpoint && !c.checkpoint.proves.length) problems.push(`chapter ${i + 1}'s checkpoint has nothing that proves it`);
    for (const id of c.checkpoint?.proves ?? []) {
      const proof = byId.get(id);
      if (!proof) problems.push(`chapter ${i + 1}'s proof "${id}" doesn't exist`);
      else if (proof.chapter > i + 1) problems.push(`chapter ${i + 1}'s proof "${id}" doesn't open until chapter ${proof.chapter}`);
    }
  });
  if (byId.size !== caseFile.evidence.length) problems.push("evidence ids are not unique");

  const needs: Record<Exclude<CaseEvidence["access"]["kind"], "desk">, Ability> = {
    search: "search",
    interview: "interview",
    inspect: "inspect",
    crosscheck: "crosscheck",
  };
  for (const e of caseFile.evidence) {
    if (!roleIds.has(e.role)) problems.push(`"${e.id}" belongs to unknown role "${e.role}"`);
    if (e.chapter < 1 || e.chapter > chapters) problems.push(`"${e.id}" is in a chapter that doesn't exist`);
    const a = e.access;
    if (a.kind === "search" && !a.terms.every((t) => t === normalizeTerm(t) && t.length >= 2)) {
      problems.push(`"${e.id}" has search terms that aren't normalised (lowercase letters and digits only)`);
    }
    if (a.kind === "inspect") {
      const scene = byId.get(a.scene);
      const items = !scene ? null : scene.body.type === "scene" ? scene.body.items : scene.body.type === "footage" ? scene.body.frames.flatMap((f) => f.items) : null;
      if (!scene || !items) problems.push(`"${e.id}" inspects "${a.scene}", which isn't a photo or footage`);
      else if (!items.some((item) => item.hotspot === a.hotspot)) problems.push(`"${e.id}" points at a missing hotspot "${a.hotspot}"`);
      else if (scene.chapter > e.chapter) problems.push(`"${e.id}" opens before its scene does`);
    }
    if (a.kind === "crosscheck" && !a.pair.every((id) => byId.has(id))) problems.push(`"${e.id}" cross-checks evidence that doesn't exist`);
    if (a.kind !== "desk" && !caseFile.roles.some((r) => r.core && r.ability === needs[a.kind])) {
      problems.push(`"${e.id}" needs the ${a.kind} ability, but no core role has it`);
    }
  }
  for (const role of caseFile.roles.filter((r) => r.core)) {
    if (!caseFile.evidence.some((e) => e.role === role.id && e.access.kind === "desk" && e.chapter === 1)) {
      problems.push(`core role "${role.id}" starts with nothing on their desk`);
    }
  }
  problems.push(...checkInterrogation(caseFile, byId));
  problems.push(...checkChains(caseFile, byId));
  const { solution } = caseFile;
  if (!caseFile.suspects.some((s) => s.id === solution.culprit)) problems.push("the culprit is not a suspect");
  if (!solution.motives.some((m) => m.id === solution.motive)) problems.push("the motive is not one of the options");
  if (solution.keyEvidence.length < 2) problems.push("needs at least two pieces of key evidence");
  for (const id of solution.keyEvidence) if (!byId.has(id)) problems.push(`key evidence "${id}" doesn't exist`);
  problems.push(...checkWriting(caseFile));
  const questions = caseFile.evidence.filter((e) => e.access.kind === "interview").length;
  if (questions && caseFile.questionBudget >= questions) problems.push("the question budget covers every question: no choices left to make");
  return problems;
}

/** Clue chains have to be followable: every lead points at something findable, and a team that follows them all reaches everything. */
function checkChains(caseFile: CaseFile, byId: Map<string, CaseEvidence>): string[] {
  const problems: string[] = [];
  for (const e of caseFile.evidence) {
    for (const id of e.after ?? []) {
      const source = byId.get(id);
      if (!source) problems.push(`"${e.id}" waits on "${id}", which doesn't exist`);
      else if (source.access.kind === "desk") problems.push(`"${e.id}" waits on "${id}", which everyone starts with`);
      else if (source.chapter > e.chapter) problems.push(`"${e.id}" waits on "${id}", which only appears in a later chapter`);
    }
    if (e.after && e.access.kind !== "search" && e.access.kind !== "interview" && e.access.kind !== "inspect") problems.push(`"${e.id}" can't wait on a lead`);
  }
  const reached = new Set<string>();
  for (let chapter = 1; chapter <= caseFile.chapters.length; chapter++) {
    for (let growing = true; growing; ) {
      growing = false;
      for (const e of caseFile.evidence) {
        if (e.chapter > chapter || reached.has(e.id) || !(e.after ?? []).every((id) => reached.has(id))) continue;
        const a = e.access;
        if ((a.kind === "inspect" && !reached.has(a.scene)) || (a.kind === "crosscheck" && !a.pair.every((id) => reached.has(id)))) continue;
        reached.add(e.id);
        growing = true;
      }
    }
    for (const e of caseFile.evidence) if (e.chapter === chapter && !reached.has(e.id)) problems.push(`"${e.id}" can't be reached in chapter ${chapter}`);
  }
  const open = caseFile.evidence.filter((e) => e.access.kind === "interview" && !e.after).length;
  if (caseFile.evidence.some((e) => e.after) && open > caseFile.questionBudget) problems.push("more open questions than the budget: a team could spend itself out of a chain");
  return problems;
}

function checkInterrogation(caseFile: CaseFile, byId: Map<string, CaseEvidence>): string[] {
  const i = caseFile.interrogation;
  if (!i) return [];
  const problems: string[] = [];
  if (i.suspect !== caseFile.solution.culprit) problems.push("the interrogation has to be with the culprit: only naming them opens it");
  if (i.strikes < 1) problems.push("the interrogation needs at least one strike");
  if (new Set(i.claims.map((c) => c.id)).size !== i.claims.length) problems.push("interrogation claim ids are not unique");
  if (!i.claims.some((c) => c.lie)) problems.push("the interrogation needs at least one lie to catch");
  if (!i.claims.some((c) => !c.lie)) problems.push("the interrogation needs at least one true claim, or every call is a safe bet");
  for (const c of i.claims) {
    if (c.lie && !c.lie.breaks.length) problems.push(`claim "${c.id}" is a lie nothing can break`);
    for (const id of c.lie?.breaks ?? []) {
      if (!byId.has(id)) problems.push(`claim "${c.id}" is broken by "${id}", which doesn't exist`);
    }
  }
  return problems;
}

/**
 * The house standard for writing: the story comes in short beats, and no card
 * turns into a wall of text. Limits are in characters.
 */
export const WRITING_LIMITS = {
  beat: 170,
  briefing: 420,
  statement: 280,
  document: 340,
  finding: 210,
  chatMessage: 170,
  logRow: 95,
  hint: 160,
};

function checkWriting(caseFile: CaseFile): string[] {
  const problems: string[] = [];
  const L = WRITING_LIMITS;
  const tooLong = (what: string, text: string, max: number) => {
    if (text.length > max) problems.push(`${what} is ${text.length} characters (max ${max}): split it up`);
  };
  const beats = (where: string, list: Beat[], min: number) => {
    if (list.length < min) problems.push(`${where} needs at least ${min} story beats`);
    list.forEach((b, i) => {
      tooLong(`${where} beat ${i + 1}`, b.text ?? "", L.beat);
      if (b.kind === "line" && !caseFile.suspects.some((s) => s.id === b.who) && !b.who.trim()) problems.push(`${where} beat ${i + 1} has no speaker`);
    });
  };

  tooLong("the briefing", caseFile.briefing, L.briefing);
  beats("the case story", caseFile.story, 3);
  caseFile.chapters.forEach((c, i) => {
    if (i > 0) beats(`chapter ${i + 1}'s story`, c.story, 2);
    c.hints.forEach((h, j) => tooLong(`chapter ${i + 1} hint ${j + 1}`, h, L.hint));
  });
  beats("the confession", caseFile.solution.confession, 2);
  if (caseFile.interrogation) {
    const i = caseFile.interrogation;
    i.claims.forEach((c) => {
      tooLong(`claim "${c.id}"`, c.text, L.beat);
      if (c.lie) tooLong(`claim "${c.id}"'s crack`, c.lie.crack, L.beat);
    });
    tooLong("the walkout", i.walkout, L.beat);
  }
  if (!caseFile.solution.confession.some((b) => b.kind === "line" && b.who === caseFile.solution.culprit)) {
    problems.push("the confession should have the culprit speaking");
  }

  for (const e of caseFile.evidence) {
    const b = e.body;
    if (b.type === "statement") tooLong(`"${e.id}"`, b.text, L.statement);
    if (b.type === "document") tooLong(`"${e.id}"`, b.text, L.document);
    if (b.type === "finding") tooLong(`"${e.id}"`, b.text, L.finding);
    if (b.type === "chat") b.messages.forEach((m, i) => tooLong(`"${e.id}" message ${i + 1}`, m.text, L.chatMessage));
    if (b.type === "log") b.rows.forEach((r, i) => tooLong(`"${e.id}" row ${i + 1}`, r.text, L.logRow));
    if (b.type === "recording") b.segments.forEach((r, i) => tooLong(`"${e.id}" moment ${i + 1}`, r.text, L.logRow));
  }
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
  bot: boolean;
};

export type VisibleEvidence = Omit<CaseEvidence, "access"> & {
  source: CaseEvidence["access"]["kind"];
  /** For a found detail: where in which scene it was spotted. */
  spot?: { scene: string; hotspot: string };
  pinned: boolean;
  /** Who found it, for evidence that had to be found. */
  foundBy?: string;
  foundAt?: number;
  /** On this player's own desk or found through their roles, as opposed to only on the board. */
  mine: boolean;
};

export type PlayerView = {
  code: string;
  version: number;
  phase: Phase;
  mode: Mode;
  startedAt: number | null;
  me: PublicPlayer & { abilities: Ability[] };
  case: {
    id: string;
    code: string;
    title: string;
    tagline: string;
    theme: ThemeId;
    briefing: string;
    story: Beat[];
    minPlayers: number;
    maxPlayers: number;
    suspects: CaseSuspect[];
    roles: CaseRole[];
    chapterTitles: string[];
    cinematic: CaseFile["cinematic"] | null;
    questionBudget: number;
    motives: { id: string; label: string }[];
    /** Whether naming the culprit leads to a confrontation rather than closing the case. */
    confrontation: boolean;
  };
  chapter: {
    number: number;
    title: string;
    intro: string;
    story: Beat[];
    checkpoint: { question: string } | null;
    hints: string[];
    hintsTotal: number;
  };
  /** The story's clock: what's coming, the time now, how many wrong answers are left, and how it ended if it ran out. */
  deadline: { what: string; time: string; left: number; lost: string | null } | null;
  /** Checkpoints already answered, with what they revealed. */
  solved: { number: number; title: string; question: string; reveal: string }[];
  players: PublicPlayer[];
  evidence: VisibleEvidence[];
  pins: Pin[];
  pinLimit: number;
  /** For the Interviewer: the questions open so far. */
  questions: { id: string; suspect: string; question: string; asked: boolean; chapter: number; lead: boolean }[] | null;
  /** What teammates have found that opens something new for this player. */
  leads: { id: string; title: string; by: string }[];
  questionsLeft: number;
  searches: { id: string; by: string; query: string; hit: boolean; hitTitle?: string; at: number }[];
  /** For the Archivist: pairs already compared without a result. */
  checked: string[];
  /** For the Archivist: empty cross-checks still allowed in this chapter. */
  checksLeft: number | null;
  /** Once the team names the right person. Claims are only spelled out to whoever leads it, or once broken. */
  interrogation: {
    suspect: string;
    opening: string;
    total: number;
    index: number;
    /** The current claim's words: for the lead, or once it's broken; null otherwise. */
    claim: string | null;
    broken: { id: string; text: string; crack: string }[];
    /** Whether the current claim has been caught already. */
    currentBroken: boolean;
    strikes: number;
    strikesAllowed: number;
    leads: boolean;
    over: InterrogationState["over"] | null;
    walkout: string | null;
  } | null;
  activity: Activity[];
  chat: ChatLine[];
  hintsUsed: number;
  wrongAnswers: number;
  proposal: Proposal | null;
  votesNeeded: number;
  decided: DecidedProposal[];
  outcome: RoomState["outcome"];
  /** Only after the reveal. */
  solution: CaseFile["solution"] | null;
  /** Set by the room service: whether the host may add bots here. */
  testBots?: boolean;
};

function interrogationView(state: RoomState, caseFile: CaseFile, me: Player): PlayerView["interrogation"] {
  const interrogation = openInterrogation(state, caseFile);
  if (!interrogation) return null;
  const room = state.interrogation!;
  const leads = leadsInterrogation(state, caseFile, me);
  const current = interrogation.claims[room.claim];
  const currentBroken = room.broken.includes(current.id);
  return {
    suspect: interrogation.suspect,
    opening: interrogation.opening,
    total: interrogation.claims.length,
    index: room.claim,
    claim: leads || currentBroken ? current.text : null,
    broken: interrogation.claims.flatMap((c) => (room.broken.includes(c.id) && c.lie ? [{ id: c.id, text: c.text, crack: c.lie.crack }] : [])),
    currentBroken,
    strikes: room.strikes,
    strikesAllowed: interrogation.strikes,
    leads,
    over: room.over ?? null,
    walkout: room.over === "walkedOut" ? interrogation.walkout : null,
  };
}

export function viewFor(state: RoomState, caseFile: CaseFile, playerId: string, online: Set<string>): PlayerView {
  const toPublic = (p: Player): PublicPlayer => ({
    id: p.id,
    name: p.name,
    roles: p.roles,
    isHost: p.id === state.hostId,
    online: Boolean(p.bot) || online.has(p.id),
    ready: state.ready.includes(p.id),
    bot: Boolean(p.bot),
  });
  const me = state.players.find((p) => p.id === playerId)!;
  const abilities = abilitiesOf(caseFile, me);
  const revealed = state.phase === "reveal";
  const chapter = caseFile.chapters[state.chapter - 1];
  const pinned = new Set(state.pins.map((p) => p.evidenceId));

  const evidence: VisibleEvidence[] = caseFile.evidence
    .filter((e) => canSee(state, me, e))
    .map(({ access, ...e }) => {
      const found = state.found[e.id];
      const ownDesk = access.kind === "desk" && me.roles.includes(e.role);
      const ownFind = Boolean(found) && (me.roles.includes(e.role) || found.by === me.id);
      return {
        ...e,
        source: access.kind,
        spot: access.kind === "inspect" ? { scene: access.scene, hotspot: access.hotspot } : undefined,
        pinned: pinned.has(e.id),
        foundBy: found?.by,
        foundAt: found?.at,
        mine: ownDesk || ownFind,
      };
    });

  const visibleIds = new Set(evidence.map((e) => e.id));
  const questions = abilities.includes("interview")
    ? caseFile.evidence.flatMap((e) =>
        e.access.kind === "interview" && e.chapter <= state.chapter && opened(state, e)
          ? [{ id: e.id, suspect: e.access.suspect, question: e.access.question, asked: Boolean(state.found[e.id]), chapter: e.chapter, lead: Boolean(e.after) }]
          : [],
      )
    : null;

  const leadSources = caseFile.evidence
    .filter((e) => e.after && me.roles.includes(e.role) && e.chapter <= state.chapter && !state.found[e.id] && opened(state, e))
    .flatMap((e) => e.after!);
  const leads = [...new Set(leadSources)].flatMap((id) => {
    const source = caseFile.evidence.find((e) => e.id === id);
    return source ? [{ id, title: source.title, by: state.found[id].by }] : [];
  });

  return {
    code: state.code,
    version: state.version,
    phase: state.phase,
    mode: state.mode,
    startedAt: state.startedAt ?? null,
    me: { ...toPublic(me), abilities },
    case: {
      id: caseFile.id,
      code: caseFile.code,
      title: caseFile.title,
      tagline: caseFile.tagline,
      theme: caseFile.theme ?? "noir",
      briefing: caseFile.briefing,
      story: caseFile.story,
      minPlayers: caseFile.minPlayers,
      maxPlayers: caseFile.maxPlayers,
      suspects: caseFile.suspects,
      roles: caseFile.roles,
      chapterTitles: caseFile.chapters.map((c) => c.title),
      cinematic: caseFile.cinematic ?? null,
      questionBudget: caseFile.questionBudget,
      motives: shuffledFor(state.code, caseFile.solution.motives),
      confrontation: Boolean(caseFile.interrogation),
    },
    chapter: {
      number: state.chapter,
      title: chapter.title,
      intro: chapter.intro,
      story: chapter.story,
      checkpoint: chapter.checkpoint ? { question: chapter.checkpoint.question } : null,
      hints: chapter.hints.slice(0, state.hintsOpen[state.chapter] ?? 0),
      hintsTotal: chapter.hints.length,
    },
    deadline: caseFile.deadline
      ? {
          what: caseFile.deadline.what,
          time: caseFile.deadline.times[Math.min(state.wrongAnswers, caseFile.deadline.times.length - 1)],
          left: Math.max(0, caseFile.deadline.times.length - state.wrongAnswers),
          lost: state.outcome?.kind === "tooLate" ? caseFile.deadline.lost : null,
        }
      : null,
    solved: caseFile.chapters.slice(0, state.chapter - 1).map((c, i) => ({
      number: i + 1,
      title: c.title,
      question: c.checkpoint!.question,
      reveal: c.checkpoint!.reveal,
    })),
    players: activePlayers(state).map(toPublic),
    evidence,
    pins: state.pins,
    pinLimit: PIN_LIMIT,
    questions,
    leads,
    questionsLeft: caseFile.questionBudget - state.questionsUsed,
    searches: state.searches.map((s) => ({
      id: s.id,
      by: s.by,
      query: s.query,
      hit: Boolean(s.hit),
      hitTitle: s.hit && visibleIds.has(s.hit) ? evidence.find((e) => e.id === s.hit)?.title : undefined,
      at: s.at,
    })),
    checked: abilities.includes("crosscheck") ? state.checked : [],
    checksLeft: abilities.includes("crosscheck") ? EMPTY_CHECKS - (state.emptyChecks?.[state.chapter] ?? 0) : null,
    interrogation: interrogationView(state, caseFile, me),
    activity: state.activity.slice(-60),
    chat: state.chat,
    hintsUsed: state.hintsUsed,
    wrongAnswers: state.wrongAnswers,
    proposal: state.proposal,
    votesNeeded: votesNeeded(state),
    decided: state.decided.slice(-5),
    outcome: state.outcome,
    solution: revealed ? caseFile.solution : null,
  };
}
