/**
 * Computer players for testing a room alone. They make one move at a time, at
 * a human-ish pace: get ready, share their evidence piece by piece, say so in
 * remote rooms, and vote the way the first human voter did.
 */
import { activePlayers } from "./engine.ts";
import type { Action, CaseFile, RoomState } from "./types";

export const BOT_NAMES = ["Bot Watson", "Bot Marple", "Bot Poirot", "Bot Fletcher", "Bot Columbo", "Bot Lestrade"];

/** Votes and getting ready happen quickly; sharing evidence is spaced out. */
const QUICK_MS = 800;
const SHARE_MS = 2500;

export type BotMove = { playerId: string; action: Action };

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

  if (since < SHARE_MS) return null;
  const shared = new Set(state.board.map((b) => b.evidenceId));
  for (const bot of bots) {
    const piece = caseFile.evidence.find((e) => bot.roles.includes(e.role) && !shared.has(e.id));
    if (piece) return { playerId: bot.id, action: { type: "share", evidenceId: piece.id } };
  }

  if (state.mode === "remote") {
    const quiet = bots.find((b) => !state.chat.some((line) => line.playerId === b.id));
    if (quiet) {
      const roles = quiet.roles.map((id) => caseFile.roles.find((r) => r.id === id)?.name ?? id).join(" & ");
      return { playerId: quiet.id, action: { type: "chat", text: `Everything from the ${roles} is on the board. Your call, detectives.` } };
    }
  }
  return null;
}
