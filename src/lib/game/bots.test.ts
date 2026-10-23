// Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { practiceTipJar as tipJar } from "../../data/cases/practice-tip-jar.ts";
import { nextBotMove } from "./bots.ts";
import { addPlayer, applyAction, createRoom } from "./engine.ts";
import type { Action, Mode, RoomState } from "./types.ts";

let ids = 0;
const newId = () => `id${++ids}`;
let clock = 0;

function must(result: ReturnType<typeof applyAction>): RoomState {
  if (!result.ok) throw new Error(result.error);
  return result.state;
}

/** Plays every bot move available, a few seconds apart, until the bots have nothing left to do. */
function letBotsPlay(state: RoomState) {
  for (let i = 0; i < 100; i++) {
    clock += 3000;
    const move = nextBotMove(state, tipJar, clock);
    if (!move) return state;
    state = { ...must(applyAction(state, tipJar, move.playerId, move.action, clock, newId)), botMovedAt: clock };
  }
  throw new Error("bots never settled");
}

function soloWithBots(mode: Mode) {
  let state = createRoom({ code: "BOTS", caseFile: tipJar, host: { id: "me", token: "t", name: "Me" }, mode, now: 0 });
  for (const n of [1, 2]) state = must(addPlayer(state, tipJar, { id: `bot${n}`, token: `b${n}`, name: `Bot ${n}`, bot: true }, 0));
  state = must(applyAction(state, tipJar, "me", { type: "start" }, 0, newId));
  state = must(applyAction(state, tipJar, "me", { type: "ready" }, 0, newId));
  return letBotsPlay(state);
}

const act = (state: RoomState, action: Action) => must(applyAction(state, tipJar, "me", action, clock, newId));

test("bots get ready and share all their evidence", () => {
  const state = soloWithBots("together");
  assert.equal(state.phase, "investigation");
  const botRoles = state.players.filter((p) => p.bot).flatMap((p) => p.roles);
  const botEvidence = tipJar.evidence.filter((e) => botRoles.includes(e.role)).map((e) => e.id);
  assert.deepEqual(state.board.map((b) => b.evidenceId).sort(), botEvidence.sort());
});

test("bots say so in the chat of a remote room", () => {
  const state = soloWithBots("remote");
  assert.equal(state.chat.filter((line) => line.playerId.startsWith("bot")).length, 2);
});

test("bots follow the human's vote, both ways", () => {
  let state = soloWithBots("together");
  state = act(state, { type: "propose", kind: "hint" });
  state = letBotsPlay(state);
  assert.equal(state.hintsUnlocked, 1, "human said yes, bots agreed");

  state = act(state, { type: "propose", kind: "hint" });
  state = act(state, { type: "vote", proposalId: state.proposal!.id, vote: "no" });
  state = letBotsPlay(state);
  assert.equal(state.hintsUnlocked, 1, "human changed to no, bots followed");
  assert.equal(state.proposal, null);

  state = act(state, { type: "propose", kind: "accuse", suspectId: "square" });
  state = letBotsPlay(state);
  assert.equal(state.outcome?.kind, "solved");
});

test("bots wait between moves", () => {
  const state = createRoom({ code: "B", caseFile: tipJar, host: { id: "me", token: "t", name: "Me" }, mode: "together", now: 0 });
  const withBot = must(addPlayer(state, tipJar, { id: "bot", token: "b", name: "Bot", bot: true }, 0));
  let started = must(applyAction(withBot, tipJar, "me", { type: "start" }, 0, newId));
  started = { ...started, botMovedAt: 1000 };
  assert.equal(nextBotMove(started, tipJar, 1200), null, "too soon after the last move");
  assert.ok(nextBotMove(started, tipJar, 2000));
});
