// Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { cases } from "../../data/cases/index.ts";
import { case001 } from "../../data/cases/case-001.ts";
import { practiceTipJar as tipJar } from "../../data/cases/practice-tip-jar.ts";
import { shotOf } from "./camera.ts";
import { clockTime, costMinutes, formatTime, nightMinutes, parseTime } from "./clock.ts";
import { addPlayer, applyAction, checkCase, createRoom, dealRoles, OBJECTION_MS, PIN_LIMIT, scoreReport, SPOTLIGHT_GAP_MS, viewFor } from "./engine.ts";
import type { Action, CaseFile, RoomState } from "./types.ts";

let ids = 0;
const newId = () => `id${++ids}`;

function must(result: ReturnType<typeof applyAction>): RoomState {
  if (!result.ok) throw new Error(result.error);
  return result.state;
}

test("motives come in a different order in each room, so the place can't be learned", () => {
  const order = (code: string) => {
    const state = createRoom({ code, caseFile: case001, host: { id: "p1", token: "t1", name: "Ana" }, mode: "together", now: 0 });
    const view = viewFor(state, case001, "p1", new Set(["p1"]));
    return view.case.motives.map((m) => m.id);
  };
  assert.deepEqual(order("ROOM"), order("ROOM"));
  const firstMotives = new Set(["AAAA", "BBBB", "CCCC", "DDDD", "EEEE", "FFFF", "GGGG", "HHHH"].map((code) => order(code)[0]));
  assert.ok(firstMotives.size > 1);
});

test("the story clock reads and writes times the way each case does", () => {
  assert.equal(parseTime("Midnight"), 0);
  assert.equal(parseTime("12:30 AM"), 30);
  assert.equal(parseTime("9:17 PM"), 21 * 60 + 17);
  assert.equal(parseTime("23:30"), 23 * 60 + 30);
  assert.throws(() => parseTime("half nine"));
  assert.equal(formatTime(6 * 60 + 45, "12:00 AM"), "6:45 AM");
  assert.equal(formatTime(24 * 60 + 15, "10:15 PM"), "12:15 AM");
  assert.equal(formatTime(6 * 60 + 5, "23:30"), "06:05");
  assert.equal(nightMinutes({ what: "", start: "10:15 PM", end: "12:00 AM", lost: "" }), 105, "a night can cross midnight");
  assert.equal(nightMinutes(case001.deadline!), 540);
});

test("the night runs out: wrong answers spend the most of it, and the case is lost", () => {
  // The practice night runs 9 to 11, so a wrong answer costs 30 minutes.
  let state = createRoom({ code: "LATE", caseFile: tipJar, host: { id: "p1", token: "t1", name: "Ana" }, mode: "together", now: 0 });
  state = must(addPlayer(state, tipJar, { id: "p2", token: "t2", name: "Bo" }, 0));
  state = must(applyAction(state, tipJar, "p1", { type: "start" }, 0, newId));
  for (const id of ["p1", "p2"]) state = must(applyAction(state, tipJar, id, { type: "ready" }, 0, newId));
  assert.equal(viewFor(state, tipJar, "p1", new Set()).deadline!.time, "9:00 PM");
  state = must(applyAction(state, tipJar, "p1", { type: "pin", evidenceId: "door-log" }, 0, newId));
  for (const time of ["9:30 PM", "10:00 PM", "10:30 PM", null]) {
    state = must(applyAction(state, tipJar, "p1", { type: "propose", kind: "answer", evidenceId: "door-log" }, 0, newId));
    state = must(applyAction(state, tipJar, "p2", { type: "vote", proposalId: state.proposal!.id, vote: "yes" }, 0, newId));
    if (time) assert.equal(viewFor(state, tipJar, "p1", new Set()).deadline!.time, time);
  }
  assert.equal(state.phase, "reveal");
  assert.equal(state.outcome!.kind, "tooLate");
  const view = viewFor(state, tipJar, "p1", new Set());
  assert.equal(view.deadline!.lost, tipJar.deadline!.lost);
  assert.equal(view.deadline!.left, 0);
  assert.equal(view.deadline!.time, "11:00 PM", "the clock stops at the deadline");
});

test("rooms from before the story clock still tell the right time", () => {
  const old = { wrongAnswers: 2, clockSpent: undefined };
  assert.equal(clockTime(old, case001), formatTime(2 * costMinutes(case001.deadline!, "wrong"), "12:00 AM"));
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

/** Pins a right answer to chapter 1 and has the whole team present it. */
const proveChapter1 = (state: RoomState) => agree(doo(state, INTERVIEWER, { type: "pin", evidenceId: "statement-mo" }), TECH, { type: "propose", kind: "answer", evidenceId: "statement-mo" });

/** Everyone in a 4-player room agrees to a proposal. */
function agree(state: RoomState, proposer: string, action: Action) {
  state = doo(state, proposer, action);
  for (const p of ["p1", "p2", "p3", "p4"]) if (p !== proposer && state.proposal) state = doo(state, p, { type: "vote", proposalId: state.proposal.id, vote: "yes" });
  return state;
}

test("where you're playing: the host sets it, in the lobby only", () => {
  let state = createRoom({ code: "MODE", caseFile: tipJar, host: { id: "p1", token: "t1", name: "Ana" }, mode: "together", now: 0 });
  state = must(addPlayer(state, tipJar, { id: "p2", token: "t2", name: "Bo" }, 0));
  assert.equal(act(state, "p2", { type: "setMode", mode: "remote" }).ok, false);
  state = doo(state, "p1", { type: "setMode", mode: "remote" });
  assert.equal(viewFor(state, tipJar, "p2", new Set()).mode, "remote");
  assert.equal(act(roomWith(2), "p1", { type: "setMode", mode: "together" }).ok, false, "not once the case has started");
});

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

test("interviews take time out of the night", () => {
  let state = roomWith(4);
  assert.equal(act(state, TECH, { type: "ask", evidenceId: "question-mo-door" }).ok, false, "only the Interviewer asks");
  state = doo(state, INTERVIEWER, { type: "ask", evidenceId: "question-mo-door" });
  assert.equal(state.questionsUsed, 1);
  const view = viewFor(state, tipJar, INTERVIEWER, new Set());
  assert.equal(view.deadline!.spent, view.deadline!.costs.question);
  assert.equal(act(state, INTERVIEWER, { type: "ask", evidenceId: "question-mo-door" }).ok, false, "no asking twice");
  assert.equal(act(state, INTERVIEWER, { type: "ask", evidenceId: "question-rex-inside" }).ok, false, "chapter 2 questions are locked");
});

test("the camera: only the Photographer, a framed clue is theirs, a shot of nothing costs time", () => {
  let state = roomWith(4);
  const photo = tipJar.evidence.find((e) => e.id === "photo-instagram")!;
  const jar = shotOf(photo.body, "jar")!;
  const spent = () => viewFor(state, tipJar, PHOTOGRAPHER, new Set()).deadline!.spent;
  const miss = viewFor(state, tipJar, PHOTOGRAPHER, new Set()).deadline!.costs.miss;

  assert.equal(act(state, TECH, { type: "shoot", scene: "photo-instagram", ...jar }).ok, false, "only the Photographer");
  assert.equal(act(state, PHOTOGRAPHER, { type: "shoot", scene: "photo-instagram", frame: { x: 0, y: 0, w: 100, h: 100 } }).ok, false, "a whole-picture snapshot is too far away");
  assert.equal(spent(), 0, "and it costs nothing");

  // A corner with nothing in it: the shot is taken, and the night pays for it.
  const empty = { x: 0, y: 0, w: 25, h: 25 };
  state = doo(state, PHOTOGRAPHER, { type: "shoot", scene: "photo-instagram", frame: empty });
  assert.equal(spent(), miss);
  assert.equal(viewFor(state, tipJar, PHOTOGRAPHER, new Set()).shots.at(-1)?.hit, null);

  state = doo(state, PHOTOGRAPHER, { type: "shoot", scene: "photo-instagram", ...jar });
  assert.ok(sees(state, PHOTOGRAPHER).includes("detail-jar"));
  assert.equal(viewFor(state, tipJar, PHOTOGRAPHER, new Set()).shots.at(-1)?.hit, "detail-jar");
  assert.equal(spent(), miss, "a hit is free");
  assert.equal(act(state, PHOTOGRAPHER, { type: "shoot", scene: "photo-instagram", ...jar }).ok, false, "already in the darkroom, and free");
  assert.equal(viewFor(state, tipJar, TECH, new Set()).shots.length, 0, "only the Photographer sees their shots");
});

test("phones still on the old page can tap to inspect for one more release", () => {
  let state = roomWith(4);
  state = doo(state, PHOTOGRAPHER, { type: "inspect", scene: "photo-instagram", hotspot: "jar" });
  assert.ok(sees(state, PHOTOGRAPHER).includes("detail-jar"));
});

test("cross-check: the Archivist needs to see both pieces, and misses are remembered", () => {
  let state = proveChapter1(roomWith(4));
  assert.equal(state.chapter, 2);
  state = doo(state, INTERVIEWER, { type: "ask", evidenceId: "question-squarington-left" });
  assert.equal(act(state, ARCHIVIST, { type: "crosscheck", a: "receipts", b: "question-squarington-left" }).ok, false, "can't see the answer yet");

  state = doo(state, INTERVIEWER, { type: "pin", evidenceId: "question-squarington-left" });
  state = doo(state, ARCHIVIST, { type: "crosscheck", a: "receipts", b: "staff-chat" });
  assert.equal(act(state, ARCHIVIST, { type: "crosscheck", a: "staff-chat", b: "receipts" }).ok, false, "same pair, any order");
  state = doo(state, ARCHIVIST, { type: "crosscheck", a: "question-squarington-left", b: "receipts" });
  assert.ok(sees(state, ARCHIVIST).includes("insight-squarington"));
});

test("cross-check: an empty compare costs a little of the night, a real contradiction costs nothing", () => {
  let state = roomWith(4);
  state = proveChapter1(state);
  state = doo(state, INTERVIEWER, { type: "ask", evidenceId: "question-squarington-left" });
  for (const [who, id] of [[INTERVIEWER, "question-squarington-left"], [TECH, "door-log"]]) {
    state = doo(state, who, { type: "pin", evidenceId: id });
  }
  const spent = () => viewFor(state, tipJar, ARCHIVIST, new Set()).deadline!.spent;
  const miss = viewFor(state, tipJar, ARCHIVIST, new Set()).deadline!.costs.miss;
  const before = spent();
  state = doo(state, ARCHIVIST, { type: "crosscheck", a: "receipts", b: "staff-chat" });
  state = doo(state, ARCHIVIST, { type: "crosscheck", a: "receipts", b: "door-log" });
  state = doo(state, ARCHIVIST, { type: "crosscheck", a: "receipts", b: "statement-mo" });
  state = doo(state, ARCHIVIST, { type: "crosscheck", a: "staff-chat", b: "door-log" });
  assert.equal(spent(), before + 4 * miss, "no limit, but every empty compare costs time");
  assert.equal(state.activity.at(-1)?.kind, "clock", "the whole team hears about it");
  state = doo(state, ARCHIVIST, { type: "crosscheck", a: "question-squarington-left", b: "receipts" });
  assert.ok(sees(state, ARCHIVIST).includes("insight-squarington"));
  assert.equal(spent(), before + 4 * miss, "a real contradiction is free");
});

test("show everyone: anything you can see goes onto every phone, once in a while", () => {
  let state = roomWith(4);
  assert.equal(act(state, TECH, { type: "spotlight", evidenceId: "statement-mo" }).ok, false, "only something you can see");
  state = doo(state, TECH, { type: "spotlight", evidenceId: "door-log" });
  const view = viewFor(state, tipJar, PHOTOGRAPHER, new Set());
  assert.equal(view.spotlight?.evidence.id, "door-log", "everyone gets it for the moment");
  assert.ok(!view.evidence.some((e) => e.id === "door-log"), "but it doesn't become theirs");
  assert.equal(act(state, TECH, { type: "spotlight", evidenceId: "door-log" }).ok, false, "not again straight away");
  assert.ok(applyAction(state, tipJar, TECH, { type: "spotlight", evidenceId: "door-log" }, 1 + SPOTLIGHT_GAP_MS, newId).ok);
});

test("show them: the right piece cracks a suspect, the wrong one costs time, and nothing is free twice", () => {
  // The practice case's own crack: Lord Squarington's "half past eight", broken by the receipts.
  const pressed: CaseFile = tipJar;
  assert.deepEqual(checkCase(pressed), []);
  let state = createRoom({ code: "SHOW", caseFile: pressed, host: { id: "p1", token: "t1", name: "Ana" }, mode: "together", now: 0 });
  for (let i = 2; i <= 4; i++) state = must(addPlayer(state, pressed, { id: `p${i}`, token: `t${i}`, name: `Player ${i}` }, 0));
  const run = (who: string, action: Action) => applyAction(state, pressed, who, action, 1, newId);
  const go = (who: string, action: Action) => (state = must(run(who, action)));
  go("p1", { type: "start" });
  for (const p of ["p1", "p2", "p3", "p4"]) go(p, { type: "ready" });
  go(INTERVIEWER, { type: "pin", evidenceId: "statement-mo" });
  go(TECH, { type: "propose", kind: "answer", evidenceId: "statement-mo" });
  for (const p of ["p2", "p3", "p4"]) if (state.proposal) go(p, { type: "vote", proposalId: state.proposal.id, vote: "yes" });
  assert.equal(state.chapter, 2);
  const spent = () => viewFor(state, pressed, INTERVIEWER, new Set()).deadline!.spent;

  go(ARCHIVIST, { type: "pin", evidenceId: "receipts" });
  assert.equal(run(TECH, { type: "show", suspect: "Lord Squarington", evidenceId: "receipts" }).ok, false, "only the Interviewer");
  const early = run(INTERVIEWER, { type: "show", suspect: "Lord Squarington", evidenceId: "receipts" });
  assert.ok(!early.ok && early.error.includes("Ask"), "he hasn't claimed anything yet, and that's free");
  assert.equal(run(INTERVIEWER, { type: "show", suspect: "Lord Squarington", evidenceId: "door-log" }).ok, false, "only things on the board");

  go(INTERVIEWER, { type: "ask", evidenceId: "question-squarington-left" });
  const before = spent();
  go(INTERVIEWER, { type: "show", suspect: "Lord Squarington", evidenceId: "statement-mo" });
  assert.equal(spent(), before + viewFor(state, pressed, INTERVIEWER, new Set()).deadline!.costs.miss, "the wrong piece costs time");
  assert.equal(viewFor(state, pressed, INTERVIEWER, new Set()).shows.at(-1)?.crack, null);

  go(INTERVIEWER, { type: "show", suspect: "Lord Squarington", evidenceId: "receipts" });
  assert.ok(state.found["crack-squarington-tab"], "he cracks");
  assert.equal(state.activity.at(-1)?.kind, "crack");
  assert.equal(viewFor(state, pressed, PHOTOGRAPHER, new Set()).cracks[0]?.text.startsWith("Oh, very well"), true, "every phone hears it");
  assert.ok(viewFor(state, pressed, INTERVIEWER, new Set()).evidence.some((e) => e.id === "crack-squarington-tab" && e.source === "press"));
  assert.equal(spent(), before + viewFor(state, pressed, INTERVIEWER, new Set()).deadline!.costs.miss, "a crack is free");
  assert.equal(run(INTERVIEWER, { type: "show", suspect: "Lord Squarington", evidenceId: "receipts" }).ok, false, "he's already given that up");
});

test("a single wrong checkpoint answer costs the sharp star", () => {
  let state = doo(roomWith(4), TECH, { type: "pin", evidenceId: "door-log" });
  state = agree(state, TECH, { type: "propose", kind: "answer", evidenceId: "door-log" });
  state = proveChapter1(state);
  assert.equal(scoreReport(state, tipJar, { suspectId: "rectangle", motiveId: "debt", evidenceIds: ["cctv-still", "detail-stop-clock"] }).sharp, false);
});

/** Case 001 with four people, jumped straight to chapter 3 with the team having named Rena. */
function interrogationRoom(): RoomState {
  return { ...lastChapter(), interrogation: { claim: 0, broken: [], strikes: 0 }, accusation: { suspectId: "rectangle", motiveId: "rival", evidenceIds: [] } };
}

function lastChapter() {
  let state = createRoom({ code: "INT", caseFile: case001, host: { id: "p1", token: "t1", name: "Ana" }, mode: "together", now: 0 });
  for (let i = 2; i <= 4; i++) state = must(addPlayer(state, case001, { id: `p${i}`, token: `t${i}`, name: `Player ${i}` }, 0));
  state = must(applyAction(state, case001, "p1", { type: "start" }, 0, newId));
  for (let i = 1; i <= 4; i++) state = must(applyAction(state, case001, `p${i}`, { type: "ready" }, 0, newId));
  return { ...state, chapter: 3 };
}
const act001 = (state: RoomState, who: string, action: Action) => applyAction(state, case001, who, action, 1, newId);
const do001 = (state: RoomState, who: string, action: Action) => must(act001(state, who, action));
const room001 = (state: RoomState, who: string) => viewFor(state, case001, who, new Set()).interrogation!;
/** Calls a lie and lets the objection window run out. */
function callAndLand(state: RoomState, who: string, evidenceId: string) {
  state = do001(state, who, { type: "callLie", evidenceId });
  return must(applyAction(state, case001, who, { type: "settleLie", callId: state.interrogation!.call!.id }, 1 + OBJECTION_MS, newId));
}

test("interrogation: only the Interviewer hears the claims and presses on", () => {
  let state = interrogationRoom();
  assert.equal(room001(state, INTERVIEWER).claim, case001.interrogation!.claims[0].text);
  assert.equal(room001(state, TECH).claim, null, "the others have to be told");
  assert.equal(act001(state, TECH, { type: "press", step: 1 }).ok, false);
  state = do001(state, INTERVIEWER, { type: "press", step: -1 });
  assert.equal(room001(state, TECH).index, case001.interrogation!.claims.length - 1, "the story loops round");
  assert.equal(viewFor(lastChapter(), case001, INTERVIEWER, new Set()).interrogation, null, "closed until the team names someone");
});

test("the confrontation only opens for the right person, so reaching it can't give them away", () => {
  const accuse = (suspectId: string) => {
    let state = do001(lastChapter(), TECH, { type: "propose", kind: "final", report: { suspectId, motiveId: "rival", evidenceIds: [] } });
    for (const who of [INTERVIEWER, PHOTOGRAPHER]) state = do001(state, who, { type: "vote", proposalId: state.proposal!.id, vote: "yes" });
    return state;
  };
  const wrong = accuse("circle");
  assert.equal(wrong.phase, "reveal");
  assert.equal(wrong.outcome!.kind, "wrong");
  const right = accuse("rectangle");
  assert.equal(right.phase, "investigation", "naming them doesn't end it");
  assert.equal(room001(right, TECH).suspect, "rectangle");
  assert.equal(act001(right, TECH, { type: "propose", kind: "final", report: { suspectId: "circle", motiveId: "rival", evidenceIds: [] } }).ok, false, "one shot");
});

test("interrogation: presenting the right pinned evidence breaks a lie, anything else is a strike", () => {
  let state = interrogationRoom();
  state = do001(state, INTERVIEWER, { type: "press", step: 1 }); // "I'm a senior engineer at Northgate Capital."
  assert.equal(act001(state, ARCHIVIST, { type: "callLie", evidenceId: "northgate-email" }).ok, false, "it has to be on the board");
  state = do001(state, ARCHIVIST, { type: "pin", evidenceId: "northgate-email" });
  state = callAndLand(state, TECH, "northgate-email");
  assert.deepEqual(room001(state, TECH).broken.map((b) => b.id), ["northgate"]);
  assert.ok(room001(state, TECH).claim, "a broken claim is shown to everyone");
  assert.equal(act001(state, TECH, { type: "callLie", evidenceId: "northgate-email" }).ok, false, "no catching it twice");

  state = do001(state, INTERVIEWER, { type: "press", step: -1 }); // a true claim
  for (let i = 1; i <= 3; i++) state = callAndLand(state, TECH, "northgate-email");
  assert.equal(room001(state, TECH).over, "walkedOut");
  assert.ok(room001(state, TECH).walkout);
  assert.equal(state.phase, "reveal", "a walkout ends the case");
  assert.equal(state.outcome!.kind, "walkedOut");
  assert.deepEqual(state.outcome!.score, { stars: 3, culprit: true, motive: true, evidence: false, sharp: false });
});

test("interrogation: a call waits out the objection window, and the team can stop it", () => {
  let state = do001(interrogationRoom(), INTERVIEWER, { type: "press", step: 1 });
  state = do001(state, ARCHIVIST, { type: "pin", evidenceId: "northgate-email" });
  state = do001(state, TECH, { type: "callLie", evidenceId: "northgate-email" });
  const callId = state.interrogation!.call!.id;
  assert.equal(room001(state, ARCHIVIST).call?.title, "Email from Northgate Capital");
  assert.deepEqual(room001(state, TECH).broken, [], "nothing lands yet");
  assert.equal(act001(state, TECH, { type: "settleLie", callId }).ok, false, "a phone can't cut the window short");
  assert.equal(act001(state, ARCHIVIST, { type: "callLie", evidenceId: "northgate-email" }).ok, false, "one call at a time");
  assert.equal(act001(state, INTERVIEWER, { type: "press", step: 1 }).ok, false, "the story waits");
  assert.equal(act001(state, ARCHIVIST, { type: "unpin", evidenceId: "northgate-email" }).ok, false, "the proof stays up");

  state = do001(state, ARCHIVIST, { type: "object", callId });
  assert.equal(room001(state, TECH).call, null);
  assert.equal(room001(state, TECH).strikes, 0, "an objection costs nothing");
  assert.equal(act001(state, TECH, { type: "settleLie", callId }).ok, false, "a stopped call can't land");
});

test("interrogation: catching every lie solves the case", () => {
  let state = interrogationRoom();
  const claims = case001.interrogation!.claims;
  claims.forEach((claim, i) => {
    if (i > 0) state = do001(state, INTERVIEWER, { type: "press", step: 1 });
    if (!claim.lie) return;
    const proof = claim.lie.breaks[0];
    state = { ...state, found: { ...state.found, [proof]: { by: PHOTOGRAPHER, at: 0 } }, pins: [{ evidenceId: proof, by: PHOTOGRAPHER, at: 0 }] };
    state = callAndLand(state, PHOTOGRAPHER, proof);
  });
  assert.equal(room001(state, TECH).over, "confessed");
  assert.equal(state.outcome!.kind, "solved");
  assert.equal(state.outcome!.score.stars, 5);
});

test("the board holds a limited number of pins", () => {
  let state = roomWith(4);
  state = doo(state, TECH, { type: "pin", evidenceId: "door-log" });
  assert.equal(act(state, TECH, { type: "pin", evidenceId: "door-log" }).ok, false);
  assert.equal(act(state, TECH, { type: "pin", evidenceId: "receipts" }).ok, false, "can't pin what you can't see");
  state = { ...state, pins: Array.from({ length: PIN_LIMIT }, (_, i) => ({ evidenceId: `x${i}`, by: TECH, at: 0 })) };
  assert.equal(act(state, ARCHIVIST, { type: "pin", evidenceId: "receipts" }).ok, false, "board full");
});

test("checkpoints: proof has to be pinned and stays pinned through the vote", () => {
  let state = roomWith(4);
  assert.equal(act(state, TECH, { type: "propose", kind: "answer", evidenceId: "door-log" }).ok, false, "not on the board");
  state = doo(state, TECH, { type: "pin", evidenceId: "door-log" });
  state = doo(state, TECH, { type: "propose", kind: "answer", evidenceId: "door-log" });
  assert.equal(act(state, INTERVIEWER, { type: "unpin", evidenceId: "door-log" }).ok, false);
});

test("checkpoints: weak proof costs, real proof opens the next chapter", () => {
  let state = doo(roomWith(4), TECH, { type: "pin", evidenceId: "door-log" });
  state = agree(state, TECH, { type: "propose", kind: "answer", evidenceId: "door-log" });
  assert.equal(state.chapter, 1);
  assert.equal(state.wrongAnswers, 1);
  state = proveChapter1(state);
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
  state = proveChapter1(state);
  state = doo(state, INTERVIEWER, { type: "ask", evidenceId: "question-squarington-left" });
  state = doo(state, INTERVIEWER, { type: "pin", evidenceId: "question-squarington-left" });
  state = doo(state, ARCHIVIST, { type: "crosscheck", a: "receipts", b: "question-squarington-left" });
  state = doo(state, ARCHIVIST, { type: "pin", evidenceId: "insight-squarington" });
  state = agree(state, ARCHIVIST, { type: "propose", kind: "answer", evidenceId: "insight-squarington" });
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
