/**
 * Computer players for testing a room alone. They make one move at a time, at
 * a human-ish pace: get ready, pin what's on their desk, use their role's
 * ability once per chapter, say so in remote rooms, and vote the way the
 * first human voter did. They never answer checkpoints: that's the humans' job.
 */
import { activePlayers, canSee, PIN_LIMIT } from "./engine.ts";
import type { Action, CaseFile, Player, RoomState } from "./types";

export const BOT_NAMES = ["Bot Watson", "Bot Marple", "Bot Poirot", "Bot Fletcher", "Bot Columbo", "Bot Lestrade"];

/** Votes and getting ready happen quickly; investigating is spaced out. */
const QUICK_MS = 800;
const WORK_MS = 3500;
/** Bots between them hold at most this many fewer pins than the board takes, so humans always have room. */
const SLOTS_FOR_HUMANS = 3;

export type BotMove = { playerId: string; action: Action };

/** The bot's one use of its ability this chapter, if it hasn't used it yet. */
function abilityMove(state: RoomState, caseFile: CaseFile, bot: Player): Action | null {
  const current = (e: { chapter: number }) => e.chapter === state.chapter;
  const usedThisChapter = Object.entries(state.found).some(
    ([id, f]) => f.by === bot.id && caseFile.evidence.find((e) => e.id === id)?.chapter === state.chapter,
  );
  if (usedThisChapter) return null;
  const roles = caseFile.roles.filter((r) => bot.roles.includes(r.id));

  for (const role of roles) {
    for (const e of caseFile.evidence) {
      if (state.found[e.id] || !current(e)) continue;
      const a = e.access;
      if (role.ability === "search" && a.kind === "search") return { type: "search", query: a.terms[0] };
      if (role.ability === "interview" && a.kind === "interview" && caseFile.questionBudget - state.questionsUsed > 1) {
        return { type: "ask", evidenceId: e.id };
      }
      if (role.ability === "inspect" && a.kind === "inspect") {
        const scene = caseFile.evidence.find((s) => s.id === a.scene);
        if (scene && canSee(state, bot, scene)) return { type: "inspect", scene: a.scene, hotspot: a.hotspot };
      }
      if (role.ability === "crosscheck" && a.kind === "crosscheck") {
        const [x, y] = a.pair.map((id) => caseFile.evidence.find((s) => s.id === id));
        if (x && y && canSee(state, bot, x) && canSee(state, bot, y)) return { type: "crosscheck", a: x.id, b: y.id };
      }
    }
  }
  return null;
}

export function nextBotMove(state: RoomState, caseFile: CaseFile, now: number): BotMove | null {
  const players = activePlayers(state);
  const bots = players.filter((p) => p.bot);
  if (!bots.length) return null;
  const since = now - (state.botMovedAt ?? 0);

  if (state.phase === "briefing" && since >= QUICK_MS) {
    const bot = bots.find((b) => !state.ready.includes(b.id));
    if (bot) return { playerId: bot.id, action: { type: "ready" } };
  }

  if (state.phase !== "investigation") return null;

  const proposal = state.proposal;
  if (proposal) {
    if (since < QUICK_MS) return null;
    const bot = bots.find((b) => !proposal.votes[b.id]);
    // Follow the humans, so one tester can steer every vote.
    const lead = players.find((p) => !p.bot && proposal.votes[p.id]);
    if (bot) return { playerId: bot.id, action: { type: "vote", proposalId: proposal.id, vote: lead ? proposal.votes[lead.id] : "yes" } };
    return null;
  }

  if (since < WORK_MS) return null;
  const pinned = new Set(state.pins.map((p) => p.evidenceId));
  // Count only the bots' own pins: humans filling the board mustn't stop a bot showing its desk.
  const botPins = state.pins.filter((p) => bots.some((b) => b.id === p.by)).length;
  const room = state.pins.length < PIN_LIMIT && botPins < PIN_LIMIT - SLOTS_FOR_HUMANS;

  for (const bot of bots) {
    // Its own desk and finds from this chapter, so humans can see what the bot holds.
    const own = caseFile.evidence.find(
      (e) =>
        e.chapter === state.chapter &&
        !pinned.has(e.id) &&
        ((e.access.kind === "desk" && bot.roles.includes(e.role)) || state.found[e.id]?.by === bot.id),
    );
    if (own && room) return { playerId: bot.id, action: { type: "pin", evidenceId: own.id } };
    // Out of bot space: make room by taking down one of its own pins from an earlier chapter.
    if (own) {
      const stale = state.pins.find((p) => p.by === bot.id && (caseFile.evidence.find((e) => e.id === p.evidenceId)?.chapter ?? 0) < state.chapter);
      if (stale && !state.proposal) return { playerId: bot.id, action: { type: "unpin", evidenceId: stale.evidenceId } };
    }

    const ability = abilityMove(state, caseFile, bot);
    if (ability) return { playerId: bot.id, action: ability };
  }

  if (state.mode === "remote") {
    const quiet = bots.find((b) => !state.chat.some((line) => line.playerId === b.id));
    if (quiet) {
      const roles = quiet.roles.map((id) => caseFile.roles.find((r) => r.id === id)?.name ?? id).join(" & ");
      return { playerId: quiet.id, action: { type: "chat", text: `${roles} here. I'll pin what I find. You make the calls.` } };
    }
  }
  return null;
}
