/**
 * A piece of evidence as the lines someone could point at: a log row, a chat
 * message, a moment on a tape, a sentence. Players highlight one of them for
 * the whole team ("this is the line that matters").
 */
import type { EvidenceBody } from "./types";

/** A full stop after one of these doesn't end a sentence: "Prof. Squires", "Ms. Voss". */
const SHORT = /(?:^|\s)(?:prof|dr|mr|mrs|ms|st|no|vs)\.$/i;

/** A text as its sentences. A pause ("I... didn't lock it") and a title ("Prof. Squires") stay in one piece. */
export function sentencesOf(text: string): string[] {
  const parts = text.trim().split(/(?<=[.!?…]["”'’]?)\s+(?=["“'‘(]?[A-Z0-9])/);
  const sentences: string[] = [];
  for (const part of parts) {
    const last = sentences.at(-1);
    if (last !== undefined && SHORT.test(last)) sentences[sentences.length - 1] = `${last} ${part}`;
    else if (part) sentences.push(part);
  }
  return sentences;
}

export function linesOf(body: EvidenceBody): string[] {
  switch (body.type) {
    case "log":
      return body.rows.map((r) => `${r.time} · ${r.text}`);
    case "chat":
      return body.messages.map((m) => `${m.from}, ${m.time}: ${m.text}`);
    case "recording":
      return body.segments.map((s) => `${s.at} · ${s.text}`);
    case "statement":
    case "document":
    case "finding":
      return sentencesOf(body.text);
    case "scene":
    case "footage":
      return [body.caption];
  }
}
