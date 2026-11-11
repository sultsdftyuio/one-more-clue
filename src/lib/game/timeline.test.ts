// Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { cases } from "../../data/cases/index.ts";
import type { VisibleEvidence } from "./engine.ts";
import { minutesBetween, timelineOf } from "./timeline.ts";
import type { EvidenceBody } from "./types.ts";

let n = 0;
const piece = (body: EvidenceBody, source: VisibleEvidence["source"] = "desk"): VisibleEvidence => ({
  id: `e${++n}`,
  role: "tech",
  chapter: 1,
  title: `Piece ${n}`,
  body,
  source,
  pinned: false,
  mine: true,
});

const times = (evidence: VisibleEvidence[], start?: number) => timelineOf(evidence, start).map((m) => m.time);

test("log rows, chat messages and statements line up in the order the night went", () => {
  const line = timelineOf([
    piece({ type: "statement", speaker: "Ozzy Reyes", text: "9:17, on my round. Door wide open." }, "interview"),
    piece({ type: "log", source: "Dock", rows: [{ time: "8:38 PM", text: "placed on dock" }, { time: "9:13 PM", text: "lifted off dock" }] }),
    piece({ type: "chat", title: "Lab", messages: [{ from: "Priya", time: "8:40 PM", text: "Taking HALO home", edited: true }] }),
  ]);
  assert.deepEqual(
    line.map((m) => [m.time, m.kind, m.who]),
    [
      ["8:38 PM", "record", undefined],
      ["8:40 PM", "said", "Priya"],
      ["9:13 PM", "record", undefined],
      ["9:17", "said", "Ozzy Reyes"],
    ],
  );
  assert.equal(line[1].edited, true);
  assert.equal(minutesBetween(line[1], line[2]), 33);
});

test("a night that runs past midnight stays in one piece", () => {
  const log = piece({ type: "log", source: "Desk", rows: [{ time: "12:02 AM", text: "back on air" }, { time: "11:57 PM", text: "dead air" }, { time: "11:30 PM", text: "show starts" }] });
  assert.deepEqual(times([log]), ["11:30 PM", "11:57 PM", "12:02 AM"]);
  const line = timelineOf([log]);
  assert.equal(minutesBetween(line[1], line[2]), 5);
});

test("a bare time takes the half of the day its neighbours are in", () => {
  const evening = piece({ type: "log", source: "Door", rows: [{ time: "9:02 PM", text: "out" }] });
  const said = piece({ type: "statement", speaker: "A", text: "I left at 9:10 and not before." });
  assert.deepEqual(times([said, evening]), ["9:02 PM", "9:10"]);
  // The same words in a morning case land in the morning.
  const morning = piece({ type: "log", source: "Door", rows: [{ time: "9:02 AM", text: "out" }] });
  assert.equal(timelineOf([said, morning])[1].at, 9 * 60 + 10);
});

test("with nothing written in full, a bare time is the one before the investigation starts", () => {
  const said = piece({ type: "statement", speaker: "A", text: "It was 9:17 when I found it." });
  assert.equal(timelineOf([said], 0)[0].at, 21 * 60 + 17);
  assert.equal(timelineOf([said], 12 * 60)[0].at, 9 * 60 + 17);
  assert.equal(timelineOf([said])[0].at, 21 * 60 + 17);
});

test("24-hour times, seconds and tape recordings are read", () => {
  const tape = piece({ type: "recording", caption: "Recorder", segments: [{ at: "11:57:30", text: "chair creaks", sound: "creak" }, { at: "11:58:02", text: "click", sound: "click" }] });
  const late = piece({ type: "document", text: "Lights out at 23:58. Power back at 00:20." });
  assert.deepEqual(times([late, tape]), ["11:57:30", "23:58", "11:58:02", "00:20"]);
});

test("a contradiction adds nothing: it only repeats the pieces it compares", () => {
  const clash = piece({ type: "finding", text: "The chat says 8:40. The dock says 9:13." }, "crosscheck");
  const detail = piece({ type: "finding", text: "The wall clock reads 8:58." }, "inspect");
  assert.deepEqual(times([clash, detail]), ["8:58"]);
});

test("pieces without a time, and things that only look like times, stay off the line", () => {
  assert.deepEqual(times([piece({ type: "document", text: "Badge V-117, ratio 3:1, room 25:99." }), piece({ type: "statement", speaker: "A", text: "Nine o'clock, more or less." })]), []);
});

test("every case's own evidence builds a line that fits inside one day", () => {
  for (const caseFile of cases) {
    const all = caseFile.evidence.map(({ access, ...e }): VisibleEvidence => ({ ...e, source: access.kind, pinned: true, mine: false }));
    const line = timelineOf(all);
    assert.ok(line.length > 5, `${caseFile.id} has a timeline`);
    // The whole story of a case fits in one day, so the line never needs more than a day from end to end.
    assert.ok(minutesBetween(line[0], line.at(-1)!) < 24 * 60);
  }
});
