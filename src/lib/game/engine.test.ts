// Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { cases } from "../../data/cases/index.ts";
import { practiceTipJar as tipJar } from "../../data/cases/practice-tip-jar.ts";
import { addPlayer, applyAction, checkCase, createRoom, dealRoles, viewFor } from "./engine.ts";
import type { Action, RoomState } from "./types.ts";

let ids = 0;
const newId = () => `id${++ids}`;

function must(result: ReturnType<typeof applyAction>): RoomState {
  if (!result.ok) throw new Error(result.error);
  return result.state;
}

/** A room with `count` players (p1 is host), started and past the briefing. */
function roomWith(count: number) {
  let state = createRoom({
    code: "TEST",
    caseFile: tipJar,
    host: { id: "p1", token: "t1", name: "Ana" },
    mode: "together",
    now: 0,
  });
  for (let i = 2; i <= count; i++) {
    state = must(addPlayer(state, tipJar, { id: `p${i}`, token: `t${i}`, name: `Player ${i}` }, 0));
  }
  state = must(applyAction(state, tipJar, "p1", { type: "start" }, 0, newId));
  for (let i = 1; i <= count; i++) state = must(applyAction(state, tipJar, `p${i}`, { type: "ready" }, 0, newId));
  return state;
}

const act = (state: RoomState, who: string, action: Action) => applyAction(state, tipJar, who, action, 1, newId);

test("every case file is valid", () => {
  for (const c of cases) assert.deepEqual(checkCase(c), [], c.id);
});

test("roles: core roles are always dealt, extras join with more players", () => {
  const two = dealRoles(tipJar, ["a", "b"]);
  assert.deepEqual(two, { a: ["interviewer", "photographer"], b: ["tech", "archivist"] });

  const six = dealRoles(tipJar, ["a", "b", "c", "d", "e", "f"]);
  assert.deepEqual(Object.values(six).flat().sort(), tipJar.roles.map((r) => r.id).sort());
  assert.ok(Object.values(six).every((roles) => roles.length === 1));
});

test("briefing ends once everyone is ready", () => {
  const state = roomWith(3);
  assert.equal(state.phase, "investigation");
});

test("players only see their own evidence until it's shared", () => {
  let state = roomWith(2);
  const p1 = viewFor(state, tipJar, "p1", new Set());
  const p2 = viewFor(state, tipJar, "p2", new Set());
  assert.ok(p1.myEvidence.every((e) => ["interviewer", "photographer"].includes(e.role)));
  assert.ok(p2.myEvidence.every((e) => ["tech", "archivist"].includes(e.role)));
  assert.equal(p1.solution, null);

  assert.equal(act(state, "p1", { type: "share", evidenceId: "receipts" }).ok, false, "can't share someone else's");
  state = must(act(state, "p2", { type: "share", evidenceId: "receipts" }));
  assert.equal(viewFor(state, tipJar, "p1", new Set()).board[0].evidence.id, "receipts");
});

test("a view never contains other players' tokens or the answer", () => {
  const view = JSON.stringify(viewFor(roomWith(4), tipJar, "p1", new Set()));
  assert.ok(!view.includes('"t2"'));
  assert.ok(!view.includes(tipJar.solution.explanation));
});

test("an accusation needs a majority, and a correct one solves the case", () => {
  let state = roomWith(4); // majority of 4 is 3
  state = must(act(state, "p1", { type: "propose", kind: "accuse", suspectId: "square" }));
  const id = state.proposal!.id;
  state = must(act(state, "p2", { type: "vote", proposalId: id, vote: "yes" }));
  assert.equal(state.phase, "investigation", "2 of 4 is not a majority");
  state = must(act(state, "p3", { type: "vote", proposalId: id, vote: "yes" }));
  assert.equal(state.phase, "reveal");
  assert.equal(state.outcome?.kind, "solved");
  assert.ok(viewFor(state, tipJar, "p4", new Set()).solution);
});

test("a wrong accusation ends the case as wrong", () => {
  let state = roomWith(2);
  state = must(act(state, "p1", { type: "propose", kind: "accuse", suspectId: "triangle" }));
  state = must(act(state, "p2", { type: "vote", proposalId: state.proposal!.id, vote: "yes" }));
  assert.equal(state.outcome?.kind, "wrong");
});

test("a proposal fails once a majority is impossible", () => {
  let state = roomWith(4);
  state = must(act(state, "p1", { type: "propose", kind: "accuse", suspectId: "square" }));
  const id = state.proposal!.id;
  state = must(act(state, "p2", { type: "vote", proposalId: id, vote: "no" }));
  assert.ok(state.proposal, "still possible: 3 can still say yes");
  state = must(act(state, "p3", { type: "vote", proposalId: id, vote: "no" }));
  assert.equal(state.proposal, null);
  assert.equal(state.decided.at(-1)?.passed, false);
  assert.equal(state.phase, "investigation");
});

test("hints unlock one at a time by vote, and run out", () => {
  let state = roomWith(2);
  for (let i = 0; i < tipJar.hints.length; i++) {
    state = must(act(state, "p1", { type: "propose", kind: "hint" }));
    state = must(act(state, "p2", { type: "vote", proposalId: state.proposal!.id, vote: "yes" }));
  }
  assert.equal(viewFor(state, tipJar, "p1", new Set()).hints.length, tipJar.hints.length);
  assert.equal(act(state, "p1", { type: "propose", kind: "hint" }).ok, false);
});

test("giving up reveals the answer", () => {
  let state = roomWith(2);
  state = must(act(state, "p2", { type: "propose", kind: "giveUp" }));
  state = must(act(state, "p1", { type: "vote", proposalId: state.proposal!.id, vote: "yes" }));
  assert.equal(state.outcome?.kind, "gaveUp");
});

test("a leaving player's roles pass on, so no evidence is lost", () => {
  let state = roomWith(3);
  const leaverRoles = state.players.find((p) => p.id === "p2")!.roles;
  state = must(act(state, "p2", { type: "leave" }));
  const held = state.players.filter((p) => !p.left).flatMap((p) => p.roles);
  for (const role of leaverRoles) assert.ok(held.includes(role));
});

test("the host leaving hands the room to someone else", () => {
  let state = roomWith(2);
  state = must(act(state, "p1", { type: "leave" }));
  assert.equal(state.hostId, "p2");
});

test("chat is only on in remote rooms", () => {
  let state = roomWith(2);
  assert.equal(act(state, "p1", { type: "chat", text: "hi" }).ok, false);
  state = must(act(state, "p1", { type: "setMode", mode: "remote" }));
  state = must(act(state, "p2", { type: "chat", text: "  look at the receipts  " }));
  assert.equal(state.chat[0].text, "look at the receipts");
});

test("joining: lobby only, no duplicate names, room limit", () => {
  let state = createRoom({ code: "T", caseFile: tipJar, host: { id: "p1", token: "t1", name: "Ana" }, mode: "together", now: 0 });
  assert.equal(addPlayer(state, tipJar, { id: "p2", token: "t2", name: " ana " }, 0).ok, false);
  for (let i = 2; i <= tipJar.maxPlayers; i++) state = must(addPlayer(state, tipJar, { id: `p${i}`, token: `t${i}`, name: `P${i}` }, 0));
  assert.equal(addPlayer(state, tipJar, { id: "px", token: "tx", name: "Late" }, 0).ok, false);
});
