/**
 * The story clock: the night the team has to crack the case in. Every paid
 * move spends some of it: a wrong answer a lot, a question a little, and a
 * wasted shot, compare, password or accusation a little less. When the night
 * runs out, the case is lost.
 *
 * Costs are shares of the night, so a case set over two hours and one set over
 * nine feel the same. Each case shows them in its own minutes.
 */
import type { CaseFile, Deadline, RoomState } from "./types";

export type Spend = "wrong" | "question" | "miss";

/** Thousandths of the night each move costs. */
export const COST: Record<Spend, number> = { wrong: 250, question: 50, miss: 20 };

/** Below this share of the night, the clock warns that a mistake could end the case. */
export const LOW_NIGHT = 0.2;

const DAY = 24 * 60;

/** "9:17 PM", "12:30 AM", "Midnight", "23:30" → minutes after midnight. */
export function parseTime(text: string): number {
  const t = text.trim().toLowerCase();
  if (t === "midnight") return 0;
  if (t === "noon" || t === "midday") return 12 * 60;
  const m = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) throw new Error(`Can't read the time "${text}"`);
  const hours = Number(m[1]);
  const minutes = Number(m[2] ?? 0);
  if (minutes > 59 || (m[3] ? hours < 1 || hours > 12 : hours > 23)) throw new Error(`Can't read the time "${text}"`);
  const h = m[3] ? (hours % 12) + (m[3] === "pm" ? 12 : 0) : hours;
  return h * 60 + minutes;
}

/** Writes a time the way the case writes its own: "6:45 AM" for a 12-hour case, "06:45" for a 24-hour one. */
export function formatTime(minutes: number, like: string): string {
  const m = ((Math.round(minutes) % DAY) + DAY) % DAY;
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, "0");
  const twelveHour = /am|pm|midnight|noon|midday/i.test(like);
  if (!twelveHour) return `${String(h).padStart(2, "0")}:${mm}`;
  return `${h % 12 || 12}:${mm} ${h < 12 ? "AM" : "PM"}`;
}

/** How long the night is, in minutes. A deadline at the same time the next day is a full day. */
export function nightMinutes(deadline: Deadline) {
  return (parseTime(deadline.end) - parseTime(deadline.start) + DAY) % DAY || DAY;
}

/** What a move costs in this case's own minutes, never less than one. */
export function costMinutes(deadline: Deadline, kind: Spend) {
  return Math.max(1, Math.round((nightMinutes(deadline) * COST[kind]) / 1000));
}

/** "2 h 15 min", "45 min", "1 h". */
export function formatSpan(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Minutes spent so far. Rooms from before the clock only knew their wrong answers. */
export function spentMinutes(state: Pick<RoomState, "clockSpent" | "wrongAnswers">, caseFile: CaseFile) {
  if (!caseFile.deadline) return 0;
  return state.clockSpent ?? state.wrongAnswers * costMinutes(caseFile.deadline, "wrong");
}

/** The share of the night still left, from 1 down to 0. Without a deadline the night never runs out. */
export function nightLeft(state: Pick<RoomState, "clockSpent" | "wrongAnswers">, caseFile: CaseFile) {
  if (!caseFile.deadline) return 1;
  return Math.max(0, 1 - spentMinutes(state, caseFile) / nightMinutes(caseFile.deadline));
}

/** The time on the story's clock right now. */
export function clockTime(state: Pick<RoomState, "clockSpent" | "wrongAnswers">, caseFile: CaseFile) {
  const deadline = caseFile.deadline;
  if (!deadline) return null;
  const spent = Math.min(spentMinutes(state, caseFile), nightMinutes(deadline));
  return formatTime(parseTime(deadline.start) + spent, deadline.start);
}
