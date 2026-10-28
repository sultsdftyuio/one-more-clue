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
  for (let i = 0; i < 200; i++) {
    clock += 4000;
    const move = nextBotMove(state, tipJar, clock);
    if (!move) return state;
    state = { ...must(applyAction(state, tipJar, move.playerId, move.action, clock, newId)), botMovedAt: clock };
  }
  throw new Error("bots never settled");
}

/** Me plus three bots; with four players I'm the Tech. */
function soloWithBots(mode: Mode) {
  let state = createRoom({ code: "BOTS", caseFile: tipJar, host: { id: "me", token: "t", name: "Me" }, mode, now: 0 });
  for (const n of [1, 2, 3]) state = must(addPlayer(state, tipJar, { id: `bot${n}`, token: `b${n}`, name: `Bot ${n}`, bot: true }, 0));
  state = must(applyAction(state, tipJar, "me", { type: "start" }, 0, newId));
  state = must(applyAction(state, tipJar, "me", { type: "ready" }, 0, newId));
  return letBotsPlay(state);
}

const act = (state: RoomState, action: Action) => must(applyAction(state, tipJar, "me", action, clock, newId));

test("bots get ready, pin their desks and use their abilities once per chapter", () => {
  const state = soloWithBots("together");
  assert.equal(state.phase, "investigation");
  const pinned = state.pins.map((p) => p.evidenceId);
  assert.ok(pinned.includes("statement-mo") && pinned.includes("photo-instagram") && pinned.includes("receipts"));
  assert.ok(state.found["question-mo-door"], "the Interviewer bot asked its question");
  assert.ok(Object.keys(state.found).some((id) => id.startsWith("detail-")), "the Photographer bot inspected the photo");
  assert.equal(state.chapter, 1, "bots never answer checkpoints");
});

test("bots say hello in the chat of a remote room", () => {
  const state = soloWithBots("remote");
  assert.equal(state.chat.filter((line) => line.playerId.startsWith("bot")).length, 3);
});

test("bots follow the human's vote, both ways", () => {
  let state = soloWithBots("together");
  state = act(state, { type: "propose", kind: "answer", optionId: "838-841" });
  state = act(state, { type: "vote", proposalId: state.proposal!.id, vote: "no" });
  state = letBotsPlay(state);
  assert.equal(state.wrongAnswers, 0, "human said no, bots followed");

  state = act(state, { type: "propose", kind: "answer", optionId: "841-844" });
  state = letBotsPlay(state);
  assert.equal(state.chapter, 2);
});

test("in a new chapter, bots swap old pins for new finds so the team keeps moving", () => {
  let state = soloWithBots("together");
  state = act(state, { type: "propose", kind: "answer", optionId: "841-844" });
  state = letBotsPlay(state);
  assert.equal(state.chapter, 2);
  assert.ok(state.pins.some((p) => p.evidenceId === "question-squarington-left"), "the Interviewer bot's answer reached the board");
  assert.ok(state.found["insight-squarington"], "so the Archivist bot could catch the lie");
});

test("humans pinning lots doesn't stop bots showing their desks", () => {
  let state = soloWithBots("together");
  const humanPins = Array.from({ length: 5 }, (_, i) => ({ evidenceId: `mine${i}`, by: "me", at: 0 }));
  state = { ...state, pins: humanPins, botMovedAt: 0 };
  const move = nextBotMove(state, tipJar, 10_000);
  assert.equal(move?.action.type, "pin", "a bot still pins with 5 human pins up");

  state = { ...state, pins: [...humanPins, ...humanPins.slice(0, 3).map((p, i) => ({ ...p, evidenceId: `more${i}` }))] };
  assert.notEqual(nextBotMove(state, tipJar, 10_000)?.action.type, "pin", "but never onto a full board");
});

test("bots wait between moves", () => {
  const state = createRoom({ code: "B", caseFile: tipJar, host: { id: "me", token: "t", name: "Me" }, mode: "together", now: 0 });
  const withBot = must(addPlayer(state, tipJar, { id: "bot", token: "b", name: "Bot", bot: true }, 0));
  const started = { ...must(applyAction(withBot, tipJar, "me", { type: "start" }, 0, newId)), botMovedAt: 1000 };
  assert.equal(nextBotMove(started, tipJar, 1200), null, "too soon after the last move");
  assert.ok(nextBotMove(started, tipJar, 2000));
});
