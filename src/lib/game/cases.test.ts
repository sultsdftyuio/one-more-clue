// Run with: npm test
// Each case played along its intended route, every role pulling its weight,
// to prove the evidence chain is actually reachable and earns five stars.
import assert from "node:assert/strict";
import { test } from "node:test";
import { case001 } from "../../data/cases/case-001.ts";
import { case002 } from "../../data/cases/case-002.ts";
import { case003 } from "../../data/cases/case-003.ts";
import { case004 } from "../../data/cases/case-004.ts";
import { addPlayer, applyAction, bestSearchHit, createRoom, PIN_LIMIT } from "./engine.ts";
import type { Action, CaseFile, FinalReport, RoomState } from "./types.ts";

// With four players the core roles go round in order:
const TECH = "p1";
const INTERVIEWER = "p2";
const PHOTOGRAPHER = "p3";
const ARCHIVIST = "p4";

let ids = 0;
const newId = () => `id${++ids}`;

/** A small driver for one room: every step must succeed. */
function play(caseFile: CaseFile) {
  let state: RoomState = createRoom({ code: "T", caseFile, host: { id: "p1", token: "t1", name: "A" }, mode: "together", now: 0 });
  const run = (who: string, action: Action) => {
    const result = applyAction(state, caseFile, who, action, 1, newId);
    if (!result.ok) throw new Error(`${who} ${JSON.stringify(action)}: ${result.error}`);
    state = result.state;
  };
  for (const n of [2, 3, 4]) {
    const result = addPlayer(state, caseFile, { id: `p${n}`, token: `t${n}`, name: `P${n}` }, 0);
    if (!result.ok) throw new Error(result.error);
    state = result.state;
  }
  run("p1", { type: "start" });
  ["p1", "p2", "p3", "p4"].forEach((p) => run(p, { type: "ready" }));

  const found = (id: string) => assert.ok(state.found[id], `expected to find "${id}"`);
  return {
    get state() {
      return state;
    },
    search(query: string, expect: string) {
      run(TECH, { type: "search", query });
      found(expect);
    },
    ask: (id: string) => run(INTERVIEWER, { type: "ask", evidenceId: id }),
    inspect(scene: string, hotspot: string) {
      run(PHOTOGRAPHER, { type: "inspect", scene, hotspot });
    },
    crosscheck(a: string, b: string, expect: string) {
      run(ARCHIVIST, { type: "crosscheck", a, b });
      found(expect);
    },
    /** Pins, taking down the oldest pin first if the board is full. */
    pin(who: string, id: string) {
      if (state.pins.some((p) => p.evidenceId === id)) return;
      if (state.pins.length >= PIN_LIMIT) run(state.pins[0].by, { type: "unpin", evidenceId: state.pins[0].evidenceId });
      run(who, { type: "pin", evidenceId: id });
    },
    /** Everyone agrees to a proposal. */
    agree(action: Action) {
      run("p1", action);
      ["p2", "p3", "p4"].forEach((p) => state.proposal && run(p, { type: "vote", proposalId: state.proposal.id, vote: "yes" }));
    },
    answer(optionId: string) {
      const chapter = state.chapter;
      this.agree({ type: "propose", kind: "answer", optionId });
      assert.equal(state.chapter, chapter + 1, `"${optionId}" should open chapter ${chapter + 1}`);
    },
    report(report: FinalReport) {
      this.agree({ type: "propose", kind: "final", report });
      assert.equal(state.phase, "reveal");
      assert.deepEqual(state.outcome?.score, { stars: 5, culprit: true, motive: true, evidence: true, sharp: true });
    },
  };
}

test("Case 001: The Last Message is solvable for five stars", () => {
  const g = play(case001);
  g.inspect("photo-linkedin", "halo");
  g.pin(PHOTOGRAPHER, "detail-halo");
  g.crosscheck("lab-chat", "detail-halo", "insight-message");
  g.answer("after");

  g.ask("question-squires-left");
  g.ask("question-ozzy-round");
  g.ask("question-rena-after");
  g.pin(INTERVIEWER, "question-squires-left");
  g.pin(INTERVIEWER, "question-ozzy-round");
  g.pin(INTERVIEWER, "question-rena-after");
  g.crosscheck("question-squires-left", "question-ozzy-round", "insight-together");
  g.pin(TECH, "badge-log");
  g.crosscheck("visitor-sheet", "badge-log", "insight-sheet");
  g.answer("early");

  g.search("KX24 RVS", "anpr");
  g.pin(TECH, "anpr");
  g.crosscheck("question-rena-after", "anpr", "insight-home");
  g.search("Kestrel", "kestrel-staff");
  g.pin(TECH, "kestrel-staff");
  g.ask("question-rena-employer");
  g.pin(INTERVIEWER, "question-rena-employer");
  g.crosscheck("question-rena-employer", "kestrel-staff", "insight-employer");
  g.inspect("cctv-lobby", "lanyard");
  g.pin(ARCHIVIST, "insight-home");
  g.pin(ARCHIVIST, "insight-employer");
  g.report({ suspectId: "rectangle", motiveId: "rival", evidenceIds: ["insight-home", "insight-employer"] });
});

test("Case 002: Dead Air is solvable for five stars", () => {
  const g = play(case002);
  g.inspect("photo-booth", "rack");
  g.pin(PHOTOGRAPHER, "detail-rack");
  g.pin(INTERVIEWER, "statement-vince");
  g.crosscheck("statement-vince", "detail-rack", "insight-cables");
  g.answer("fader");

  g.search("Studio A door", "door-log");
  g.pin(TECH, "door-log");
  g.crosscheck("statement-vince", "door-log", "insight-nobody");
  g.search("Darla", "darla-phone");
  g.search("fire door", "fire-door");
  g.inspect("photo-greenroom", "bag");
  g.answer("nobody");

  // The planted balaclava: bought with Vince's own card.
  g.search("balaclava", "balaclava-receipt");
  g.pin(TECH, "balaclava-receipt");
  g.pin(PHOTOGRAPHER, "detail-balaclava");
  g.crosscheck("detail-balaclava", "balaclava-receipt", "insight-planted");
  g.ask("question-darla-why");
  g.search("SpinKings", "spinkings");
  g.pin(TECH, "spinkings");
  g.inspect("cctv-carpark", "envelope");
  g.pin(PHOTOGRAPHER, "detail-envelope");
  g.ask("question-vince-envelope");
  g.pin(INTERVIEWER, "question-vince-envelope");
  g.crosscheck("question-vince-envelope", "detail-envelope", "insight-envelope");
  g.pin(ARCHIVIST, "insight-envelope");
  g.report({ suspectId: "square", motiveId: "debt", evidenceIds: ["spinkings", "insight-envelope"] });
});

test("Case 003: The Last Course is solvable for five stars", () => {
  const g = play(case003);
  g.pin(INTERVIEWER, "statement-amelie");
  g.crosscheck("statement-amelie", "paramedic-note", "insight-nutfree");
  g.answer("peanut");

  g.inspect("photo-table1", "plate");
  g.pin(PHOTOGRAPHER, "detail-plate-gold");
  g.crosscheck("detail-plate-gold", "house-rules", "insight-gold");
  g.inspect("pass-camera", "olu"); // a later frame of the footage
  g.inspect("pass-camera", "gone");
  g.ask("question-olu-swap");
  g.answer("owner");

  g.crosscheck("insight-gold", "staff-medical", "insight-target");
  g.answer("square");

  g.ask("question-olu-storeroom");
  g.search("peanut oil", "storeroom-log");
  g.pin(TECH, "storeroom-log");
  g.ask("question-ruth-nuts");
  g.pin(INTERVIEWER, "question-ruth-nuts");
  g.crosscheck("question-ruth-nuts", "storeroom-log", "insight-oil");
  g.search("Gastro Group", "sale-email");
  g.pin(TECH, "sale-email");
  g.pin(ARCHIVIST, "insight-oil");
  g.report({ suspectId: "rectangle", motiveId: "revenge", evidenceIds: ["insight-oil", "sale-email"] });
});

test("Case 004: Snowed In is solvable for five stars", () => {
  const g = play(case004);
  g.ask("question-otto-power");
  g.pin(INTERVIEWER, "question-otto-power");
  g.search("power company", "grid-report");
  g.pin(TECH, "grid-report");
  g.crosscheck("question-otto-power", "grid-report", "insight-storm");
  g.answer("breaker");

  g.search("breaker room", "door-log");
  g.pin(TECH, "door-log");
  g.crosscheck("door-log", "front-desk", "insight-stolen-card");
  g.inspect("video-still", "chair");
  g.inspect("video-still", "back"); // the last frame: snow on his slippers
  g.answer("rectangle");

  g.ask("question-lily-snowman");
  g.inspect("photo-garden", "holes");
  g.pin(PHOTOGRAPHER, "detail-holes");
  g.ask("question-otto-cane");
  g.pin(INTERVIEWER, "question-otto-cane");
  g.crosscheck("question-otto-cane", "detail-holes", "insight-cane");
  g.search("bank", "bank-letter");
  g.pin(TECH, "bank-letter");
  g.pin(ARCHIVIST, "insight-cane");
  g.report({ suspectId: "circle", motiveId: "bank", evidenceIds: ["insight-cane", "bank-letter"] });
});

test("search prefers the most specific match", () => {
  assert.equal(bestSearchHit(case002, 2, "studioadoor")?.id, "door-log");
  assert.equal(bestSearchHit(case002, 2, "blind")?.id, "booth-log");
  assert.equal(bestSearchHit(case004, 3, "otto")?.id, "bank-letter");
});
