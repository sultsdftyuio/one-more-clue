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
  ChainStep,
  ChatLine,
  Cheer,
  CheerKind,
  DecidedProposal,
  EvidenceBody,
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
import { cleanFrame, framedHotspot, MIN_SHOT_ZOOM, zoomOf } from "./camera.ts";
import { linesOf } from "./lines.ts";
import { checkWorld, pullAt, spotsFor, type WorldSpotView } from "./world.ts";
import { closeEventIfOver, drinkCoffee, finishSideJob, flipFuse, helpsFor, jobsFor, startEventIfDue, type HelpsView, type SideJobView } from "./helps.ts";
import { clockTime, costMinutes, formatSpan, LOW_NIGHT, nightLeft, nightMinutes, parseTime, spentMinutes, type Spend } from "./clock.ts";

export const MAX_NAME = 24;
export const MAX_CHAT = 300;
export const MAX_QUERY = 40;
/** The board only holds this many pins, so the group has to agree on what matters. */
export const PIN_LIMIT = 8;
/** How long the team has to object before a called lie lands. */
export const OBJECTION_MS = 5000;
/** One player can push something onto every phone this often, so it stays a moment and not a stream. */
export const SPOTLIGHT_GAP_MS = 12_000;
const CHAT_KEPT = 200;
/** Lobby reactions: the last few are kept, and one player can throw one this often. */
const CHEERS_KEPT = 12;
export const CHEER_GAP_MS = 700;
const CHEER_KINDS: CheerKind[] = ["popcorn", "shh", "ooh"];
const ACTIVITY_KEPT = 120;
const SEARCHES_KEPT = 60;
const SHOTS_KEPT = 40;
const SHOWS_KEPT = 40;
const TRIES_KEPT = 20;

/** Everything a piece of evidence says, as one searchable string: for checking a password is really in someone's evidence. */
function textOfEvidence(evidence: CaseEvidence) {
  const parts: string[] = [evidence.title];
  const walk = (value: unknown) => {
    if (typeof value === "string") parts.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") Object.values(value).forEach(walk);
  };
  walk(evidence.body);
  return normalizeTerm(parts.join(" "));
}

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

/** Whether everything a piece of evidence depends on has turned up (and, for `afterAny`, at least one of those). */
export const opened = (state: Pick<RoomState, "found">, evidence: CaseEvidence) =>
  (evidence.after ?? []).every((id) => state.found[id]) && (!evidence.afterAny?.length || evidence.afterAny.some((id) => state.found[id]));

/** The finds a piece of evidence waits on, whichever kind of wait. */
const waitsOn = (evidence: CaseEvidence) => [...(evidence.after ?? []), ...(evidence.afterAny ?? [])];

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
      const score = termScore(term, t);
      if (score > (best?.score ?? 0)) best = { evidence: e, score };
    }
  }
  return best?.evidence;
}

const termScore = (term: string, t: string) => (term === t ? 1000 + t.length : t.length >= 3 && term.includes(t) ? t.length : 0);

/**
 * A record the search would have found, if it weren't still waiting on a
 * teammate's lead. The Tech had the right word: only the reason to pull the
 * record is missing.
 */
export function sealedSearchHit(caseFile: CaseFile, state: Pick<RoomState, "found" | "chapter">, term: string) {
  let best: { evidence: CaseEvidence; score: number } | null = null;
  for (const e of caseFile.evidence) {
    if (e.access.kind !== "search" || e.chapter > state.chapter || state.found[e.id] || opened(state, e)) continue;
    for (const t of e.access.terms) {
      const score = termScore(term, t);
      if (score > (best?.score ?? 0)) best = { evidence: e, score };
    }
  }
  return best?.evidence;
}

/** What the terminal says about a sealed record: that it's there, and whose move opens it. */
export function sealedNote(caseFile: CaseFile, state: Pick<RoomState, "found">, record: CaseEvidence) {
  const missing = (e: CaseEvidence) =>
    waitsOn(e)
      .map((id) => caseFile.evidence.find((x) => x.id === id))
      .find((x) => x && !state.found[x.id]);
  // The lead may be waiting on a lead of its own: follow the trail back to the move someone can make right now.
  let lead = missing(record);
  let direct = true;
  for (let steps = 0; lead && !opened(state, lead) && steps < 8; steps++) {
    const earlier = missing(lead);
    if (!earlier) break;
    lead = earlier;
    direct = false;
  }
  const role = caseFile.roles.find((r) => r.id === lead?.role)?.name;
  const access = lead?.access;
  let move = "a teammate finds the lead to it";
  if (access && role) {
    if (access.kind === "interview") move = `the ${role} asks ${access.suspect} the right question`;
    else if (access.kind === "press") move = `the ${role} gets ${access.suspect} to crack`;
    else if (access.kind === "inspect") move = `the ${role} spots a detail in "${caseFile.evidence.find((e) => e.id === access.scene)?.title ?? "a photo"}"`;
    else if (access.kind === "crosscheck") move = `the ${role} ties the right two pieces together`;
    else if (access.kind === "search") move = "you find another record first";
    else move = `the ${role} has what points to it`;
  }
  return `There is a record for that, but it's sealed for now. ${direct ? "It opens" : "The trail to it starts"} when ${move}.`;
}

/** What the terminal says to a search that found nothing, if the case has a pointer for it. */
export function searchNote(caseFile: CaseFile, term: string) {
  let best: { text: string; score: number } | null = null;
  for (const note of caseFile.searchNotes ?? []) {
    for (const t of note.terms) {
      const score = termScore(term, t);
      if (score > (best?.score ?? 0)) best = { text: note.text, score };
    }
  }
  return best?.text;
}

export function createRoom(input: {
  code: string;
  caseFile: CaseFile;
  host: { id: string; token: string; name: string };
  mode: Mode;
  now: number;
  /** A world room (see RoomState.world). Classic rooms leave it out, so their state is unchanged. */
  world?: boolean;
}): RoomState {
  return {
    ...(input.world ? { world: true as const } : {}),
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
    clockSpent: 0,
    searches: [],
    checked: [],
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
 * Who sits where in the lobby's row of seats. A seat someone picked is theirs; everyone
 * else fills the free seats in the order they joined.
 */
export function seatsOf(state: RoomState, caseFile: CaseFile): Record<string, number> {
  const seats: Record<string, number> = {};
  const taken = new Set<number>();
  const players = activePlayers(state);
  for (const p of players) {
    if (p.seat !== undefined && Number.isInteger(p.seat) && p.seat >= 0 && p.seat < caseFile.maxPlayers && !taken.has(p.seat)) {
      seats[p.id] = p.seat;
      taken.add(p.seat);
    }
  }
  for (const p of players) {
    if (seats[p.id] !== undefined) continue;
    let seat = 0;
    while (taken.has(seat)) seat++;
    seats[p.id] = seat;
    taken.add(seat);
  }
  return seats;
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

/** Whether a suspect has made the claim a crack breaks: their desk statement, or an answer the team has heard. */
function said(state: RoomState, caseFile: CaseFile, crack: CaseEvidence) {
  if (crack.access.kind !== "press") return false;
  const against = crack.access.against;
  const claim = caseFile.evidence.find((e) => e.id === against);
  if (!claim) return false;
  return claim.access.kind === "desk" ? claim.chapter <= state.chapter : Boolean(state.found[claim.id]);
}

/** Tells the team when a find opens someone else's next move. It doesn't say what: they have to ask. */
function announceLeads(state: RoomState, caseFile: CaseFile, foundId: string, finder: Player, now: number, newId: () => string) {
  const roles = new Set(
    caseFile.evidence.filter((e) => waitsOn(e).includes(foundId) && e.chapter <= state.chapter && !state.found[e.id] && opened(state, e)).map((e) => e.role),
  );
  for (const role of roles) {
    const name = caseFile.roles.find((r) => r.id === role)?.name ?? role;
    log(state, newId, now, "lead", `${finder.name}'s find gives the ${name} a new lead.`, finder.id, foundId);
  }
}

function log(state: RoomState, newId: () => string, now: number, kind: ActivityKind, text: string, playerId?: string, evidenceId?: string, who?: string) {
  state.activity.push({ id: newId(), at: now, kind, text, playerId, evidenceId, ...(who ? { who } : {}) } satisfies Activity);
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

/** Spends some of the story's night on a move. Returns the minutes it cost: none in a case without a clock. */
function spend(state: RoomState, caseFile: CaseFile, kind: Spend, now = 0) {
  if (!caseFile.deadline) return 0;
  // A coffee from a side job (W6.2) keeps the next costly move off the clock. A wrong answer still costs.
  if (kind !== "wrong" && drinkCoffee(state)) {
    state.activity.push({ id: `coffee-${state.version}-${state.activity.length}`, at: now, kind: "clock", text: "A coffee kept that one off the clock." });
    state.activity = state.activity.slice(-ACTIVITY_KEPT);
    return 0;
  }
  const minutes = costMinutes(caseFile.deadline, kind);
  state.clockSpent = spentMinutes(state, caseFile) + minutes;
  return minutes;
}

/** What a spend adds to a line in the activity feed: " −25 min. It's 1:20 AM." */
function costNote(state: RoomState, caseFile: CaseFile, minutes: number) {
  return minutes ? ` −${formatSpan(minutes)}. It's ${clockTime(state, caseFile)}.` : "";
}

/** Ends the case once the night has run out. */
function endIfOutOfTime(state: RoomState, caseFile: CaseFile, now: number, newId: () => string) {
  if (!caseFile.deadline || state.outcome || spentMinutes(state, caseFile) < nightMinutes(caseFile.deadline)) return;
  log(state, newId, now, "clock", "The night has run out.");
  state.outcome = { kind: "tooLate", score: NO_SCORE, at: now };
  state.phase = "reveal";
}

function closeCase(state: RoomState, caseFile: CaseFile, report: FinalReport, kind: "solved" | "wrong" | "walkedOut", now: number) {
  state.outcome = { kind, report, score: scoreReport(state, caseFile, report), at: now };
  state.phase = "reveal";
}

/** A called lie lands: the claim breaks, or the team takes a strike. Either can end the case. */
function landLie(state: RoomState, caseFile: CaseFile, interrogation: Interrogation, room: InterrogationState, caller: Player, evidence: CaseEvidence, now: number, newId: () => string) {
  const claim = interrogation.claims[room.claim];
  const suspect = caseFile.suspects.find((s) => s.id === interrogation.suspect)?.name ?? "The suspect";
  if (claim.lie?.breaks.includes(evidence.id)) {
    room.broken.push(claim.id);
    log(state, newId, now, "lie", `${caller.name} caught ${suspect} lying: "${claim.text}"`, caller.id, evidence.id);
    if (interrogation.claims.every((c) => !c.lie || room.broken.includes(c.id))) room.over = "confessed";
  } else {
    room.strikes++;
    log(state, newId, now, "wrong", `${caller.name} presented ${evidence.title}. It doesn't break that claim. Strike ${room.strikes} of ${interrogation.strikes}.`, caller.id);
    if (room.strikes >= interrogation.strikes) {
      room.over = "walkedOut";
      log(state, newId, now, "wrong", `${suspect} has had enough and walks out.`);
    }
  }
  if (room.over) closeCase(state, caseFile, state.accusation!, room.over === "confessed" ? "solved" : "walkedOut", now);
}

/**
 * The chain of finds that best shows the team working together: each step opened
 * the next, and the more people in it the better. Empty if no find led to another.
 */
export function bestChain(state: RoomState, caseFile: CaseFile): ChainStep[] {
  const memo = new Map<string, CaseEvidence[]>();
  const people = (chain: CaseEvidence[]) => new Set(chain.map((e) => state.found[e.id].by)).size;
  const better = (a: CaseEvidence[], b: CaseEvidence[]) => people(a) > people(b) || (people(a) === people(b) && a.length > b.length);
  const longest = (e: CaseEvidence): CaseEvidence[] => {
    const known = memo.get(e.id);
    if (known) return known;
    memo.set(e.id, [e]); // stops a loop in badly written data
    const parents = [...waitsOn(e), ...(e.access.kind === "crosscheck" ? e.access.pair : []), ...(e.access.kind === "press" ? [e.access.against] : [])];
    let best: CaseEvidence[] = [];
    for (const id of parents) {
      const parent = caseFile.evidence.find((p) => p.id === id);
      if (!parent || !state.found[id]) continue;
      const chain = longest(parent);
      if (better(chain, best)) best = chain;
    }
    const chain = [...best, e];
    memo.set(e.id, chain);
    return chain;
  };
  let best: CaseEvidence[] = [];
  for (const e of caseFile.evidence) {
    if (!state.found[e.id]) continue;
    const chain = longest(e);
    if (!best.length || better(chain, best)) best = chain;
  }
  if (best.length < 2) return [];
  return best.map((e) => ({ id: e.id, title: e.title, by: state.found[e.id].by, source: e.access.kind }));
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
        state.proofs = { ...state.proofs, [state.chapter]: { evidenceId: proposal.evidenceId!, by: proposal.by } };
        state.chapter++;
        const opened = caseFile.chapters[state.chapter - 1];
        log(state, newId, now, "chapter", `Chapter ${state.chapter} unlocked: ${opened.title}`);
      } else {
        state.wrongAnswers++;
        const title = caseFile.evidence.find((e) => e.id === proposal.evidenceId)?.title;
        const minutes = spend(state, caseFile, "wrong");
        log(state, newId, now, "wrong", `"${title}" doesn't prove it.${minutes ? costNote(state, caseFile, minutes) : " Look again."}`);
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

/** A suspect's id from the name their questions use (a witness who isn't a suspect keeps their name). */
const suspectIdOf = (caseFile: CaseFile, name: string) => caseFile.suspects.find((s) => s.name === name)?.id ?? name;

/** A search, from the computer or pulled at a spot: kept for the history, and what it turned up (or a locked file). */
function recordSearch(next: RoomState, caseFile: CaseFile, me: Player, query: string, hit: CaseEvidence | null | undefined, note: string | undefined, waits: boolean, now: number, newId: () => string, pulled = false) {
  const how = pulled ? `pulled the records at ${query}` : `searched "${query}"`;
  next.searches.push({ id: newId(), by: me.id, query, hit: hit?.id ?? null, ...(note ? { note } : {}), ...(waits ? { waits: true } : {}), at: now });
  next.searches = next.searches.slice(-SEARCHES_KEPT);
  if (hit?.lock && !next.found[hit.id]) {
    // A locked record turns up as its title and a hint; what's inside waits for the password.
    if (!next.locked?.[hit.id]) {
      next.locked = { ...next.locked, [hit.id]: { by: me.id, at: now } };
      log(next, newId, now, "locked", `${me.name} found a locked file: ${hit.title}. ${hit.lock.hint}`, me.id);
    }
  } else if (hit && !next.found[hit.id]) {
    next.found[hit.id] = { by: me.id, at: now };
    log(next, newId, now, "found", `${me.name} ${how} and found: ${hit.title}`, me.id, hit.id);
    announceLeads(next, caseFile, hit.id, me, now, newId);
  } else if (!hit) {
    log(next, newId, now, "miss", `${me.name} ${how}. ${waits ? "A sealed record: it needs a lead first." : "No records."}`, me.id);
  }
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

    case "sit": {
      if (state.phase !== "lobby") return fail("Seats are set once the case starts.");
      const seat = Number(action.seat);
      if (!Number.isInteger(seat) || seat < 0 || seat >= caseFile.maxPlayers) return fail("There's no seat there.");
      const seats = seatsOf(state, caseFile);
      if (Object.entries(seats).some(([id, s]) => s === seat && id !== me.id)) return fail("Someone's already sitting there.");
      self.seat = seat;
      break;
    }

    case "cheer": {
      if (state.phase !== "lobby") return fail("Save it for the lobby.");
      if (!CHEER_KINDS.includes(action.kind)) return fail("Unknown reaction.");
      const last = (state.cheers ?? []).findLast((c) => c.by === me.id);
      if (last && now - last.at < CHEER_GAP_MS) return fail("Easy on the popcorn.");
      next.cheers = [...(next.cheers ?? []), { id: newId(), by: me.id, kind: action.kind, at: now } satisfies Cheer].slice(-CHEERS_KEPT);
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
      // The right word for a record that's still waiting on a lead says so, and whose move opens it.
      const sealed = hit ? undefined : sealedSearchHit(caseFile, state, term);
      const note = hit ? undefined : sealed ? sealedNote(caseFile, state, sealed) : searchNote(caseFile, term);
      recordSearch(next, caseFile, self, query, hit, note, Boolean(sealed), now, newId);
      break;
    }

    case "probe": {
      // The world (W5.2): the Tech walks up to a device or a cabinet and pulls what it holds, the way a search
      // for the right word would. Its records still wait on their leads, and a locked one still wants its password.
      if (!investigating) return fail("Nothing to pull yet.");
      if (!abilities.includes("search")) return fail("Only the Tech can pull the records here.");
      if (!state.world) return fail("That's for the building.");
      const { spot, ready, waiting, locked } = pullAt(caseFile, String(action.spot ?? ""), state.chapter, self.roles, state, (e) => opened(state, e));
      if (!spot || spot.kind === "sidejob") return fail("There's nothing to pull there.");
      if (!ready && locked) return fail(`${locked.title} is locked. ${locked.lock?.hint ?? ""}`.trim());
      if (!ready && !waiting) return fail(`Nothing new at ${spot.name}.`);
      const query = spot.name.slice(0, MAX_QUERY);
      recordSearch(next, caseFile, self, query, ready ?? null, ready ? undefined : sealedNote(caseFile, state, waiting!), !ready, now, newId, true);
      break;
    }

    case "unlock": {
      if (!investigating) return fail("Nothing to unlock yet.");
      if (!abilities.includes("search")) return fail("Only the Tech can crack a password.");
      const record = evidenceById(action.evidenceId);
      if (!record?.lock || !state.locked?.[record.id]) return fail("That file isn't locked.");
      const guess = normalizeTerm(String(action.password ?? "").slice(0, MAX_QUERY));
      if (guess.length < 2) return fail("Type the password first.");
      const ok = record.lock.answers.some((answer) => normalizeTerm(answer) === guess);
      next.tries = [...(next.tries ?? []), { id: newId(), by: me.id, evidenceId: record.id, ok, time: now }].slice(-TRIES_KEPT);
      if (ok) {
        next.locked = Object.fromEntries(Object.entries(next.locked ?? {}).filter(([id]) => id !== record.id));
        next.found[record.id] = { by: me.id, at: now };
        log(next, newId, now, "access", `${me.name} cracked the password. Access granted: ${record.title}`, me.id, record.id);
        announceLeads(next, caseFile, record.id, self, now, newId);
      } else {
        const minutes = spend(next, caseFile, "miss", now);
        log(next, newId, now, minutes ? "clock" : "miss", `${me.name} tried a password on ${record.title}. Access denied.${costNote(next, caseFile, minutes)}`, me.id);
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
      // A question takes time out of the night. Following a lead is free, so time never stands between the team and a chain.
      const lead = waitsOn(question).length > 0;
      const minutes = lead ? 0 : spend(next, caseFile, "question", now);
      if (!lead) next.questionsUsed++;
      next.found[question.id] = { by: me.id, at: now };
      log(next, newId, now, "found", `${me.name} asked ${question.access.suspect}: "${question.access.question}"${minutes ? ` (−${formatSpan(minutes)})` : ""}`, me.id, question.id, suspectIdOf(caseFile, question.access.suspect));
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

    case "shoot": {
      if (!investigating) return fail("Nothing to photograph yet.");
      if (!abilities.includes("inspect")) return fail("Only the Photographer has the camera.");
      const scene = evidenceById(action.scene);
      if (!scene || (scene.body.type !== "scene" && scene.body.type !== "footage") || !canSee(state, self, scene)) {
        return fail("You can't see that picture.");
      }
      const frame = cleanFrame(action.frame);
      if (!frame) return fail("That shot is out of the picture.");
      if (zoomOf(frame) < MIN_SHOT_ZOOM - 0.01) return fail("Too far away. Zoom in on something first.");
      const tape = scene.body.type === "footage" ? scene.body.frames : null;
      const at = tape ? Math.trunc(Number(action.at ?? 0)) : undefined;
      if (tape && (!Number.isFinite(at) || at! < 0 || at! >= tape.length)) return fail("That moment isn't on the tape.");
      const items = scene.body.type === "scene" ? scene.body.items : tape![at!].items;
      const detailAt = (hotspot: string) =>
        caseFile.evidence.find((e) => e.access.kind === "inspect" && e.access.scene === scene.id && e.access.hotspot === hotspot && e.chapter <= state.chapter);
      const hit = framedHotspot(items, frame, (hotspot) => Boolean(detailAt(hotspot)));
      const detail = hit ? detailAt(hit) : undefined;
      // Shooting something you already have, or something that only matters later, costs nothing.
      if (detail && next.found[detail.id]) return fail("That's already in your darkroom.");
      if (detail && !opened(state, detail)) return fail("Nothing stands out there yet.");
      next.shots = [...(next.shots ?? []), { id: newId(), by: me.id, scene: scene.id, frame, at, hit: detail?.id ?? null, time: now }].slice(-SHOTS_KEPT);
      if (detail) {
        next.found[detail.id] = { by: me.id, at: now };
        log(next, newId, now, "found", `${me.name} photographed something in "${scene.title}": ${detail.title}`, me.id, detail.id);
        announceLeads(next, caseFile, detail.id, self, now, newId);
      } else {
        const minutes = spend(next, caseFile, "miss", now);
        log(next, newId, now, minutes ? "clock" : "miss", `${me.name}'s shot of "${scene.title}" caught nothing.${costNote(next, caseFile, minutes)}`, me.id);
      }
      break;
    }

    case "show": {
      if (!investigating) return fail("There's nobody to question yet.");
      if (!abilities.includes("interview")) return fail("Only the Interviewer runs the interrogation room.");
      const suspect = String(action.suspect ?? "");
      if (!caseFile.evidence.some((e) => e.access.kind === "interview" && e.access.suspect === suspect)) return fail("They aren't here to question.");
      const evidence = evidenceById(action.evidenceId);
      if (!evidence || !state.pins.some((p) => p.evidenceId === evidence.id)) return fail("Show them something from the board, so the whole team sees it.");
      const cracks = caseFile.evidence.filter(
        (e) => e.access.kind === "press" && e.access.suspect === suspect && e.access.breaks.includes(evidence.id) && e.chapter <= state.chapter && opened(state, e),
      );
      const unbroken = cracks.filter((e) => !next.found[e.id]);
      const crack = unbroken.find((e) => said(state, caseFile, e));
      // Nothing to lose for showing them something they've already given up, or something about a claim they haven't made yet.
      if (cracks.length && !unbroken.length) return fail(`${suspect} has already given that up.`);
      if (unbroken.length && !crack) return fail(`Ask ${suspect} about it first.`);
      next.shows = [...(next.shows ?? []), { id: newId(), by: me.id, suspect, evidenceId: evidence.id, crack: crack?.id ?? null, time: now }].slice(-SHOWS_KEPT);
      if (crack) {
        next.found[crack.id] = { by: me.id, at: now };
        log(next, newId, now, "crack", `${me.name} showed ${suspect} ${evidence.title}, and ${suspect} cracked.`, me.id, crack.id, suspectIdOf(caseFile, suspect));
        announceLeads(next, caseFile, crack.id, self, now, newId);
      } else {
        const minutes = spend(next, caseFile, "miss", now);
        log(next, newId, now, minutes ? "clock" : "miss", `${me.name} showed ${suspect} ${evidence.title}. It didn't shake them.${costNote(next, caseFile, minutes)}`, me.id, undefined, suspectIdOf(caseFile, suspect));
      }
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
        next.checked.push(key);
        const minutes = spend(next, caseFile, "miss", now);
        log(next, newId, now, minutes ? "clock" : "miss", `${me.name} compared "${a.title}" with "${b.title}". They agree.${costNote(next, caseFile, minutes)}`, me.id);
      }
      break;
    }

    case "press": {
      const interrogation = openInterrogation(state, caseFile);
      if (!investigating || !interrogation) return fail("There's nobody to interrogate yet.");
      if (!leadsInterrogation(state, caseFile, self)) return fail("Only the Interviewer can press on.");
      const room: InterrogationState = next.interrogation ?? { claim: 0, broken: [], strikes: 0 };
      if (room.over) return fail("The interrogation is over.");
      if (room.call) return fail("Wait for the call to land first.");
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
      if (room.call) return fail("Someone's already calling a lie.");
      if (room.broken.includes(interrogation.claims[room.claim].id)) return fail("You've already caught that lie.");
      next.interrogation = room;
      // On your own there's nobody to object.
      if (activePlayers(state).length > 1) room.call = { id: newId(), by: me.id, evidenceId: evidence.id, at: now };
      else landLie(next, caseFile, interrogation, room, me, evidence, now, newId);
      break;
    }

    case "object": {
      const room = next.interrogation;
      if (!investigating || !room?.call || room.call.id !== action.callId) return fail("That call has already landed.");
      log(next, newId, now, "objection", room.call.by === me.id ? `${me.name} took the call back.` : `${me.name} objected. Talk it over.`, me.id);
      delete room.call;
      break;
    }

    case "settleLie": {
      const interrogation = openInterrogation(state, caseFile);
      const room = next.interrogation;
      if (!investigating || !interrogation || !room?.call || room.call.id !== action.callId) return fail("That call has already landed.");
      if (now - room.call.at < OBJECTION_MS) return fail("There's still time to object.");
      const { by, evidenceId } = room.call;
      delete room.call;
      landLie(next, caseFile, interrogation, room, next.players.find((p) => p.id === by)!, evidenceById(evidenceId)!, now, newId);
      break;
    }

    case "spotlight": {
      if (!investigating) return fail("There's nothing to show yet.");
      const evidence = evidenceById(action.evidenceId);
      if (!evidence || !canSee(state, self, evidence)) return fail("You can't show that.");
      if (activePlayers(state).length < 2) return fail("There's nobody else here to show.");
      if (state.spotlight?.by === me.id && now - state.spotlight.at < SPOTLIGHT_GAP_MS) return fail("Give them a moment to look.");
      next.spotlight = { id: newId(), by: me.id, evidenceId: evidence.id, at: now };
      log(next, newId, now, "spotlight", `${me.name} showed everyone ${evidence.title}`, me.id, evidence.id);
      break;
    }

    case "mark": {
      if (!investigating) return fail("Highlighting opens once the investigation starts.");
      const evidence = evidenceById(action.evidenceId);
      if (!evidence || !canSee(state, self, evidence)) return fail("You can't highlight that.");
      if (action.line === null) {
        if (!state.marks?.[evidence.id]) return fail("Nothing is highlighted there.");
        next.marks = Object.fromEntries(Object.entries(next.marks ?? {}).filter(([id]) => id !== evidence.id));
        break;
      }
      const line = Number(action.line);
      if (!Number.isInteger(line) || line < 0 || line >= linesOf(evidence.body).length) return fail("That line isn't in this piece.");
      if (state.marks?.[evidence.id]?.line === line) return fail("That line is already highlighted.");
      next.marks = { ...next.marks, [evidence.id]: { line, by: me.id, at: now } };
      log(next, newId, now, "mark", `${me.name} highlighted a line in ${evidence.title}`, me.id, evidence.id);
      break;
    }

    case "arrange": {
      if (!investigating) return fail("The wall opens once the investigation starts.");
      if (!abilities.includes("crosscheck")) return fail("Only the Archivist arranges the wall.");
      if (!state.pins.some((p) => p.evidenceId === action.evidenceId)) return fail("Only pinned pieces go on the wall.");
      const x = Number(action.x);
      const y = Number(action.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return fail("That's off the wall.");
      // The pin stays far enough in that the whole piece stays on the cork.
      const clamp = (n: number, low: number, high: number) => Math.round(Math.min(high, Math.max(low, n)) * 10) / 10;
      next.wall = { ...next.wall, [action.evidenceId]: { x: clamp(x, 4, 96), y: clamp(y, 2, 72) } };
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
      if (next.interrogation?.call?.evidenceId === pin.evidenceId) return fail("That's being presented right now.");
      next.pins = next.pins.filter((p) => p !== pin);
      if (next.wall?.[pin.evidenceId]) {
        next.wall = Object.fromEntries(Object.entries(next.wall).filter(([id]) => id !== pin.evidenceId));
      }
      log(next, newId, now, "unpin", `${me.name} unpinned ${evidenceById(pin.evidenceId)?.title}`, me.id, pin.evidenceId);
      break;
    }

    case "move": {
      // Where a detective stands in the world: checked against the building, saved for late joiners and as the
      // fallback when the live channel drops. It costs nothing and changes nothing else.
      const room = caseFile.world?.rooms.find((r) => r.id === action.room && r.box);
      if (!state.world || !room?.box) return fail("That room isn't in the building.");
      const x = Number(action.x);
      if (!Number.isFinite(x)) return fail("Where did you go?");
      next.places = { ...(state.places ?? {}), [me.id]: { room: room.id, x: Math.min(room.box.x1, Math.max(room.box.x0, x)), at: now } };
      break;
    }

    case "sideJob": {
      if (!investigating || !state.world) return fail("Side jobs are for the building, during the case.");
      const problem = finishSideJob(next, caseFile, self, String(action.job ?? ""), Number(action.stars), now, (text, by) => log(next, newId, now, "help", text, by));
      if (problem) return fail(problem);
      break;
    }

    case "flipFuse": {
      if (!investigating || !state.world) return fail("The lights are fine.");
      const problem = flipFuse(next, self, now);
      if (problem) return fail(problem);
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
  endIfOutOfTime(next, caseFile, now, newId);
  // The world's team events (W6.4): one ends when everyone's done their part or its time is up, and the next starts
  // at its story beat.
  const say = (text: string) => log(next, newId, now, "help", text);
  closeEventIfOver(next, caseFile, now, say);
  startEventIfDue(next, caseFile, now, say);
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
  if (caseFile.deadline) {
    try {
      if (nightMinutes(caseFile.deadline) < 60) problems.push("the night is under an hour: every mistake would cost almost nothing to show");
    } catch (error) {
      problems.push(`the deadline's times can't be read: ${(error as Error).message}`);
    }
  }

  const needs: Record<Exclude<CaseEvidence["access"]["kind"], "desk">, Ability> = {
    search: "search",
    interview: "interview",
    inspect: "inspect",
    crosscheck: "crosscheck",
    press: "interview",
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
    if (e.lock) {
      if (a.kind !== "search") problems.push(`"${e.id}" is locked, but only records the Tech searches for can be`);
      if (!e.lock.answers.length || e.lock.answers.some((x) => normalizeTerm(x).length < 2)) problems.push(`"${e.id}" needs a password`);
      // The password has to be somewhere a teammate can find it, never only in the Tech's own records.
      const elsewhere = caseFile.evidence.filter((x) => x.role !== e.role && x.chapter <= e.chapter && caseFile.roles.find((r) => r.id === x.role)?.core).map(textOfEvidence);
      if (!e.lock.answers.some((x) => elsewhere.some((text) => text.includes(normalizeTerm(x))))) problems.push(`"${e.id}"'s password isn't in any other role's evidence`);
    }
    if (a.kind === "press") {
      const claim = byId.get(a.against);
      if (!claim || claim.body.type !== "statement" || claim.body.speaker !== a.suspect) problems.push(`crack "${e.id}" has to break something ${a.suspect} said`);
      else if (claim.chapter > e.chapter) problems.push(`crack "${e.id}" opens before ${a.suspect} says what it breaks`);
      if (e.body.type !== "statement" || e.body.speaker !== a.suspect) problems.push(`crack "${e.id}" should be ${a.suspect} talking`);
      if (!a.breaks.length || !a.breaks.every((id) => byId.has(id))) problems.push(`crack "${e.id}" is broken by evidence that doesn't exist`);
      else if (!a.breaks.some((id) => byId.get(id)!.chapter <= e.chapter)) problems.push(`nothing breaks crack "${e.id}" by its chapter`);
      if (!caseFile.evidence.some((q) => q.access.kind === "interview" && q.access.suspect === a.suspect)) problems.push(`crack "${e.id}": nobody can question ${a.suspect}`);
      if (caseFile.solution.culprit && caseFile.suspects.find((s) => s.id === caseFile.solution.culprit)?.name === a.suspect && /\b(I did it|I took it|I did take)\b/i.test(e.body.type === "statement" ? e.body.text : "")) {
        problems.push(`crack "${e.id}" is a confession: save that for the confrontation`);
      }
    }
    if (a.kind !== "desk" && !caseFile.roles.some((r) => r.core && r.ability === needs[a.kind])) {
      problems.push(`"${e.id}" needs the ${a.kind} ability, but no core role has it`);
    }
  }
  for (const note of caseFile.searchNotes ?? []) {
    if (!note.terms.length || !note.terms.every((t) => t === normalizeTerm(t) && t.length >= 2)) {
      problems.push(`the search note "${note.text.slice(0, 30)}…" has search terms that aren't normalised (lowercase letters and digits only)`);
    }
  }
  for (const role of caseFile.roles.filter((r) => r.core)) {
    if (!caseFile.evidence.some((e) => e.role === role.id && e.access.kind === "desk" && e.chapter === 1)) {
      problems.push(`core role "${role.id}" starts with nothing on their desk`);
    }
  }
  problems.push(...checkInterrogation(caseFile, byId));
  problems.push(...checkChains(caseFile, byId));
  problems.push(...checkWorld(caseFile));
  const { solution } = caseFile;
  if (!caseFile.suspects.some((s) => s.id === solution.culprit)) problems.push("the culprit is not a suspect");
  if (!solution.motives.some((m) => m.id === solution.motive)) problems.push("the motive is not one of the options");
  if (solution.keyEvidence.length < 2) problems.push("needs at least two pieces of key evidence");
  for (const id of solution.keyEvidence) if (!byId.has(id)) problems.push(`key evidence "${id}" doesn't exist`);
  problems.push(...checkWriting(caseFile));
  return problems;
}

/** Clue chains have to be followable: every lead points at something findable, and a team that follows them all reaches everything. */
function checkChains(caseFile: CaseFile, byId: Map<string, CaseEvidence>): string[] {
  const problems: string[] = [];
  for (const e of caseFile.evidence) {
    for (const id of waitsOn(e)) {
      const source = byId.get(id);
      if (!source) problems.push(`"${e.id}" waits on "${id}", which doesn't exist`);
      else if (source.access.kind === "desk") problems.push(`"${e.id}" waits on "${id}", which everyone starts with`);
      else if (source.chapter > e.chapter) problems.push(`"${e.id}" waits on "${id}", which only appears in a later chapter`);
    }
    if (waitsOn(e).length && e.access.kind !== "search" && e.access.kind !== "interview" && e.access.kind !== "inspect" && e.access.kind !== "press") problems.push(`"${e.id}" can't wait on a lead`);
  }
  const reached = new Set<string>();
  for (let chapter = 1; chapter <= caseFile.chapters.length; chapter++) {
    for (let growing = true; growing; ) {
      growing = false;
      for (const e of caseFile.evidence) {
        if (e.chapter > chapter || reached.has(e.id) || !(e.after ?? []).every((id) => reached.has(id))) continue;
        if (e.afterAny?.length && !e.afterAny.some((id) => reached.has(id))) continue;
        const a = e.access;
        if ((a.kind === "inspect" && !reached.has(a.scene)) || (a.kind === "crosscheck" && !a.pair.every((id) => reached.has(id)))) continue;
        if (a.kind === "press" && (!reached.has(a.against) || !a.breaks.some((id) => reached.has(id)))) continue;
        reached.add(e.id);
        growing = true;
      }
    }
    for (const e of caseFile.evidence) if (e.chapter === chapter && !reached.has(e.id)) problems.push(`"${e.id}" can't be reached in chapter ${chapter}`);
  }
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
  (caseFile.searchNotes ?? []).forEach((n, i) => tooLong(`search note ${i + 1}`, n.text, L.hint));
  caseFile.evidence.forEach((e) => e.lock && tooLong(`"${e.id}"'s password hint`, e.lock.hint, L.hint));
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
  /** Their seat in the lobby's row (0-based). */
  seat: number;
  /** Where their detective last stood in the world (W3.3), if they've walked into a room. */
  place?: { room: string; x: number };
};

/**
 * The part of a picture a find is about, ready to draw: the picture cut down to that one spot, so
 * it can be shown to someone who doesn't have the whole photo. `from` is the photo's title.
 */
export type EvidenceCrop = { scene: EvidenceBody; hotspot: string; from: string };

/** One side of a contradiction, as the slip shows it: the words that clash and who said them, or the picture. */
export type MatchSide = { id: string; title: string; type: EvidenceBody["type"]; quote?: string; by?: string; crop?: EvidenceCrop; picture?: EvidenceBody };

/**
 * One moment of a proved checkpoint, as it drops onto the night's timeline: the piece (its words or its picture),
 * when it happened, who turned it up (`foundBy`) or whose desk it came from (`holder`), and whether it's what the
 * team presented, or one of the two pieces of the contradiction they presented (`proof`).
 */
export type ReplayMoment = MatchSide & { at: string; foundBy?: string; holder?: string; proof: boolean };

/** A proved checkpoint played back as the night: its moments in order, the closing line, and the piece that proved it. */
export type ProofReplay = { moments: ReplayMoment[]; say?: string; proof?: { id: string; title: string; by: string } };

/** One place someone was, as the map draws it: minutes into the night, how sure (a record beats a crack beats a story), and the piece behind it. */
export type MapSighting = { id: string; who: string; room: string; from: number; to: number; says: boolean; weight: number; evidence: string; title: string };

/**
 * Two pieces putting the same person in two places at once, `from` to `to` minutes into the night: sightings `x`
 * (from piece `a`) and `y` (from piece `b`). Tying it ties `a` and `b`, as on the wall.
 */
export type MapClash = { a: string; b: string; who: string; x: string; y: string; from: number; to: number; caught: boolean };

/** The map of the night as this player can see it: only the places their visible pieces put people. */
export type NightMapView = {
  from: string;
  to: string;
  span: number;
  height: number;
  rooms: NonNullable<CaseFile["nightMap"]>["rooms"];
  things: NonNullable<NonNullable<CaseFile["nightMap"]>["things"]>;
  sightings: MapSighting[];
  clashes: MapClash[];
};

export type VisibleEvidence = Omit<CaseEvidence, "access"> & {
  source: CaseEvidence["access"]["kind"];
  /** For a found detail: where in which scene it was spotted. */
  spot?: { scene: string; hotspot: string };
  /** For a found detail: the spot itself, so the picture leads wherever the find goes. */
  crop?: EvidenceCrop;
  /** For a contradiction: the titles of the two pieces that clash. */
  compared?: [string, string];
  /** For a contradiction: the two pieces themselves, side by side. */
  sides?: [MatchSide, MatchSide];
  pinned: boolean;
  /** Who found it, for evidence that had to be found. */
  foundBy?: string;
  foundAt?: number;
  /** On this player's own desk or found through their roles, as opposed to only on the board. */
  mine: boolean;
  /** The line someone highlighted for the team, and who did. */
  mark?: { line: number; text: string; by: string };
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
  /**
   * The story's clock: what's coming, the time now, the minutes spent and left, what each paid move costs
   * in this case's minutes, whether it's running low, and how it ended if it ran out.
   */
  deadline: {
    what: string;
    time: string;
    end: string;
    spent: number;
    left: number;
    night: number;
    costs: Record<Spend, number>;
    low: boolean;
    lost: string | null;
  } | null;
  /** Checkpoints already answered, with what they revealed, and the night played back when the case writes a replay. */
  solved: { number: number; title: string; question: string; reveal: string; replay?: ProofReplay }[];
  players: PublicPlayer[];
  evidence: VisibleEvidence[];
  pins: Pin[];
  pinLimit: number;
  /** For the Interviewer: the questions open so far. */
  questions: { id: string; suspect: string; question: string; asked: boolean; chapter: number; lead: boolean }[] | null;
  /** What teammates have found that opens something new for this player. */
  leads: { id: string; title: string; by: string }[];
  /** `waits`: the search had the right word, but the record is sealed until a teammate's lead opens it. */
  searches: { id: string; by: string; query: string; hit: boolean; hitTitle?: string; note?: string; waits?: boolean; locked?: boolean; at: number }[];
  /** Locked files the Tech has found: title and hint only, for every phone, so anyone can spot the password. */
  locked: { id: string; title: string; hint: string; by: string; at: number }[];
  /** For the Tech: passwords tried, newest last. */
  tries: { id: string; evidenceId: string; ok: boolean; time: number }[];
  /** For the Interviewer: what they've shown suspects, newest last, and whether it cracked them. */
  shows: { id: string; suspect: string; evidenceTitle: string; crack: string | null; time: number }[];
  /** Every crack so far, for every phone: the moment someone's story gave way is the whole table's. */
  cracks: { id: string; suspect: string; title: string; text: string; by: string; at: number }[];
  /** For the Photographer: their own shots, newest last, and what each caught. */
  shots: { id: string; scene: string; at?: number; hit: string | null; time: number }[];
  /** For the Archivist: pairs already compared without a result. */
  checked: string[];
  /** For the Archivist: the map of the night, when the case has one. */
  nightMap: NightMapView | null;
  /** The world's spots open this chapter, with who can use each (empty outside the investigation or without a world). */
  spots: WorldSpotView[];
  /** The world's rewind: the night as the team knows it (world rooms with a map of the night, during the investigation). */
  rewind: NightMapView | null;
  /** The world's side jobs (W6), with who did each this chapter. */
  jobs: SideJobView[];
  /** The team's helps from side jobs. */
  helps: HelpsView;
  /** A team event running now (Lights out), and who has done their part. */
  event: { job: string; endsAt: number; flipped: string[] } | null;
  /** The last piece someone showed on every phone. */
  spotlight: { id: string; by: string; at: number; evidence: VisibleEvidence } | null;
  /** Where the Archivist has placed pinned pieces on the wall, in percent. Pieces without a place sit in the default grid. */
  wall: Record<string, { x: number; y: number }>;
  /** Red string: every contradiction found so far, as the two pieces it ties. Drawn on the wall for everyone. */
  strings: { id: string; a: string; b: string }[];
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
    /** A lie called and waiting out its objection window. */
    call: { id: string; by: string; title: string } | null;
  } | null;
  activity: Activity[];
  chat: ChatLine[];
  /** The latest lobby reactions, oldest first. */
  cheers: Cheer[];
  hintsUsed: number;
  wrongAnswers: number;
  proposal: Proposal | null;
  votesNeeded: number;
  decided: DecidedProposal[];
  outcome: RoomState["outcome"];
  /** Only after the reveal. */
  solution: CaseFile["solution"] | null;
  /** At the reveal: how the team's best run of finds fitted together. */
  chain: ChainStep[];
  /** Set by the room service: whether the host may add bots here. */
  testBots?: boolean;
  /** Whether this room also opens in the walkable world (the hidden /r/<code>/world route). */
  world: boolean;
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
    call: room.call ? { id: room.call.id, by: room.call.by, title: caseFile.evidence.find((e) => e.id === room.call!.evidenceId)?.title ?? "" } : null,
  };
}

/**
 * The spot a find is about, cut out of its picture. A painted picture keeps only that spot's tap
 * area (the clue is in the paint); a drawn one keeps every shape, because that's how it's drawn.
 */
export function cropOf(caseFile: CaseFile, sceneId: string, hotspot: string): EvidenceCrop | undefined {
  const scene = caseFile.evidence.find((e) => e.id === sceneId);
  const body = scene?.body;
  if (!scene || !body || (body.type !== "scene" && body.type !== "footage")) return undefined;
  const shot = body.type === "scene" ? body : body.frames.find((f) => f.items.some((i) => i.hotspot === hotspot));
  if (!shot?.items.some((i) => i.hotspot === hotspot)) return undefined;
  const items = shot.image ? shot.items.filter((i) => i.hotspot === hotspot) : shot.items;
  return { scene: { type: "scene", caption: "", look: body.look, items, image: shot.image }, hotspot, from: scene.title };
}

/** A painted picture without its tap areas: enough to show it, nothing to give its details away. */
function pictureOf(body: EvidenceBody): EvidenceBody | undefined {
  if (body.type === "scene") return { ...body, items: body.image ? [] : body.items };
  if (body.type === "footage") return { ...body, frames: body.frames.map((f) => ({ ...f, items: f.image ? [] : f.items })) };
  return undefined;
}

/** One side of a contradiction: the words the case picked out of it, or else its picture. */
function sideOf(caseFile: CaseFile, id: string, quote: string | null): MatchSide {
  const e = caseFile.evidence.find((x) => x.id === id);
  if (!e) return { id, title: "", type: "finding" };
  if (quote) {
    const body = e.body;
    const message = body.type === "chat" ? body.messages.find((m) => `${m.from}, ${m.time}: ${m.text}`.includes(quote)) : undefined;
    const by = message ? `${message.from}, ${message.time}` : body.type === "statement" ? body.speaker : undefined;
    return { id, title: e.title, type: body.type, quote, by };
  }
  if (e.access.kind === "inspect") return { id, title: e.title, type: e.body.type, crop: cropOf(caseFile, e.access.scene, e.access.hotspot) };
  return { id, title: e.title, type: e.body.type, picture: pictureOf(e.body) };
}

/**
 * A proved checkpoint's replay, for everyone: it only plays pieces the checkpoint's reveal already tells, so it can
 * show pieces this player never saw. Pieces stamped as the proof are the one presented, or both sides of it if it was
 * a contradiction.
 */
function replayOf(state: RoomState, caseFile: CaseFile, chapter: number): ProofReplay | undefined {
  const replay = caseFile.chapters[chapter - 1]?.checkpoint?.replay;
  if (!replay) return undefined;
  const presented = state.proofs?.[chapter];
  const shown = presented && caseFile.evidence.find((e) => e.id === presented.evidenceId);
  const stamped = new Set(shown ? [shown.id, ...(shown.access.kind === "crosscheck" ? shown.access.pair : [])] : []);
  const players = activePlayers(state);
  const moments = replay.moments.map((m): ReplayMoment => {
    const piece = caseFile.evidence.find((e) => e.id === m.evidence);
    const holder = piece?.access.kind === "desk" ? players.find((p) => p.roles.includes(piece.role))?.id : undefined;
    return { ...sideOf(caseFile, m.evidence, m.quote ?? null), at: m.at, foundBy: state.found[m.evidence]?.by, holder, proof: stamped.has(m.evidence) };
  });
  return { moments, say: replay.say, proof: shown && presented ? { id: shown.id, title: shown.title, by: presented.by } : undefined };
}

/** How long a moment (a sighting with no end) stays on the map either side of its minute. */
export const MOMENT_MINUTES = 5;

/**
 * The map of the night for one player: the places their visible pieces put people, and the clashes among
 * them that are real contradictions in the case (a crosscheck whose two pieces put one person in two rooms
 * at once). A clash shows once both pieces are in view, which is the point: the map makes a lie visible.
 */
export function mapFor(state: RoomState, caseFile: CaseFile, me: Pick<Player, "id" | "roles">): NightMapView | null {
  return mapWith(state, caseFile, (piece) => canSee(state, me, piece));
}

/**
 * The night as the whole team knows it, for the world's rewind (W4): every place a piece anyone on the team can see
 * puts someone. Everyone watches the same rewind, so it can't be one player's view. Ghosts only walk where these put
 * people; the rest of the night stays foggy.
 */
export function rewindFor(state: RoomState, caseFile: CaseFile): NightMapView | null {
  const team = state.players.filter((p) => !p.left);
  return mapWith(state, caseFile, (piece) => team.some((p) => canSee(state, p, piece)));
}

function mapWith(state: RoomState, caseFile: CaseFile, visible: (piece: CaseEvidence) => boolean): NightMapView | null {
  const map = caseFile.nightMap;
  if (!map) return null;
  const start = parseTime(map.from);
  const minute = (time: string) => (parseTime(time) - start + 24 * 60) % (24 * 60);
  const span = minute(map.to);
  const moment = map.moment ?? MOMENT_MINUTES;
  const pieces = new Map(caseFile.evidence.map((e) => [e.id, e]));
  const sightings: MapSighting[] = [];
  map.sightings.forEach((s, i) => {
    const piece = pieces.get(s.evidence);
    if (!piece || !visible(piece)) return;
    const at = minute(s.at);
    const from = s.until ? at : Math.max(0, at - moment);
    const to = s.until ? minute(s.until) : Math.min(span, at + moment);
    const weight = !s.says ? 3 : piece.access.kind === "press" ? 2 : 1;
    sightings.push({ id: `${s.evidence}#${i}`, who: s.who, room: s.room, from, to, says: Boolean(s.says), weight, evidence: s.evidence, title: piece.title });
  });
  const clashes: MapClash[] = [];
  for (const e of caseFile.evidence) {
    if (e.access.kind !== "crosscheck" || e.chapter > state.chapter || !opened(state, e)) continue;
    const [a, b] = e.access.pair;
    for (const x of sightings.filter((s) => s.evidence === a)) {
      for (const y of sightings.filter((s) => s.evidence === b && s.who === x.who && s.room !== x.room)) {
        const from = Math.max(x.from, y.from);
        const to = Math.min(x.to, y.to);
        if (from <= to) clashes.push({ a, b, who: x.who, x: x.id, y: y.id, from, to, caught: Boolean(state.found[e.id]) });
      }
    }
  }
  return { from: map.from, to: map.to, span, height: map.height, rooms: map.rooms, things: map.things ?? [], sightings, clashes };
}

export function viewFor(state: RoomState, caseFile: CaseFile, playerId: string, online: Set<string>): PlayerView {
  const seats = seatsOf(state, caseFile);
  const toPublic = (p: Player): PublicPlayer => ({
    id: p.id,
    name: p.name,
    roles: p.roles,
    isHost: p.id === state.hostId,
    online: Boolean(p.bot) || online.has(p.id),
    ready: state.ready.includes(p.id),
    bot: Boolean(p.bot),
    seat: seats[p.id] ?? -1,
    ...(state.places?.[p.id] ? { place: { room: state.places[p.id].room, x: state.places[p.id].x } } : {}),
  });
  const me = state.players.find((p) => p.id === playerId)!;
  const abilities = abilitiesOf(caseFile, me);
  const revealed = state.phase === "reveal";
  const chapter = caseFile.chapters[state.chapter - 1];
  const pinned = new Set(state.pins.map((p) => p.evidenceId));
  const titleOf = (id: string) => caseFile.evidence.find((e) => e.id === id)?.title ?? "";

  const toVisible = ({ access, ...e }: CaseEvidence): VisibleEvidence => {
    const found = state.found[e.id];
    const ownDesk = access.kind === "desk" && me.roles.includes(e.role);
    const ownFind = Boolean(found) && (me.roles.includes(e.role) || found.by === me.id);
    const marked = state.marks?.[e.id];
    const markedText = marked ? linesOf(e.body)[marked.line] : undefined;
    return {
      ...e,
      source: access.kind,
      spot: access.kind === "inspect" ? { scene: access.scene, hotspot: access.hotspot } : undefined,
      crop: access.kind === "inspect" ? cropOf(caseFile, access.scene, access.hotspot) : undefined,
      compared: access.kind === "crosscheck" ? ([titleOf(access.pair[0]), titleOf(access.pair[1])] as [string, string]) : undefined,
      sides:
        access.kind === "crosscheck" && access.quotes
          ? [sideOf(caseFile, access.pair[0], access.quotes[0]), sideOf(caseFile, access.pair[1], access.quotes[1])]
          : undefined,
      pinned: pinned.has(e.id),
      foundBy: found?.by,
      foundAt: found?.at,
      mine: ownDesk || ownFind,
      mark: marked && markedText !== undefined ? { line: marked.line, text: markedText, by: marked.by } : undefined,
    };
  };
  const evidence: VisibleEvidence[] = caseFile.evidence.filter((e) => canSee(state, me, e)).map(toVisible);
  // Shown to everyone on purpose, so everyone gets it for the moment, even if it isn't theirs or pinned.
  const shown = state.spotlight && caseFile.evidence.find((e) => e.id === state.spotlight!.evidenceId);

  const visibleIds = new Set(evidence.map((e) => e.id));
  const questions = abilities.includes("interview")
    ? caseFile.evidence.flatMap((e) =>
        e.access.kind === "interview" && e.chapter <= state.chapter && opened(state, e)
          ? [{ id: e.id, suspect: e.access.suspect, question: e.access.question, asked: Boolean(state.found[e.id]), chapter: e.chapter, lead: waitsOn(e).length > 0 }]
          : [],
      )
    : null;

  const leadSources = caseFile.evidence
    .filter((e) => waitsOn(e).length && me.roles.includes(e.role) && e.chapter <= state.chapter && !state.found[e.id] && opened(state, e))
    .flatMap((e) => waitsOn(e).filter((id) => state.found[id]));
  const leads = [...new Set(leadSources)].flatMap((id) => {
    const source = caseFile.evidence.find((e) => e.id === id);
    return source ? [{ id, title: source.title, by: state.found[id].by }] : [];
  });

  return {
    code: state.code,
    version: state.version,
    phase: state.phase,
    mode: state.mode,
    world: Boolean(state.world),
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
          time: clockTime(state, caseFile)!,
          end: caseFile.deadline.end,
          spent: Math.min(spentMinutes(state, caseFile), nightMinutes(caseFile.deadline)),
          left: Math.max(0, nightMinutes(caseFile.deadline) - spentMinutes(state, caseFile)),
          night: nightMinutes(caseFile.deadline),
          costs: { wrong: costMinutes(caseFile.deadline, "wrong"), question: costMinutes(caseFile.deadline, "question"), miss: costMinutes(caseFile.deadline, "miss") },
          low: nightLeft(state, caseFile) < LOW_NIGHT,
          lost: state.outcome?.kind === "tooLate" ? caseFile.deadline.lost : null,
        }
      : null,
    solved: caseFile.chapters.slice(0, state.chapter - 1).map((c, i) => ({
      number: i + 1,
      title: c.title,
      question: c.checkpoint!.question,
      reveal: c.checkpoint!.reveal,
      replay: replayOf(state, caseFile, i + 1),
    })),
    players: activePlayers(state).map(toPublic),
    evidence,
    pins: state.pins,
    pinLimit: PIN_LIMIT,
    questions,
    leads,
    searches: state.searches.map((s) => ({
      id: s.id,
      by: s.by,
      query: s.query,
      hit: Boolean(s.hit),
      hitTitle: s.hit && visibleIds.has(s.hit) ? evidence.find((e) => e.id === s.hit)?.title : undefined,
      note: s.note,
      waits: s.waits,
      locked: Boolean(s.hit && state.locked?.[s.hit]),
      at: s.at,
    })),
    locked: Object.entries(state.locked ?? {}).flatMap(([id, held]) => {
      const record = caseFile.evidence.find((e) => e.id === id);
      return record?.lock ? [{ id, title: record.title, hint: record.lock.hint, by: held.by, at: held.at }] : [];
    }),
    tries: abilities.includes("search") ? (state.tries ?? []).filter((t) => t.by === me.id).map(({ id, evidenceId, ok, time }) => ({ id, evidenceId, ok, time })) : [],
    shows: abilities.includes("interview")
      ? (state.shows ?? []).filter((s) => s.by === me.id).map((s) => ({ id: s.id, suspect: s.suspect, evidenceTitle: titleOf(s.evidenceId), crack: s.crack, time: s.time }))
      : [],
    cracks: caseFile.evidence.flatMap((e) =>
      e.access.kind === "press" && state.found[e.id] && e.body.type === "statement"
        ? [{ id: e.id, suspect: e.access.suspect, title: e.title, text: e.body.text, by: state.found[e.id].by, at: state.found[e.id].at }]
        : [],
    ),
    shots: abilities.includes("inspect") ? (state.shots ?? []).filter((s) => s.by === me.id).map(({ id, scene, at, hit, time }) => ({ id, scene, at, hit, time })) : [],
    checked: abilities.includes("crosscheck") ? state.checked : [],
    nightMap: abilities.includes("crosscheck") ? mapFor(state, caseFile, me) : null,
    spots:
      state.phase === "investigation"
        ? spotsFor(caseFile, state.chapter, {
            sees: (id) => visibleIds.has(id),
            canPull: (e) =>
              Boolean(state.world) && abilities.includes("search") && me.roles.includes(e.role) && e.access.kind === "search" && !state.found[e.id] && !state.locked?.[e.id] && opened(state, e),
          })
        : [],
    rewind: state.world && state.phase === "investigation" ? rewindFor(state, caseFile) : null,
    jobs: jobsFor(state, caseFile),
    helps: helpsFor(state, caseFile),
    event: state.world && state.phase === "investigation" && state.event ? { job: state.event.job, endsAt: state.event.endsAt, flipped: state.event.flipped } : null,
    wall: Object.fromEntries(Object.entries(state.wall ?? {}).filter(([id]) => pinned.has(id))),
    strings: caseFile.evidence.flatMap((e) => (e.access.kind === "crosscheck" && state.found[e.id] ? [{ id: e.id, a: e.access.pair[0], b: e.access.pair[1] }] : [])),
    spotlight: state.spotlight && shown ? { id: state.spotlight.id, by: state.spotlight.by, at: state.spotlight.at, evidence: toVisible(shown) } : null,
    interrogation: interrogationView(state, caseFile, me),
    activity: state.activity.slice(-60),
    chat: state.chat,
    cheers: state.phase === "lobby" ? (state.cheers ?? []) : [],
    hintsUsed: state.hintsUsed,
    wrongAnswers: state.wrongAnswers,
    proposal: state.proposal,
    votesNeeded: votesNeeded(state),
    decided: state.decided.slice(-5),
    outcome: state.outcome,
    solution: revealed ? caseFile.solution : null,
    chain: revealed ? bestChain(state, caseFile) : [],
  };
}
