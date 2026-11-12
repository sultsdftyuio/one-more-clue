// Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { cases } from "../../data/cases/index.ts";
import { linesOf, sentencesOf } from "./lines.ts";

test("a statement splits into its sentences, and pauses and titles don't break one in two", () => {
  assert.deepEqual(sentencesOf("Yes, charging on the bench. I always do. I... didn't lock it. I never lock it."), [
    "Yes, charging on the bench.",
    "I always do.",
    "I... didn't lock it.",
    "I never lock it.",
  ]);
  assert.deepEqual(sentencesOf("Nine o'clock. Ms. Voss and I walked out together, naturally. Ask Prof. Squires."), [
    "Nine o'clock.",
    "Ms. Voss and I walked out together, naturally.",
    "Ask Prof. Squires.",
  ]);
  assert.deepEqual(sentencesOf("The wall clock reads 8:58. Posted at 9:05, but taken seven minutes earlier."), ["The wall clock reads 8:58.", "Posted at 9:05, but taken seven minutes earlier."]);
  assert.deepEqual(sentencesOf("He said 'Never.' Then he left!"), ["He said 'Never.'", "Then he left!"]);
});

test("logs, chats and tapes give one line a row, with its time", () => {
  assert.deepEqual(linesOf({ type: "log", source: "Dock", rows: [{ time: "8:38 PM", text: "placed on dock" }, { time: "9:13 PM", text: "lifted off dock" }] }), ["8:38 PM · placed on dock", "9:13 PM · lifted off dock"]);
  assert.deepEqual(linesOf({ type: "chat", title: "Lab", messages: [{ from: "Priya", time: "8:40 PM", text: "Taking HALO home" }] }), ["Priya, 8:40 PM: Taking HALO home"]);
  assert.deepEqual(linesOf({ type: "recording", caption: "Tape", segments: [{ at: "11:58:02", text: "Click.", sound: "click" }] }), ["11:58:02 · Click."]);
  assert.deepEqual(linesOf({ type: "scene", caption: "The lab at night", look: "lab", items: [] }), ["The lab at night"]);
});

test("every piece in every case has at least one line, and no empty ones", () => {
  for (const caseFile of cases) {
    for (const e of caseFile.evidence) {
      const lines = linesOf(e.body);
      assert.ok(lines.length > 0, `${caseFile.id}/${e.id} has a line`);
      assert.ok(lines.every((l) => l.trim().length > 0), `${caseFile.id}/${e.id} has no empty line`);
    }
  }
});
