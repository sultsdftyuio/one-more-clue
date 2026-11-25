// Run with: npm test
// Each case played along its intended route, every role pulling its weight,
// to prove the evidence chain is actually reachable and earns five stars.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { case001 } from "../../data/cases/case-001.ts";
import { case002 } from "../../data/cases/case-002.ts";
import { case003 } from "../../data/cases/case-003.ts";
import { case004 } from "../../data/cases/case-004.ts";
import { framedHotspot, shotOf } from "./camera.ts";
import { linesOf } from "./lines.ts";
import { costMinutes, nightMinutes, parseTime } from "./clock.ts";
import { addPlayer, applyAction, bestChain, bestSearchHit, createRoom, mapFor, normalizeTerm, OBJECTION_MS, PIN_LIMIT, searchNote, viewFor } from "./engine.ts";
import type { Action, CaseFile, CaseWorld, FinalReport, RoomState } from "./types.ts";
import { checkWorld } from "./world.ts";
import { worldOf } from "../world/plates.ts";

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
    /** What a player sees right now. */
    view: (who: string) => viewFor(state, caseFile, who, new Set()),
    /** Attempts something without insisting it works. */
    attempt(who: string, action: Action) {
      const result = applyAction(state, caseFile, who, action, 1, newId);
      if (result.ok) state = result.state;
      return result.ok;
    },
    /** Searches; a locked record is then opened with the password a teammate holds. */
    search(query: string, expect: string) {
      run(TECH, { type: "search", query });
      const lock = caseFile.evidence.find((e) => e.id === expect)?.lock;
      if (lock) {
        assert.ok(state.locked?.[expect], `"${expect}" should turn up locked`);
        assert.ok(!state.found[expect], `"${expect}" shouldn't open before its password`);
        run(TECH, { type: "unlock", evidenceId: expect, password: lock.answers[0] });
      }
      found(expect);
    },
    ask: (id: string) => run(INTERVIEWER, { type: "ask", evidenceId: id }),
    /** The Photographer frames the clue and shoots. */
    inspect(scene: string, hotspot: string) {
      const picture = caseFile.evidence.find((e) => e.id === scene)!;
      const shot = shotOf(picture.body, hotspot);
      assert.ok(shot, `"${scene}" has no "${hotspot}" to photograph`);
      run(PHOTOGRAPHER, { type: "shoot", scene, ...shot });
      const detail = caseFile.evidence.find((e) => e.access.kind === "inspect" && e.access.scene === scene && e.access.hotspot === hotspot)!;
      found(detail.id);
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
    /** Pins the proof if it isn't up yet, then presents it to the checkpoint. */
    answer(evidenceId: string) {
      const chapter = state.chapter;
      const holder = ["p1", "p2", "p3", "p4"].find((p) => viewFor(state, caseFile, p, new Set()).evidence.some((e) => e.id === evidenceId));
      assert.ok(holder, `nobody can see "${evidenceId}"`);
      this.pin(holder, evidenceId);
      this.agree({ type: "propose", kind: "answer", evidenceId });
      assert.equal(state.chapter, chapter + 1, `"${evidenceId}" should open chapter ${chapter + 1}`);
    },
    /** Walks the accused's story, breaking every lie with something the team can actually see. */
    confront() {
      const canSee = (id: string) => ["p1", "p2", "p3", "p4"].find((p) => viewFor(state, caseFile, p, new Set()).evidence.some((e) => e.id === id));
      caseFile.interrogation!.claims.forEach((claim, i) => {
        if (i > 0) run(INTERVIEWER, { type: "press", step: 1 });
        if (!claim.lie) return;
        const proof = claim.lie.breaks.find(canSee);
        assert.ok(proof, `nothing the team found breaks "${claim.id}"`);
        this.pin(canSee(proof)!, proof);
        run(canSee(proof)!, { type: "callLie", evidenceId: proof });
        const callId = state.interrogation!.call!.id;
        const landed = applyAction(state, caseFile, INTERVIEWER, { type: "settleLie", callId }, 1 + OBJECTION_MS, newId);
        if (!landed.ok) throw new Error(landed.error);
        state = landed.state;
      });
    },
    report(report: FinalReport) {
      this.agree({ type: "propose", kind: "final", report });
      if (caseFile.interrogation) this.confront();
      assert.equal(state.phase, "reveal");
      assert.deepEqual(state.outcome?.score, { stars: 5, culprit: true, motive: true, evidence: true, sharp: true });
      const clock = viewFor(state, caseFile, TECH, new Set()).deadline;
      if (clock) assert.ok(clock.left > clock.night / 2, `a sharp team finishes with most of the night left (${clock.left} of ${clock.night} min)`);
    },
  };
}

test("Case 001: The Last Message is solvable for five stars", () => {
  const g = play(case001);
  g.inspect("photo-linkedin", "halo");
  g.pin(PHOTOGRAPHER, "detail-halo");
  g.crosscheck("lab-chat", "detail-halo", "insight-message");
  // The Tech's own route: the register mentions the dock, and the dock says HALO never left.
  g.search("HALO", "asset-register");
  g.search("battery", "dock-log");
  g.pin(TECH, "dock-log");
  g.crosscheck("lab-chat", "dock-log", "insight-dock");
  g.answer("insight-dock");

  g.ask("question-squires-left");
  g.search("Ozzy's patrol", "guard-tour");
  g.ask("question-ozzy-round");
  g.inspect("photo-incident", "clip");
  g.ask("question-rena-after");
  g.pin(INTERVIEWER, "question-squires-left");
  g.pin(INTERVIEWER, "question-ozzy-round");
  g.pin(INTERVIEWER, "question-rena-after");
  g.crosscheck("question-squires-left", "question-ozzy-round", "insight-together");
  g.pin(TECH, "badge-log");
  g.crosscheck("visitor-sheet", "badge-log", "insight-sheet");
  g.answer("insight-sheet");

  g.search("KX24 RVS", "anpr");
  g.pin(TECH, "anpr");
  g.crosscheck("question-rena-after", "anpr", "insight-home");
  g.search("lobby camera", "cctv-lobby");
  g.pin(TECH, "cctv-lobby");
  g.inspect("cctv-lobby", "lanyard");
  g.search("Kestrel", "kestrel-staff");
  g.pin(TECH, "kestrel-staff");
  g.ask("question-rena-employer");
  g.pin(INTERVIEWER, "question-rena-employer");
  g.crosscheck("question-rena-employer", "kestrel-staff", "insight-employer");
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
  // The Tech's own route: Vince's statement names the rack.
  g.search("rack", "rack-monitor");
  g.answer("rack-monitor");

  g.inspect("photo-corridor", "keypad");
  g.search("Studio A door", "door-log");
  g.pin(TECH, "door-log");
  g.crosscheck("statement-vince", "door-log", "insight-nobody");
  g.inspect("photo-greenroom", "phone");
  g.ask("question-darla-where");
  g.search("Darla", "darla-phone");
  g.search("fire door", "fire-door");
  g.inspect("photo-greenroom", "bag");
  g.answer("insight-nobody");

  // The planted balaclava: bought with Vince's own card.
  g.search("balaclava", "balaclava-receipt");
  g.pin(TECH, "balaclava-receipt");
  g.pin(PHOTOGRAPHER, "detail-balaclava");
  g.crosscheck("detail-balaclava", "balaclava-receipt", "insight-planted");
  g.ask("question-darla-why");
  g.search("SpinKings", "spinkings");
  g.pin(TECH, "spinkings");
  g.search("car park camera", "cctv-carpark");
  g.pin(TECH, "cctv-carpark");
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
  g.inspect("photo-table1", "card");
  g.pin(PHOTOGRAPHER, "detail-menu");
  g.crosscheck("detail-menu", "paramedic-note", "insight-nutfree");
  g.search("allergen sheet", "allergen-sheet");
  g.pin(TECH, "allergen-sheet");
  g.crosscheck("allergen-sheet", "paramedic-note", "insight-allergens");
  g.answer("insight-allergens");

  g.inspect("photo-table1", "plate");
  g.pin(PHOTOGRAPHER, "detail-plate-gold");
  g.crosscheck("detail-plate-gold", "house-rules", "insight-gold");
  g.inspect("pass-camera", "olu"); // a later frame of the footage
  g.search("runner", "pass-log");
  g.ask("question-jo-plate");
  g.inspect("pass-camera", "gone");
  g.ask("question-olu-swap");
  g.answer("insight-gold");

  g.inspect("photo-table9", "bracelet");
  g.pin(PHOTOGRAPHER, "detail-bracelet");
  g.crosscheck("insight-gold", "detail-bracelet", "insight-target");
  g.search("first aid book", "first-aid");
  g.answer("first-aid");

  g.inspect("photo-pastry", "bottle");
  g.search("peanut oil", "storeroom-log");
  g.ask("question-olu-storeroom");
  g.pin(TECH, "storeroom-log");
  g.ask("question-ruth-nuts");
  g.pin(INTERVIEWER, "question-ruth-nuts");
  g.crosscheck("question-ruth-nuts", "storeroom-log", "insight-oil");
  g.inspect("photo-pastry", "note");
  g.search("Gastro Group", "sale-email");
  g.pin(TECH, "sale-email");
  g.pin(ARCHIVIST, "insight-oil");
  g.report({ suspectId: "rectangle", motiveId: "revenge", evidenceIds: ["insight-oil", "sale-email"] });
});

test("Case 004: Snowed In is solvable for five stars", () => {
  const g = play(case004);
  g.search("display case", "case-alarm");
  g.ask("question-otto-power");
  g.pin(INTERVIEWER, "question-otto-power");
  g.search("power company", "grid-report");
  g.pin(TECH, "grid-report");
  g.crosscheck("question-otto-power", "grid-report", "insight-storm");
  g.answer("insight-storm");

  g.search("breaker room", "door-log");
  g.pin(TECH, "door-log");
  g.crosscheck("door-log", "front-desk", "insight-stolen-card");
  g.inspect("video-still", "chair");
  g.ask("question-lily-missing");
  g.search("boiler", "boiler-log");
  g.pin(TECH, "boiler-log");
  g.pin(INTERVIEWER, "question-lily-missing");
  g.crosscheck("question-lily-missing", "boiler-log", "insight-boiler");
  g.inspect("video-still", "back"); // the last frame: snow on his slippers
  g.answer("insight-stolen-card");

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

test("a clue chain opens a step at a time, says who to ask, and doesn't charge for following it", () => {
  const g = play(case004);
  assert.ok(g.attempt(TECH, { type: "search", query: "storm" }));
  assert.equal(g.state.found["grid-report"], undefined, "no record yet: nobody has blamed the storm");
  assert.deepEqual(g.view(TECH).leads, []);

  g.ask("question-otto-power");
  assert.deepEqual(g.view(TECH).leads.map((l) => [l.title, l.by]), [["Otto: the power", INTERVIEWER]], "it says who to ask, not what to search");
  assert.deepEqual(g.view(PHOTOGRAPHER).leads, [], "only the role it opens for");
  assert.ok(g.state.activity.some((a) => a.kind === "lead" && a.text.includes("the Tech")), "the whole team hears about it");
  g.search("storm", "grid-report");
  assert.deepEqual(g.view(TECH).leads, [], "a lead followed is a lead gone");

  assert.ok(!g.view(INTERVIEWER).questions!.some((q) => q.id === "question-reginald-key"), "locked questions don't show");
  const used = g.state.questionsUsed;
  g.search("display case", "case-alarm");
  assert.equal(g.view(INTERVIEWER).questions!.find((q) => q.id === "question-reginald-key")?.lead, true);
  g.ask("question-reginald-key");
  assert.equal(g.state.questionsUsed, used, "following a lead is free");
});

test("every checkpoint can be proved, and proof that misses costs time", () => {
  const g = play(case001);
  assert.equal(g.attempt(TECH, { type: "propose", kind: "answer", evidenceId: "badge-log" }), false, "it has to be on the board");
  g.pin(TECH, "badge-log");
  g.agree({ type: "propose", kind: "answer", evidenceId: "badge-log" });
  assert.equal(g.state.chapter, 1, "true, but it doesn't break the message");
  assert.equal(g.state.wrongAnswers, 1);
  g.inspect("photo-linkedin", "halo");
  g.answer("detail-halo");
  assert.equal(g.state.chapter, 2);
});

test("the reveal credits the team's best chain of finds, across players", () => {
  const g = play(case004);
  g.ask("question-otto-power");
  g.search("power company", "grid-report");
  assert.deepEqual(bestChain(g.state, case004).map((s) => [s.id, s.by]), [["question-otto-power", INTERVIEWER], ["grid-report", TECH]]);
  assert.deepEqual(g.view(TECH).chain, [], "only shown once the case is over");
});

test("every case has chains that cross roles, in both directions", () => {
  for (const c of [case001, case002, case003, case004]) {
    const roleOf = (id: string) => c.evidence.find((e) => e.id === id)!.role;
    const crossing = c.evidence.filter((e) => e.after?.some((id) => roleOf(id) !== e.role));
    assert.ok(crossing.length >= 8, `${c.id} has only ${crossing.length} cross-role links`);
    const tech = c.roles.find((r) => r.ability === "search")!.id;
    assert.ok(crossing.some((e) => e.role === tech), `${c.id}: the Tech never follows a lead`);
    assert.ok(crossing.some((e) => e.after!.some((id) => roleOf(id) === tech)), `${c.id}: the Tech never starts one`);
  }
});

test("no motive gives itself away by its length", () => {
  for (const c of [case001, case002, case003, case004]) {
    const length = (id: string) => c.solution.motives.find((m) => m.id === id)!.label.length;
    const all = c.solution.motives.map((m) => m.label.length);
    const wrong = c.solution.motives.filter((m) => m.id !== c.solution.motive).map((m) => m.label.length);
    // Players learn fast that the careful, specific answer is the long one, and that a short one is a joke.
    assert.ok(length(c.solution.motive) <= Math.max(...wrong) + 3, `${c.id}: the right motive is the longest`);
    assert.ok(Math.min(...all) >= Math.max(...all) * 0.75, `${c.id}: one motive is much shorter than the rest`);
  }
});

test("the night is tuned: a careless team runs out, a decent one doesn't", () => {
  for (const c of [case001, case002, case003, case004]) {
    const d = c.deadline!;
    assert.ok(d, `${c.id} needs a story clock`);
    const open = c.evidence.filter((e) => e.access.kind === "interview" && !e.after).length;
    const spent = (wrong: number, misses: number) => wrong * costMinutes(d, "wrong") + misses * costMinutes(d, "miss") + open * costMinutes(d, "question");
    assert.ok(spent(3, 10) >= nightMinutes(d), `${c.id}: three wrong answers, ten misses and every question should run the night out`);
    assert.ok(spent(2, 5) < nightMinutes(d), `${c.id}: two wrong answers and a few misses shouldn't end it`);
  }
});

test("every case has one locked file, and its password reads however it's typed", () => {
  for (const c of [case001, case002, case003, case004]) {
    const locked = c.evidence.filter((e) => e.lock);
    assert.equal(locked.length, 1, `${c.id} should have exactly one locked file`);
    const [answer] = locked[0].lock!.answers;
    // Capitals, dashes and spaces don't matter: "S-42", "s42" and "S 42" are one password.
    for (const typed of [answer.toLowerCase(), answer.toUpperCase(), answer.replace(/[-\s]/g, ""), ` ${answer.replace(/-/g, " ")} `]) {
      assert.equal(normalizeTerm(typed), normalizeTerm(answer), `${c.id}: "${typed}" should open ${locked[0].id}`);
    }
  }
});

test("the camera can catch every clue in every case, and each frame catches the clue it's aimed at", () => {
  for (const c of [case001, case002, case003, case004]) {
    for (const e of c.evidence) {
      if (e.access.kind !== "inspect") continue;
      const picture = c.evidence.find((p) => p.id === (e.access as { scene: string }).scene)!;
      const hotspot = e.access.hotspot;
      const shot = shotOf(picture.body, hotspot);
      assert.ok(shot, `${c.id}: no "${hotspot}" in "${picture.id}"`);
      const items = picture.body.type === "scene" ? picture.body.items : picture.body.type === "footage" ? picture.body.frames[shot.at!].items : [];
      assert.equal(framedHotspot(items, shot.frame), hotspot, `${c.id}: a frame on "${hotspot}" in "${picture.id}" catches something else`);
      assert.ok(100 / shot.frame.w <= 5.001, `${c.id}: "${hotspot}" needs more zoom than the lens has`);
    }
  }
});

test("every crack in every case cracks when someone shows them what breaks it", () => {
  for (const c of [case001, case002, case003, case004]) {
    for (const e of c.evidence) {
      if (e.access.kind !== "press") continue;
      const a = e.access;
      let state = createRoom({ code: "CRACK", caseFile: c, host: { id: "p1", token: "t1", name: "A" }, mode: "together", now: 0 });
      for (const n of [2, 3, 4]) {
        const joined = addPlayer(state, c, { id: `p${n}`, token: `t${n}`, name: `P${n}` }, 0);
        if (!joined.ok) throw new Error(joined.error);
        state = joined.state;
      }
      for (const [who, action] of [["p1", { type: "start" }], ["p1", { type: "ready" }], ["p2", { type: "ready" }], ["p3", { type: "ready" }], ["p4", { type: "ready" }]] as const) {
        const result = applyAction(state, c, who, action as Action, 0, newId);
        if (!result.ok) throw new Error(result.error);
        state = result.state;
      }
      // The moment it's written for: its chapter, the claim made, one breaker on the board, the suspect's other cracks used up.
      state.chapter = e.chapter;
      const claim = c.evidence.find((x) => x.id === a.against)!;
      if (claim.access.kind !== "desk") state.found[claim.id] = { by: INTERVIEWER, at: 0 };
      for (const id of [...(e.after ?? []), ...(e.afterAny ?? []).slice(0, 1)]) state.found[id] = { by: TECH, at: 0 };
      for (const other of c.evidence) {
        if (other !== e && other.access.kind === "press" && other.access.suspect === a.suspect) state.found[other.id] = { by: INTERVIEWER, at: 0 };
      }
      const breaker = c.evidence.find((x) => a.breaks.includes(x.id) && x.chapter <= e.chapter)!;
      if (breaker.access.kind !== "desk") state.found[breaker.id] = { by: TECH, at: 0 };
      state.pins = [{ evidenceId: breaker.id, by: TECH, at: 0 }];
      const result = applyAction(state, c, INTERVIEWER, { type: "show", suspect: a.suspect, evidenceId: breaker.id }, 1, newId);
      assert.ok(result.ok, `${c.id}: showing "${breaker.id}" to ${a.suspect}: ${result.ok ? "" : result.error}`);
      assert.ok(result.state.found[e.id], `${c.id}: "${e.id}" should crack`);
    }
  }
});

test("search prefers the most specific match", () => {
  assert.equal(bestSearchHit(case002, 2, "studioadoor")?.id, "door-log");
  assert.equal(bestSearchHit(case002, 2, "blind")?.id, "booth-log");
  assert.equal(bestSearchHit(case004, 3, "otto")?.id, "bank-letter");
});

test("a search that finds nothing can point the Tech at a teammate, but a real record always wins", () => {
  const g = play(case001);
  g.attempt(TECH, { type: "search", query: "Rena Voss" });
  const miss = g.view(TECH).searches.at(-1)!;
  assert.equal(miss.hit, false);
  assert.match(miss.note ?? "", /security desk/);
  // Everyone sees the pointer, so the team can talk about it.
  assert.equal(g.view(ARCHIVIST).searches.at(-1)?.note, miss.note);
  // Camera footage isn't in until chapter 3: chapter 1 gets a note, chapter 3 gets the camera.
  assert.match(searchNote(case001, "lobbycamera") ?? "", /footage/);
  assert.equal(bestSearchHit(case001, 1, "lobbycamera"), undefined);
  assert.equal(bestSearchHit(case001, 3, "lobbycamera")?.id, "cctv-lobby");
  g.attempt(TECH, { type: "search", query: "zebra crossing" });
  assert.equal(g.view(TECH).searches.at(-1)?.note, undefined);
});

test("every opening film a case names is in public/", () => {
  for (const c of [case001, case002, case003, case004]) {
    for (const file of [c.cinematic?.video, c.cinematic?.poster]) {
      if (file) assert.ok(existsSync(new URL(`../../../public${file}`, import.meta.url)), `${c.id}: ${file} is missing`);
    }
  }
});

test("every case suspect has their own character, drawn in all five moods", () => {
  const looks = new Set<string>();
  for (const c of [case001, case002, case003, case004]) {
    for (const s of c.suspects) {
      assert.ok(s.look, `${c.id}: ${s.name} has no look of their own`);
      assert.ok(!looks.has(s.look!), `${c.id}: ${s.name} shares a look with someone in another case`);
      looks.add(s.look!);
      for (const mood of ["idle", "nervous", "smug", "shocked", "cracked"]) {
        assert.ok(existsSync(`src/assets/art/cast/${s.look}-${mood}.webp`), `${s.name} has no ${mood} drawing`);
      }
    }
  }
});

test("a contradiction's quotes are the pieces' own words, and a side without words is a picture", () => {
  for (const c of [case001, case002, case003, case004]) {
    for (const e of c.evidence) {
      if (e.access.kind !== "crosscheck" || !e.access.quotes) continue;
      e.access.quotes.forEach((quote, i) => {
        const side = c.evidence.find((x) => x.id === (e.access as { pair: [string, string] }).pair[i])!;
        if (quote === null) {
          const picture = side.access.kind === "inspect" || side.body.type === "scene" || side.body.type === "footage";
          assert.ok(picture, `${c.id} ${e.id}: ${side.id} has no quote and no picture to show`);
        } else {
          assert.ok(linesOf(side.body).join(" ").includes(quote), `${c.id} ${e.id}: "${quote}" isn't in ${side.id}`);
        }
      });
    }
  }
});

test("Case 001 is picture-led: every contradiction quotes its pieces, and every find carries its own close-up", () => {
  const matches = case001.evidence.filter((e) => e.access.kind === "crosscheck");
  for (const e of matches) assert.ok(e.access.kind === "crosscheck" && e.access.quotes, `${e.id} has no quotes`);
  // Everyone can see everything at the reveal, so every find's close-up and every slip's sides are there.
  const room = play(case001);
  const view = viewFor({ ...room.state, phase: "reveal" }, case001, ARCHIVIST, new Set());
  for (const e of view.evidence.filter((x) => x.source === "inspect")) {
    assert.ok(e.crop, `${e.id} has no close-up`);
    assert.equal(e.crop!.scene.type === "scene" && e.crop!.scene.items.length, 1, `${e.id}'s close-up gives away more than its own spot`);
  }
  for (const e of view.evidence.filter((x) => x.source === "crosscheck")) assert.equal(e.sides?.length, 2, `${e.id} doesn't show both pieces`);
});

test("a checkpoint's replay plays pieces that exist by then, in order, in their own words or their picture", () => {
  for (const c of [case001, case002, case003, case004]) {
    c.chapters.forEach((chapter, i) => {
      const replay = chapter.checkpoint?.replay;
      if (!replay) return;
      assert.ok(replay.moments.length >= 2, `${c.id} chapter ${i + 1}: a replay needs at least two moments`);
      if (replay.say) assert.ok(replay.say.length <= 170, `${c.id} chapter ${i + 1}: the closing line is too long`);
      let last: number | null = null;
      for (const m of replay.moments) {
        const piece = c.evidence.find((e) => e.id === m.evidence);
        assert.ok(piece, `${c.id} chapter ${i + 1}: "${m.evidence}" isn't a piece of evidence`);
        assert.ok(piece!.chapter <= i + 1, `${c.id} chapter ${i + 1}: "${m.evidence}" doesn't exist until chapter ${piece!.chapter}`);
        if (m.quote) assert.ok(linesOf(piece!.body).join(" ").includes(m.quote), `${c.id} chapter ${i + 1}: "${m.quote}" isn't in ${m.evidence}`);
        else assert.ok(piece!.access.kind === "inspect" || piece!.body.type === "scene" || piece!.body.type === "footage", `${c.id} chapter ${i + 1}: ${m.evidence} has no quote and no picture`);
        const at = parseTime(m.at);
        // A night can run past midnight, so "later" means less than half a day on.
        if (last !== null) assert.ok((at - last + 1440) % 1440 < 720, `${c.id} chapter ${i + 1}: ${m.at} comes before the moment above it`);
        last = at;
      }
    });
  }
});

test("Case 001's first proof plays back as the night: credited to whoever turned each piece up, the proof stamped", () => {
  const g = play(case001);
  g.inspect("photo-linkedin", "halo");
  g.search("HALO", "asset-register");
  g.search("battery", "dock-log");
  g.pin(TECH, "dock-log");
  g.crosscheck("lab-chat", "dock-log", "insight-dock");
  g.answer("insight-dock");
  const replay = g.view(INTERVIEWER).solved[0].replay!;
  assert.deepEqual(replay.moments.map((m) => m.at), ["8:40 PM", "8:45 PM", "8:58 PM", "9:12 PM", "9:13 PM"]);
  const moment = (id: string) => replay.moments.find((m) => m.id === id)!;
  assert.equal(moment("lab-chat").holder, ARCHIVIST, "the chat came from the Archivist's desk");
  assert.equal(moment("badge-log").holder, TECH);
  assert.equal(moment("detail-halo").foundBy, PHOTOGRAPHER);
  assert.ok(moment("detail-halo").crop, "a photo find plays as its picture");
  assert.equal(moment("dock-log").foundBy, TECH);
  assert.ok(!moment("device-log").foundBy && !moment("device-log").holder, "nobody turned up the laptop log on this route");
  // The team presented the contradiction between the chat and the dock, so both of its sides are stamped.
  assert.deepEqual(replay.moments.filter((m) => m.proof).map((m) => m.id), ["lab-chat", "dock-log"]);
  assert.deepEqual(replay.proof, { id: "insight-dock", title: "It never left", by: "p1" });
  assert.equal(replay.say, "Priya was gone. HALO wasn't.");
});

test("a case's map of the night only names rooms, people, things and pieces it has, inside its night", () => {
  for (const c of [case001, case002, case003, case004]) {
    const map = c.nightMap;
    if (!map) continue;
    const rooms = new Set(map.rooms.map((r) => r.id));
    const who = new Set([...c.suspects.map((s) => s.id), ...(map.things ?? []).map((t) => t.id)]);
    const start = parseTime(map.from);
    const minute = (t: string) => (parseTime(t) - start + 1440) % 1440;
    const span = minute(map.to);
    for (const r of map.rooms) assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.w <= 100 && r.y + r.h <= map.height, `${c.id}: ${r.id} spills off the plan`);
    for (const s of map.sightings) {
      const where = `${c.id} map: ${s.evidence} puts ${s.who} in ${s.room}`;
      assert.ok(c.evidence.some((e) => e.id === s.evidence), `${where}, but there's no such piece`);
      assert.ok(rooms.has(s.room), `${where}, but there's no such room`);
      assert.ok(who.has(s.who), `${where}, but there's no such person or thing`);
      assert.ok(minute(s.at) <= span && (!s.until || (minute(s.until) <= span && minute(s.until) >= minute(s.at))), `${where} outside the night`);
    }
  }
});

test("Case 001's map shows exactly its contradictions about place, and tying one catches it", () => {
  const room = play(case001);
  const everything = { ...room.state, phase: "reveal" as const, chapter: 3 };
  const map = mapFor(everything, case001, { id: ARCHIVIST, roles: ["archivist"] })!;
  const pairs = new Set(map.clashes.map((c) => `${c.a}+${c.b}`));
  assert.deepEqual([...pairs].sort(), ["lab-chat+detail-halo", "lab-chat+dock-log", "question-rena-after+anpr", "question-squires-left+question-ozzy-round", "visitor-sheet+badge-log"]);
  for (const c of map.clashes) {
    const crosscheck = case001.evidence.find((e) => e.access.kind === "crosscheck" && e.access.pair[0] === c.a && e.access.pair[1] === c.b);
    assert.ok(crosscheck, `${c.a} and ${c.b} clash on the map but aren't a contradiction the Archivist can tie`);
  }

  // At the start the Archivist only has the lab chat: HALO "taken home", and nothing to clash with yet.
  const early = room.view(ARCHIVIST).nightMap!;
  assert.deepEqual(early.sightings.map((s) => s.evidence), ["lab-chat"]);
  assert.equal(early.clashes.length, 0);
  // Once the photo of HALO is pinned, HALO is in two places at once, and tying the clash catches the lie.
  room.inspect("photo-linkedin", "halo");
  room.pin(PHOTOGRAPHER, "detail-halo");
  const clash = room.view(ARCHIVIST).nightMap!.clashes[0];
  assert.deepEqual([clash.a, clash.b, clash.who, clash.caught], ["lab-chat", "detail-halo", "halo", false]);
  room.crosscheck(clash.a, clash.b, "insight-message");
  assert.equal(room.view(ARCHIVIST).nightMap!.clashes[0].caught, true);
  // The map is the Archivist's: nobody else is sent it.
  assert.equal(room.view(TECH).nightMap, null);
});

test("every case's map shows exactly its contradictions about where someone (or something) was", () => {
  const expected: Record<string, string[]> = {
    "case-001": ["lab-chat+detail-halo", "lab-chat+dock-log", "question-rena-after+anpr", "question-squires-left+question-ozzy-round", "visitor-sheet+badge-log"],
    "case-002": ["question-vince-envelope+detail-envelope", "statement-vince+door-log"],
    "case-003": ["detail-plate-gold+house-rules", "question-ruth-nuts+storeroom-log"],
    "case-004": ["crack-otto-boiler+boiler-log", "door-log+detail-greta-counting", "door-log+front-desk", "question-lily-missing+boiler-log", "question-otto-midnight+detail-chair"],
  };
  for (const c of [case001, case002, case003, case004]) {
    assert.ok(c.nightMap, `${c.id} has no map of the night`);
    const room = createRoom({ code: "MAP", caseFile: c, host: { id: "p1", token: "t1", name: "A" }, mode: "together", now: 0 });
    const map = mapFor({ ...room, phase: "reveal", chapter: c.chapters.length }, c, { id: "p1", roles: ["archivist"] })!;
    assert.deepEqual([...new Set(map.clashes.map((k) => `${k.a}+${k.b}`))].sort(), [...expected[c.id]].sort(), `${c.id}'s map shows the wrong clashes`);
  }
});

test("every case is written picture-first: quoted contradictions, and a replay for every chapter proof", () => {
  for (const c of [case001, case002, case003, case004]) {
    for (const e of c.evidence) if (e.access.kind === "crosscheck") assert.ok(e.access.quotes, `${c.id}: ${e.id} doesn't quote its two pieces`);
    c.chapters.forEach((chapter, i) => {
      if (chapter.checkpoint) assert.ok(chapter.checkpoint.replay, `${c.id}: chapter ${i + 1}'s proof has no replay`);
    });
  }
});

// ---------------------------------------------------------------------------
// The world: each case's painted building has to agree with the case.

/** Case 001 with its world changed by `edit`, to see what the checks say. */
function brokenWorld(edit: (world: CaseWorld, caseFile: CaseFile) => void): string[] {
  const caseFile = structuredClone(case001);
  edit(caseFile.world!, caseFile);
  return checkWorld(caseFile);
}
const says = (problems: string[], text: string) => assert.ok(problems.some((p) => p.includes(text)), `expected "${text}" in ${JSON.stringify(problems)}`);

test("Case 001 has a complete, checked world, painted in files that exist", () => {
  const world = case001.world!;
  assert.ok(world, "Case 001 has a world");
  assert.deepEqual(checkWorld(case001), []);
  for (const layer of world.plate.layers) assert.ok(existsSync(`src/assets/world/case-001/${layer}`), layer);
  // Every room of the night is in it, and every suspect waits somewhere with a sore spot of their own.
  assert.deepEqual(case001.nightMap!.rooms.map((r) => r.id).filter((id) => !world.rooms.some((w) => w.id === id)), []);
  assert.deepEqual(Object.keys(world.people).sort(), case001.suspects.map((s) => s.id).sort());
  assert.deepEqual(Object.keys(world.soreSpots).sort(), case001.suspects.map((s) => s.id).sort());
  // The eight side jobs from the mockups, and a sore spot to win for every suspect.
  assert.equal(world.sideJobs.length, 8);
  assert.deepEqual(world.sideJobs.filter((j) => j.help === "sore-spot").map((j) => j.suspect).sort(), case001.suspects.map((s) => s.id).sort());
});

test("a world without a room of the night, or a sighting off the plan, doesn't check", () => {
  says(brokenWorld((w) => (w.rooms = w.rooms.filter((r) => r.id !== "kestrel"))), `room "kestrel" isn't in the world`);
  says(brokenWorld((w) => (w.rooms.find((r) => r.id === "outside")!.kind = "inside")), `"outside" is inside, but the map of the night has it outside`);
  says(brokenWorld((_, c) => c.nightMap!.sightings.push({ evidence: "badge-log", who: "square", room: "roof", at: "9:00 PM" })), `"roof", which isn't in the world`);
});

test("every record in the world has a spot, opened by its own role", () => {
  says(brokenWorld((w) => (w.spots.find((s) => s.id === "cabinet")!.evidence = ["asset-register"])), `"dock-log" has no spot`);
  says(brokenWorld((w) => (w.spots.find((s) => s.id === "laptop")!.roles = ["tech"])), `holds "lab-chat", but doesn't open for its role "archivist"`);
  says(brokenWorld((w) => (w.spots.find((s) => s.id === "anpr")!.x = 100)), `spot "anpr" isn't inside "outside"`);
  // A record can be somewhere else instead, but not both.
  says(brokenWorld((w) => (w.elsewhere!["dock-log"] = "on the dock")), `"dock-log" is both at a spot and elsewhere`);
  assert.deepEqual(brokenWorld((w) => {
    w.spots.find((s) => s.id === "cabinet")!.evidence = ["asset-register"];
    w.elsewhere!["dock-log"] = "the dock's own server";
  }), []);
});

test("every room in the building can be walked to, and links run from room to room", () => {
  says(brokenWorld((w) => (w.links = w.links.filter((l) => l.from !== "maker"))), `room "maker" can't be reached`);
  says(brokenWorld((w) => (w.links[0].path = [[600, 306], [460, 306]])), `doesn't start inside "lab4"`);
  says(brokenWorld((w) => w.links.push({ from: "lobby", to: "home", kind: "door", path: [[900, 6], [1000, 6]] })), "joins a room that isn't in the building");
  says(brokenWorld((w) => (w.rooms.find((r) => r.id === "lab4")!.box!.z0 = 310)), `"lab4" doesn't stand on its floor`);
  says(brokenWorld((w) => (w.rooms.find((r) => r.id === "maker")!.box!.x1 = 500)), `"maker" and "lobby" overlap`);
});

test("side jobs start at real spots, and every suspect has a sore spot, innocent ones too", () => {
  says(brokenWorld((w) => (w.sideJobs[0].spot = "nowhere")), `starts at "nowhere", which isn't a spot`);
  says(brokenWorld((w) => delete w.sideJobs.find((j) => j.id === "race-rena")!.suspect), `"race-rena" wins a sore spot, but names no suspect`);
  says(brokenWorld((w) => delete w.soreSpots.rectangle), `suspect "rectangle" has no sore spot`);
  says(brokenWorld((w) => (w.soreSpots.circle.about = ["a-made-up-clue"])), `comes from "a-made-up-clue", which doesn't exist`);
  says(brokenWorld((w) => delete w.people.square), `suspect "square" isn't anywhere in the world`);
  says(brokenWorld((w) => (w.people.circle.room = "lab4")), `suspect "circle" isn't inside "lab4"`);
});

test("the world scene draws the case's own building: its rooms and where its suspects stand", () => {
  const world = case001.world!;
  const plate = worldOf("case-001")!;
  assert.deepEqual(plate.extent, world.plate.extent);
  assert.deepEqual(plate.size, world.plate.size);
  assert.deepEqual(plate.rooms.map((r) => r.id), world.rooms.filter((r) => r.box).map((r) => r.id));
  for (const r of plate.rooms) assert.deepEqual({ x0: r.x0, x1: r.x1, z0: r.z0, z1: r.z1 }, world.rooms.find((w) => w.id === r.id)!.box);
  for (const p of plate.people.filter((p) => p.suspect)) assert.deepEqual({ x: p.x, z: p.z }, { x: world.people[p.suspect!].x, z: world.people[p.suspect!].z }, p.id);
});
