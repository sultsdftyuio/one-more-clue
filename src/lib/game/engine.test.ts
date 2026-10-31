// Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { cases } from "../../data/cases/index.ts";
import { case001 } from "../../data/cases/case-001.ts";
import { practiceTipJar as tipJar } from "../../data/cases/practice-tip-jar.ts";
import { addPlayer, applyAction, checkCase, createRoom, dealRoles, PIN_LIMIT, scoreReport, viewFor } from "./engine.ts";
import type { Action, RoomState } from "./types.ts";

let ids = 0;
const newId = () => `id${++ids}`;

function must(result: ReturnType<typeof applyAction>): RoomState {
  if (!result.ok) throw new Error(result.error);
  return result.state;
}

test("answers come in a different order in each room, so the place can't be learned", () => {
  const order = (code: string) => {
    const state = createRoom({ code, caseFile: case001, host: { id: "p1", token: "t1", name: "Ana" }, mode: "together", now: 0 });
    const view = viewFor(state, case001, "p1", new Set(["p1"]));
    return { options: view.chapter.checkpoint!.options.map((o) => o.id), motives: view.case.motives.map((m) => m.id) };
  };
  assert.deepEqual(order("ROOM"), order("ROOM"));
  assert.deepEqual([...order("ROOM").options].sort(), [...case001.chapters[0].checkpoint!.options.map((o) => o.id)].sort());
  const firstMotives = new Set(["AAAA", "BBBB", "CCCC", "DDDD", "EEEE", "FFFF", "GGGG", "HHHH"].map((code) => order(code).motives[0]));
  assert.ok(firstMotives.size > 1);
});

test("three wrong answers run the clock out and lose the case", () => {
  const caseFile = { ...tipJar, deadline: { what: "Closing time at 2:00", times: ["10:00", "11:00", "1:00"], lost: "The bar closes." } };
  let state = createRoom({ code: "LATE", caseFile, host: { id: "p1", token: "t1", name: "Ana" }, mode: "together", now: 0 });
  state = must(addPlayer(state, caseFile, { id: "p2", token: "t2", name: "Bo" }, 0));
  state = must(applyAction(state, caseFile, "p1", { type: "start" }, 0, newId));
  for (const id of ["p1", "p2"]) state = must(applyAction(state, caseFile, id, { type: "ready" }, 0, newId));
  const checkpoint = caseFile.chapters[0].checkpoint!;
  const wrong = checkpoint.options.find((o) => o.id !== checkpoint.answer)!.id;
  for (const time of ["11:00", "1:00", null]) {
    state = must(applyAction(state, caseFile, "p1", { type: "propose", kind: "answer", optionId: wrong }, 0, newId));
    state = must(applyAction(state, caseFile, "p2", { type: "vote", proposalId: state.proposal!.id, vote: "yes" }, 0, newId));
    if (time) assert.equal(viewFor(state, caseFile, "p1", new Set()).deadline!.time, time);
  }
  assert.equal(state.phase, "reveal");
  assert.equal(state.outcome!.kind, "tooLate");
  const view = viewFor(state, caseFile, "p1", new Set());
  assert.equal(view.deadline!.lost, "The bar closes.");
  assert.equal(view.deadline!.left, 0);
});

// With four players the core roles go round in order:
const TECH = "p1";
const INTERVIEWER = "p2";
const PHOTOGRAPHER = "p3";
const ARCHIVIST = "p4";

/** A room with `count` players (p1 is host), started and past the briefing. */
function roomWith(count: number) {
  let state = createRoom({ code: "TEST", caseFile: tipJar, host: { id: "p1", token: "t1", name: "Ana" }, mode: "together", now: 0 });
  for (let i = 2; i <= count; i++) state = must(addPlayer(state, tipJar, { id: `p${i}`, token: `t${i}`, name: `Player ${i}` }, 0));
  state = must(applyAction(state, tipJar, "p1", { type: "start" }, 0, newId));
  for (let i = 1; i <= count; i++) state = must(applyAction(state, tipJar, `p${i}`, { type: "ready" }, 0, newId));
  return state;
}

const act = (state: RoomState, who: string, action: Action) => applyAction(state, tipJar, who, action, 1, newId);
const doo = (state: RoomState, who: string, action: Action) => must(act(state, who, action));
const sees = (state: RoomState, who: string) => viewFor(state, tipJar, who, new Set()).evidence.map((e) => e.id);

/** Everyone in a 4-player room agrees to a proposal. */
function agree(state: RoomState, proposer: string, action: Action) {
  state = doo(state, proposer, action);
  for (const p of ["p1", "p2", "p3", "p4"]) if (p !== proposer && state.proposal) state = doo(state, p, { type: "vote", proposalId: state.proposal.id, vote: "yes" });
  return state;
}

test("every case file is valid", () => {
  for (const c of cases) assert.deepEqual(checkCase(c), [], c.id);
});

test("roles: core roles are always dealt, extras join with more players", () => {
  assert.deepEqual(dealRoles(tipJar, ["a", "b"]), { a: ["tech", "photographer"], b: ["interviewer", "archivist"] });
  const six = dealRoles(tipJar, ["a", "b", "c", "d", "e", "f"]);
  assert.deepEqual(Object.values(six).flat().sort(), tipJar.roles.map((r) => r.id).sort());
});

test("each role starts with its own chapter 1 desk, and nothing from later chapters", () => {
  const state = roomWith(4);
  assert.equal(state.phase, "investigation");
  assert.deepEqual(sees(state, TECH), ["door-log"]);
  assert.deepEqual(sees(state, INTERVIEWER), ["statement-mo"]);
  assert.deepEqual(sees(state, PHOTOGRAPHER), ["photo-instagram"]);
  assert.deepEqual(sees(state, ARCHIVIST), ["receipts"]);
});

test("search: only the Tech, forgiving about spelling, and locked to the open chapter", () => {
  let state = roomWith(4);
  assert.equal(act(state, INTERVIEWER, { type: "search", query: "0007" }).ok, false);
  state = doo(state, TECH, { type: "search", query: "Card ****0007" });
  assert.ok(sees(state, TECH).includes("card-history"));
  assert.ok(!sees(state, INTERVIEWER).includes("card-history"), "others only see it once it's pinned");

  state = doo(state, TECH, { type: "search", query: "Page & Co." });
  assert.ok(!sees(state, TECH).includes("cctv-still"), "chapter 3 records don't exist yet");
  assert.equal(state.activity.at(-1)?.kind, "miss");
});

test("interviews spend a shared budget", () => {
  let state = roomWith(4);
  assert.equal(act(state, TECH, { type: "ask", evidenceId: "question-mo-door" }).ok, false, "only the Interviewer asks");
  state = doo(state, INTERVIEWER, { type: "ask", evidenceId: "question-mo-door" });
  assert.equal(state.questionsUsed, 1);
  assert.equal(act(state, INTERVIEWER, { type: "ask", evidenceId: "question-mo-door" }).ok, false, "no asking twice");
  assert.equal(act(state, INTERVIEWER, { type: "ask", evidenceId: "question-rex-inside" }).ok, false, "chapter 2 questions are locked");
  const view = viewFor(state, tipJar, INTERVIEWER, new Set());
  assert.equal(view.questionsLeft, tipJar.questionBudget - 1);
});

test("inspect: only the Photographer, only on photos they can see", () => {
  let state = roomWith(4);
  assert.equal(act(state, TECH, { type: "inspect", scene: "photo-instagram", hotspot: "jar" }).ok, false);
  assert.equal(act(state, PHOTOGRAPHER, { type: "inspect", scene: "photo-instagram", hotspot: "nowhere" }).ok, false);
  state = doo(state, PHOTOGRAPHER, { type: "inspect", scene: "photo-instagram", hotspot: "jar" });
  assert.ok(sees(state, PHOTOGRAPHER).includes("detail-jar"));
});

test("cross-check: the Archivist needs to see both pieces, and misses are remembered", () => {
  let state = roomWith(4);
  state = agree(state, TECH, { type: "propose", kind: "answer", optionId: "841-844" });
  assert.equal(state.chapter, 2);
  state = doo(state, INTERVIEWER, { type: "ask", evidenceId: "question-squarington-left" });
  assert.equal(act(state, ARCHIVIST, { type: "crosscheck", a: "receipts", b: "question-squarington-left" }).ok, false, "can't see the answer yet");

  state = doo(state, INTERVIEWER, { type: "pin", evidenceId: "question-squarington-left" });
  state = doo(state, ARCHIVIST, { type: "crosscheck", a: "receipts", b: "staff-chat" });
  assert.equal(act(state, ARCHIVIST, { type: "crosscheck", a: "staff-chat", b: "receipts" }).ok, false, "same pair, any order");
  state = doo(state, ARCHIVIST, { type: "crosscheck", a: "question-squarington-left", b: "receipts" });
  assert.ok(sees(state, ARCHIVIST).includes("insight-squarington"));
});

test("cross-check: empty compares are limited per chapter, real contradictions never are", () => {
  let state = roomWith(4);
  state = agree(state, TECH, { type: "propose", kind: "answer", optionId: "841-844" });
  state = doo(state, INTERVIEWER, { type: "ask", evidenceId: "question-squarington-left" });
  for (const [who, id] of [[INTERVIEWER, "question-squarington-left"], [INTERVIEWER, "statement-mo"], [TECH, "door-log"]]) {
    state = doo(state, who, { type: "pin", evidenceId: id });
  }
  state = doo(state, ARCHIVIST, { type: "crosscheck", a: "receipts", b: "staff-chat" });
  state = doo(state, ARCHIVIST, { type: "crosscheck", a: "receipts", b: "door-log" });
  state = doo(state, ARCHIVIST, { type: "crosscheck", a: "receipts", b: "statement-mo" });
  assert.equal(viewFor(state, tipJar, ARCHIVIST, new Set()).checksLeft, 0);
  assert.equal(act(state, ARCHIVIST, { type: "crosscheck", a: "staff-chat", b: "door-log" }).ok, false, "out of hunches");
  state = doo(state, ARCHIVIST, { type: "crosscheck", a: "question-squarington-left", b: "receipts" });
  assert.ok(sees(state, ARCHIVIST).includes("insight-squarington"), "a real contradiction still lands");
  assert.equal(viewFor(state, tipJar, TECH, new Set()).checksLeft, null, "only the Archivist counts hunches");
});

test("a single wrong checkpoint answer costs the sharp star", () => {
  let state = roomWith(4);
  state = agree(state, TECH, { type: "propose", kind: "answer", optionId: "838-841" });
  state = agree(state, TECH, { type: "propose", kind: "answer", optionId: "841-844" });
  assert.equal(scoreReport(state, tipJar, { suspectId: "rectangle", motiveId: "debt", evidenceIds: ["cctv-still", "detail-stop-clock"] }).sharp, false);
});

/** Case 001 with four people, jumped straight to chapter 3 where Rena's interrogation opens. */
function interrogationRoom() {
  let state = createRoom({ code: "INT", caseFile: case001, host: { id: "p1", token: "t1", name: "Ana" }, mode: "together", now: 0 });
  for (let i = 2; i <= 4; i++) state = must(addPlayer(state, case001, { id: `p${i}`, token: `t${i}`, name: `Player ${i}` }, 0));
  state = must(applyAction(state, case001, "p1", { type: "start" }, 0, newId));
  for (let i = 1; i <= 4; i++) state = must(applyAction(state, case001, `p${i}`, { type: "ready" }, 0, newId));
  return { ...state, chapter: 3 };
}
const act001 = (state: RoomState, who: string, action: Action) => applyAction(state, case001, who, action, 1, newId);
const do001 = (state: RoomState, who: string, action: Action) => must(act001(state, who, action));
const room001 = (state: RoomState, who: string) => viewFor(state, case001, who, new Set()).interrogation!;

test("interrogation: only the Interviewer hears the claims and presses on", () => {
  let state = interrogationRoom();
  assert.equal(room001(state, INTERVIEWER).claim, case001.interrogation!.claims[0].text);
  assert.equal(room001(state, TECH).claim, null, "the others have to be told");
  assert.equal(act001(state, TECH, { type: "press", step: 1 }).ok, false);
  state = do001(state, INTERVIEWER, { type: "press", step: -1 });
  assert.equal(room001(state, TECH).index, case001.interrogation!.claims.length - 1, "the story loops round");
  assert.equal(viewFor({ ...state, chapter: 2 }, case001, INTERVIEWER, new Set()).interrogation, null, "closed before chapter 3");
});

test("interrogation: presenting the right pinned evidence breaks a lie, anything else is a strike", () => {
  let state = interrogationRoom();
  state = do001(state, INTERVIEWER, { type: "press", step: 1 }); // "I'm a senior engineer at Northgate Capital."
  assert.equal(act001(state, ARCHIVIST, { type: "callLie", evidenceId: "northgate-email" }).ok, false, "it has to be on the board");
  state = do001(state, ARCHIVIST, { type: "pin", evidenceId: "northgate-email" });
  state = do001(state, TECH, { type: "callLie", evidenceId: "northgate-email" });
  assert.deepEqual(room001(state, TECH).broken.map((b) => b.id), ["northgate"]);
  assert.ok(room001(state, TECH).claim, "a broken claim is shown to everyone");
  assert.equal(act001(state, TECH, { type: "callLie", evidenceId: "northgate-email" }).ok, false, "no catching it twice");

  state = do001(state, INTERVIEWER, { type: "press", step: -1 }); // a true claim
  for (let i = 1; i <= 3; i++) state = do001(state, TECH, { type: "callLie", evidenceId: "northgate-email" });
  assert.equal(room001(state, TECH).over, "walkedOut");
  assert.ok(room001(state, TECH).walkout);
  assert.equal(act001(state, INTERVIEWER, { type: "press", step: 1 }).ok, false, "she won't talk again");
});

test("interrogation: catching every lie earns the confession", () => {
  let state = interrogationRoom();
  const claims = case001.interrogation!.claims;
  claims.forEach((claim, i) => {
    if (i > 0) state = do001(state, INTERVIEWER, { type: "press", step: 1 });
    if (!claim.lie) return;
    const proof = claim.lie.breaks[0];
    state = { ...state, found: { ...state.found, [proof]: { by: PHOTOGRAPHER, at: 0 } }, pins: [{ evidenceId: proof, by: PHOTOGRAPHER, at: 0 }] };
    state = do001(state, PHOTOGRAPHER, { type: "callLie", evidenceId: proof });
  });
  assert.equal(room001(state, TECH).over, "confessed");
  assert.equal(state.found["rena-confession"]?.by, PHOTOGRAPHER);
  assert.ok(sees001(state, INTERVIEWER).includes("rena-confession"), "the Interviewer's desk gets it");
  assert.ok(case001.solution.keyEvidence.includes("rena-confession"));
});
const sees001 = (state: RoomState, who: string) => viewFor(state, case001, who, new Set()).evidence.map((e) => e.id);

test("the board holds a limited number of pins", () => {
  let state = roomWith(4);
  state = doo(state, TECH, { type: "pin", evidenceId: "door-log" });
  assert.equal(act(state, TECH, { type: "pin", evidenceId: "door-log" }).ok, false);
  assert.equal(act(state, TECH, { type: "pin", evidenceId: "receipts" }).ok, false, "can't pin what you can't see");
  state = { ...state, pins: Array.from({ length: PIN_LIMIT }, (_, i) => ({ evidenceId: `x${i}`, by: TECH, at: 0 })) };
  assert.equal(act(state, ARCHIVIST, { type: "pin", evidenceId: "receipts" }).ok, false, "board full");
});

test("checkpoints: a wrong answer costs, a right one opens the next chapter", () => {
  let state = roomWith(4);
  state = agree(state, TECH, { type: "propose", kind: "answer", optionId: "838-841" });
  assert.equal(state.chapter, 1);
  assert.equal(state.wrongAnswers, 1);
  state = agree(state, TECH, { type: "propose", kind: "answer", optionId: "841-844" });
  assert.equal(state.chapter, 2);
  assert.ok(sees(state, ARCHIVIST).includes("staff-chat"), "chapter 2 desk arrives");
  assert.equal(act(state, TECH, { type: "propose", kind: "final", report: { suspectId: "rectangle", motiveId: "debt", evidenceIds: [] } }).ok, false, "no final report before the last chapter");
});

test("hints open one at a time per chapter", () => {
  let state = roomWith(4);
  state = agree(state, TECH, { type: "propose", kind: "hint" });
  state = agree(state, TECH, { type: "propose", kind: "hint" });
  assert.equal(viewFor(state, tipJar, TECH, new Set()).chapter.hints.length, 2);
  assert.equal(act(state, TECH, { type: "propose", kind: "hint" }).ok, false);
  assert.equal(state.hintsUsed, 2);
});

/** The intended route through the case, every role pulling its weight. */
function solveToChapter3() {
  let state = roomWith(4);
  state = agree(state, TECH, { type: "propose", kind: "answer", optionId: "841-844" });
  state = doo(state, INTERVIEWER, { type: "ask", evidenceId: "question-squarington-left" });
  state = doo(state, INTERVIEWER, { type: "pin", evidenceId: "question-squarington-left" });
  state = doo(state, ARCHIVIST, { type: "crosscheck", a: "receipts", b: "question-squarington-left" });
  state = agree(state, ARCHIVIST, { type: "propose", kind: "answer", optionId: "square" });
  assert.equal(state.chapter, 3);

  // Ollie tips off the camera; the Tech pulls it; the Photographer reads it once it's pinned.
  state = doo(state, INTERVIEWER, { type: "ask", evidenceId: "question-ollie-door" });
  state = doo(state, TECH, { type: "search", query: "bookshop camera" });
  assert.equal(act(state, PHOTOGRAPHER, { type: "inspect", scene: "cctv-still", hotspot: "hat" }).ok, false, "not pinned yet");
  state = doo(state, TECH, { type: "pin", evidenceId: "cctv-still" });
  state = doo(state, PHOTOGRAPHER, { type: "inspect", scene: "cctv-still", hotspot: "hat" });
  state = doo(state, PHOTOGRAPHER, { type: "inspect", scene: "photo-bus-stop", hotspot: "stop-clock" });
  state = doo(state, PHOTOGRAPHER, { type: "pin", evidenceId: "detail-stop-clock" });
  return state;
}

test("a perfect final report earns five stars", () => {
  let state = solveToChapter3();
  state = agree(state, TECH, {
    type: "propose",
    kind: "final",
    report: { suspectId: "rectangle", motiveId: "debt", evidenceIds: ["cctv-still", "detail-stop-clock"] },
  });
  assert.equal(state.phase, "reveal");
  assert.equal(state.outcome?.kind, "solved");
  assert.deepEqual(state.outcome?.score, { stars: 5, culprit: true, motive: true, evidence: true, sharp: true });
  assert.ok(viewFor(state, tipJar, TECH, new Set()).solution);
});

test("the proof has to be on the board, and the red herring scores nothing", () => {
  let state = solveToChapter3();
  const report = { suspectId: "square", motiveId: "debt", evidenceIds: ["cctv-still", "depot-chat"] };
  assert.equal(act(state, TECH, { type: "propose", kind: "final", report }).ok, false, "depot chat isn't pinned");
  state = agree(state, TECH, { type: "propose", kind: "final", report: { ...report, evidenceIds: ["cctv-still", "detail-stop-clock"] } });
  assert.equal(state.outcome?.kind, "wrong");
  assert.equal(state.outcome?.score.stars, 0);
});

test("views never leak tokens, the answer or other roles' evidence", () => {
  const state = solveToChapter3();
  const view = JSON.stringify(viewFor(state, tipJar, ARCHIVIST, new Set()));
  assert.ok(!view.includes('"t2"'));
  assert.ok(!view.includes(tipJar.solution.explanation));
  assert.ok(!view.includes("Night shift · Depot Road"), "the depot chat hasn't been found");
  assert.ok(!view.includes("Rex's alibi photo was taken"), "no timeline before the reveal");
});

test("a leaving player's roles pass on, abilities included", () => {
  let state = roomWith(4);
  state = doo(state, TECH, { type: "leave" });
  const heir = state.players.find((p) => !p.left && p.roles.includes("tech"))!;
  state = doo(state, heir.id, { type: "search", query: "0007" });
  assert.ok(state.found["card-history"]);
});

test("majority votes, and a proposal fails once a majority is impossible", () => {
  let state = roomWith(4);
  state = doo(state, TECH, { type: "propose", kind: "giveUp" });
  const id = state.proposal!.id;
  state = doo(state, INTERVIEWER, { type: "vote", proposalId: id, vote: "no" });
  assert.ok(state.proposal);
  state = doo(state, PHOTOGRAPHER, { type: "vote", proposalId: id, vote: "no" });
  assert.equal(state.proposal, null);
  assert.equal(state.phase, "investigation");
});

test("renaming: your own name, in the lobby only, never someone else's", () => {
  let state = createRoom({ code: "T", caseFile: tipJar, host: { id: "p1", token: "t1", name: "Sly Raven" }, mode: "together", now: 0 });
  state = must(addPlayer(state, tipJar, { id: "p2", token: "t2", name: "Quiet Fox" }, 0));
  state = doo(state, "p1", { type: "rename", name: "  Ana  " });
  assert.equal(state.players[0].name, "Ana");
  assert.equal(act(state, "p2", { type: "rename", name: "ana" }).ok, false, "taken");
  assert.equal(act(state, "p2", { type: "rename", name: "   " }).ok, false, "empty");
  state = doo(state, "p1", { type: "start" });
  assert.equal(act(state, "p2", { type: "rename", name: "Sam" }).ok, false, "too late once the case starts");
});

test("joining: lobby only, no duplicate names, room limit", () => {
  let state = createRoom({ code: "T", caseFile: tipJar, host: { id: "p1", token: "t1", name: "Ana" }, mode: "together", now: 0 });
  assert.equal(addPlayer(state, tipJar, { id: "p2", token: "t2", name: " ana " }, 0).ok, false);
  for (let i = 2; i <= tipJar.maxPlayers; i++) state = must(addPlayer(state, tipJar, { id: `p${i}`, token: `t${i}`, name: `P${i}` }, 0));
  assert.equal(addPlayer(state, tipJar, { id: "px", token: "tx", name: "Late" }, 0).ok, false);
});
