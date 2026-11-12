/**
 * The night in order. Every clock time in the evidence a player can read
 * becomes one moment on a line: a log row, a chat message, a frame of footage,
 * or a sentence someone said with a time in it. Nothing here knows the
 * solution; it only sorts what's already on the player's phone, so two pieces
 * that can't both be true end up next to each other.
 */
import type { VisibleEvidence } from "./engine";
import { sentencesOf } from "./lines.ts";

/** How a moment is known: a machine wrote it down, a person says so, or a camera or photo shows it. */
export type MomentKind = "record" | "said" | "seen";

export type Moment = {
  id: string;
  evidenceId: string;
  /** Minutes after midnight (with seconds as a fraction). */
  at: number;
  /** The time as the piece writes it. */
  time: string;
  text: string;
  kind: MomentKind;
  /** Who says it, for "said". */
  who?: string;
  /** A chat message that was changed after it was sent. */
  edited?: boolean;
};

const DAY = 24 * 60;
const CLOCK = /\b(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s?(am|pm))?\b/gi;

type Reading = { time: string; minutes: number; sure: boolean };

/**
 * Reads one written time. "9:17 PM" and "21:17" are sure; a bare "9:17" could
 * be morning or evening, so it comes back as the morning one, marked unsure.
 */
function read(match: RegExpMatchArray): Reading | null {
  const [time, h, m, s, half] = match;
  const hours = Number(h);
  const minutes = Number(m);
  const seconds = Number(s ?? 0);
  if (minutes > 59 || seconds > 59) return null;
  if (half) {
    if (hours < 1 || hours > 12) return null;
    return { time, minutes: ((hours % 12) + (half.toLowerCase() === "pm" ? 12 : 0)) * 60 + minutes + seconds / 60, sure: true };
  }
  if (hours > 23) return null;
  // "06:00", "00:20" and "13:02" are written on a 24-hour clock; "8:30" might not be.
  const sure = hours === 0 || hours > 12 || (h.length === 2 && h[0] === "0");
  return { time, minutes: (hours % 24) * 60 + minutes + seconds / 60, sure };
}

const NUMBERS = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const NUMBER = `(${NUMBERS.join("|")})`;
/** Times people say rather than write: "nine o'clock", "quarter to nine", "half past ten", "left at nine." */
const SPOKEN = [
  { pattern: new RegExp(`\\b(quarter|half)\\s+(past|to)\\s+${NUMBER}\\b`, "gi"), read: (m: RegExpMatchArray) => (m[1].toLowerCase() === "half" ? (m[2].toLowerCase() === "past" ? hour(m[3]) + 30 : null) : hour(m[3]) + (m[2].toLowerCase() === "past" ? 15 : -15)) },
  { pattern: new RegExp(`\\b${NUMBER}\\s+o['’]clock\\b`, "gi"), read: (m: RegExpMatchArray) => hour(m[1]) },
  // Only where the sentence stops after it, so "at nine tables" and "at one point" aren't times.
  { pattern: new RegExp(`\\bat\\s+${NUMBER}(?=\\s*(?:[.,;!?]|$))`, "gi"), read: (m: RegExpMatchArray) => hour(m[1]) },
];
const hour = (word: string) => (NUMBERS.indexOf(word.toLowerCase()) + 1) * 60;
const spell = (minutes: number) => `${Math.floor(minutes / 60) % 12 || 12}:${String(minutes % 60).padStart(2, "0")}`;

/** Every time a text gives, written or said. A said time shows as figures ("8:45") and never says which half of the day. */
function timesIn(text: string): (Reading & { raw: string })[] {
  const written = [...text.matchAll(CLOCK)].flatMap((m) => {
    const reading = read(m);
    return reading ? [{ ...reading, raw: m[0] }] : [];
  });
  const said = SPOKEN.flatMap(({ pattern, read: minutesOf }) =>
    [...text.matchAll(pattern)].flatMap((m) => {
      const minutes = minutesOf(m);
      return minutes === null ? [] : [{ time: spell(minutes), minutes: minutes % (DAY / 2), sure: false, raw: m[0] }];
    }),
  );
  return [...written, ...said];
}

/** The shorter way round the clock between two times. */
const apart = (a: number, b: number) => {
  const d = Math.abs(a - b) % DAY;
  return Math.min(d, DAY - d);
};

/** The sentence around a time, for long texts; short ones are kept whole. */
function around(text: string, time: string) {
  if (text.length <= 140) return text;
  const sentences = sentencesOf(text);
  return (time && sentences.find((s) => s.includes(time))) || sentences[0] || text;
}

/** `loose`: read out of a sentence, as opposed to a timestamp on a row, a message or a frame. */
type Draft = Omit<Moment, "id" | "at" | "time"> & Reading & { loose?: boolean };

/** A time in a sentence further than this from every other moment is left off the line. */
const STRAY_MINUTES = 180;

function draftsOf(e: VisibleEvidence): Draft[] {
  const b = e.body;
  const base = { evidenceId: e.id };
  const stamped = (time: string, rest: Omit<Draft, keyof Reading | "evidenceId">): Draft[] =>
    timesIn(time)
      .slice(0, 1)
      .map((r) => ({ ...base, ...rest, minutes: r.minutes, sure: r.sure, time }));
  const written = (text: string, rest: Omit<Draft, keyof Reading | "evidenceId" | "text">): Draft[] => {
    const seen = new Set<number>();
    const inText = timesIn(text).flatMap((r) => {
      if (seen.has(r.minutes)) return [];
      seen.add(r.minutes);
      return [{ ...base, ...rest, time: r.time, minutes: r.minutes, sure: r.sure, loose: true, text: around(text, r.raw) }];
    });
    if (inText.length) return inText;
    // Nothing in the words, but the title names the moment: "Ozzy: the 9:10 round".
    return timesIn(e.title)
      .slice(0, 1)
      .map((r) => ({ ...base, ...rest, time: r.time, minutes: r.minutes, sure: r.sure, loose: true, text: around(text, "") }));
  };

  switch (b.type) {
    case "log":
      return b.rows.flatMap((row) => stamped(row.time, { text: row.text, kind: "record" }));
    case "chat":
      return b.messages.flatMap((m) => stamped(m.time, { text: m.text, kind: "said", who: m.from, edited: m.edited }));
    case "recording":
      return b.segments.flatMap((s) => stamped(s.at, { text: s.text, kind: "record" }));
    case "footage":
      // Every frame shares the tape's caption, so each says which frame it is.
      return b.frames.flatMap((f, i) => stamped(f.time, { text: `Frame ${i + 1} of ${b.frames.length} · ${b.caption}`, kind: "seen" }));
    case "statement":
      return written(b.text, { kind: "said", who: b.speaker });
    case "document":
      return written(b.text, { kind: "record" });
    case "scene":
      return written(b.caption, { kind: "seen" });
    case "finding":
      // A contradiction only repeats the two pieces it compares, which are already on the line.
      return e.source === "crosscheck" ? [] : written(b.text, { kind: "seen" });
  }
}

/**
 * Every timed moment in these pieces, in the order the night went.
 *
 * A bare "9:17" is taken as whichever of morning or evening sits closer to a
 * time that's written in full; with none to go by, it's the one closest before
 * `start` (when the investigation begins, in minutes after midnight), and
 * failing that the evening. The line starts after the longest quiet stretch of
 * the day, so a night that runs past midnight stays in one piece.
 */
export function timelineOf(evidence: VisibleEvidence[], start?: number): Moment[] {
  const drafts = evidence.flatMap(draftsOf);
  const sure = drafts.filter((d) => d.sure).map((d) => d.minutes);

  const placed = drafts.map((d) => {
    if (d.sure) return d.minutes;
    const options = [d.minutes % DAY, (d.minutes + DAY / 2) % DAY];
    if (sure.length) {
      const nearest = (t: number) => Math.min(...sure.map((s) => apart(s, t)));
      return nearest(options[0]) <= nearest(options[1]) ? options[0] : options[1];
    }
    if (start !== undefined) {
      const before = (t: number) => (start - t + DAY) % DAY;
      return before(options[0]) <= before(options[1]) ? options[0] : options[1];
    }
    return Math.max(...options);
  });

  // A time in a sentence that sits hours from everything else is almost never part of the night:
  // a call timer on a phone screen ("Mo · 13:02"), an opening hour. Timestamps always stay.
  const stray = (i: number) => drafts[i].loose && drafts.length > 1 && !placed.some((at, j) => j !== i && apart(at, placed[i]) <= STRAY_MINUTES);
  const moments = drafts.flatMap((d, i): Moment[] =>
    stray(i) ? [] : [{ id: `${d.evidenceId}:${i}`, evidenceId: d.evidenceId, at: placed[i], time: d.time, text: d.text, kind: d.kind, who: d.who, edited: d.edited }],
  );

  // Where the line begins: right after the widest gap round the clock.
  const sorted = [...new Set(moments.map((m) => m.at))].sort((a, b) => a - b);
  let origin = sorted[0] ?? 0;
  let widest = -1;
  sorted.forEach((t, i) => {
    const previous = sorted[(i - 1 + sorted.length) % sorted.length];
    const gap = (t - previous + DAY) % DAY || DAY;
    if (gap > widest) {
      widest = gap;
      origin = t;
    }
  });
  const along = (t: number) => (t - origin + DAY) % DAY;

  return moments.sort((a, b) => along(a.at) - along(b.at));
}

/** Minutes from one moment to a later one, going forward round the clock. */
export const minutesBetween = (earlier: Moment, later: Moment) => (later.at - earlier.at + DAY) % DAY;
