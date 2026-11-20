// Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { case001 } from "../../data/cases/case-001.ts";
import { addPlayer, applyAction, createRoom, viewFor } from "../game/engine.ts";
import type { RoomState } from "../game/types.ts";
import { hasWorld, worldOf } from "./plates.ts";

let ids = 0;
const newId = () => `id${++ids}`;
const host = { id: "p1", token: "t1", name: "Ana" };

function must(result: ReturnType<typeof applyAction>): RoomState {
  if (!result.ok) throw new Error(result.error);
  return result.state;
}

test("a classic room is made exactly as before: no world flag in its state, and its view says so", () => {
  const state = createRoom({ code: "OLDS", caseFile: case001, host, mode: "together", now: 0 });
  assert.equal("world" in state, false);
  assert.equal(viewFor(state, case001, "p1", new Set(["p1"])).world, false);
  const same = createRoom({ code: "OLDS", caseFile: case001, host, mode: "together", now: 0, world: false });
  assert.deepEqual(same, state, "asking for no world is the same as not asking");
});

test("a world room keeps its flag through joining, starting and playing", () => {
  let state = createRoom({ code: "WRLD", caseFile: case001, host, mode: "together", now: 0, world: true });
  assert.equal(state.world, true);
  state = must(addPlayer(state, case001, { id: "p2", token: "t2", name: "Bo" }, 0));
  state = must(applyAction(state, case001, "p1", { type: "setMode", mode: "remote" }, 0, newId));
  state = must(applyAction(state, case001, "p1", { type: "start" }, 0, newId));
  for (const id of ["p1", "p2"]) state = must(applyAction(state, case001, id, { type: "ready" }, 0, newId));
  assert.equal(state.phase, "investigation");
  assert.equal(state.world, true);
  for (const id of ["p1", "p2"]) assert.equal(viewFor(state, case001, id, new Set()).world, true);
});

test("only cases with a painted building can open a world room", () => {
  assert.equal(hasWorld("case-001"), true);
  assert.equal(worldOf("case-001")?.caseId, "case-001");
  for (const caseId of ["case-002", "case-003", "case-004", "practice-tip-jar", ""]) assert.equal(hasWorld(caseId), false, caseId);
});
