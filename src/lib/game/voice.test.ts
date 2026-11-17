// Run with: npm test
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { case001 } from "../../data/cases/case-001.ts";
import { cases } from "../../data/cases/index.ts";
import { VOICE_LINES } from "../voice-lines.ts";
import { CONFESSES, NARRATOR, SHRUGS, speakerOf, voiceKey, voiceLinesOf } from "./voice.ts";

test("a line's key depends on who says it and their exact words, and nothing else", () => {
  assert.equal(voiceKey("circle", "And?"), voiceKey("circle", "And?  "), "spaces around the words don't count");
  assert.notEqual(voiceKey("circle", "And?"), voiceKey("square", "And?"), "two people saying the same thing need two recordings");
  assert.notEqual(voiceKey("circle", "And?"), voiceKey("circle", "And!"));
  assert.match(voiceKey(NARRATOR, "Priya was gone. HALO wasn't."), /^[0-9a-f]{8}$/);
});

test("a suspect is known by their id or their name; anyone else by their name", () => {
  assert.equal(speakerOf(case001, "circle"), "circle");
  assert.equal(speakerOf(case001, "Ozzy Reyes"), "circle");
  assert.equal(speakerOf(case001, "Mrs Dalloway's cat"), "mrs-dalloway-s-cat");
});

test("Case 001 speaks its answers, cracks, confrontation, confession and story, each line once", () => {
  const lines = voiceLinesOf(case001);
  assert.equal(new Set(lines.map((l) => l.key)).size, lines.length, "keys are unique");
  const said = (speaker: string, text: string) => lines.some((l) => l.speaker === speaker && l.text === text);
  assert.ok(said("circle", "9:17, on my round. Door wide open, key still in the lock. I called it in straight away."), "an interview answer");
  assert.ok(said("rectangle", case001.interrogation!.opening), "the confrontation opens");
  assert.ok(said("rectangle", CONFESSES), "the culprit owns up");
  assert.ok(said("triangle", "Three years of my life. In a tote bag."), "the confession");
  assert.ok(said(NARRATOR, "Priya was gone. HALO wasn't."), "the replay's closing line");
  for (const shrug of SHRUGS) assert.ok(said("square", shrug), `the professor can shrug "${shrug}"`);
  assert.ok(!lines.some((l) => case001.story.some((b) => "text" in b && b.text === l.text)), "a case with an opening film doesn't voice its briefing beats");
});

test("every recording the game lists is a line a case still says, and its file is there", () => {
  for (const [caseId, recorded] of Object.entries(VOICE_LINES)) {
    const caseFile = cases.find((c) => c.id === caseId);
    assert.ok(caseFile, `recordings for a case that doesn't exist: ${caseId}`);
    const current = new Set(voiceLinesOf(caseFile!).map((l) => l.key));
    for (const key of Object.keys(recorded)) {
      assert.ok(current.has(key), `${caseId}: ${key}.mp3 is for a line nobody says any more. Re-run art/voices.py keep ${caseId}.`);
      assert.ok(existsSync(`public/voices/${caseId}/${key}.mp3`), `${caseId}: ${key}.mp3 is listed but missing`);
    }
  }
});
