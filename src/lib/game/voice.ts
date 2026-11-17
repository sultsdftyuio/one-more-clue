/**
 * Spoken lines: which lines of a case are heard out loud, who says them, and the key each
 * recording is filed under. The key comes from who speaks and their exact words, so changing a
 * line means recording it again, and an old recording can never play under new words. The
 * recordings themselves are made by art/voices.py and listed in src/lib/voice-lines.ts.
 */
import type { Beat, CaseFile } from "./types";

/** The voice that tells the story between scenes, the same one as the opening films. */
export const NARRATOR = "narrator";

/** What the culprit says at the reveal, between their last caught lie and their confession. */
export const CONFESSES = "It was me.";

/** What a suspect says when the evidence put in front of them doesn't land, in turn. */
export const SHRUGS = ["And?", "Is that supposed to mean something?", "I don't see what that has to do with me.", "Very nice. Next question.", "You'll have to do better than that."];

export type VoiceLine = {
  key: string;
  /** A suspect's id, `narrator`, or a witness's name made into a slug. */
  speaker: string;
  text: string;
  /** Where the line is heard, for the casting sheet and the recording list. */
  where: string;
};

/** FNV-1a over the speaker and the words: short, stable, and the same in the browser, the server and the tools. */
export function voiceKey(speaker: string, text: string) {
  let hash = 0x811c9dc5;
  for (const ch of `${speaker}|${text.trim()}`) {
    hash ^= ch.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Who's speaking, as a voice: a suspect by id or by name, or anyone else by their name. */
export function speakerOf(caseFile: Pick<CaseFile, "suspects">, who: string) {
  const suspect = caseFile.suspects.find((s) => s.id === who || s.name === who);
  return suspect ? suspect.id : slug(who);
}

/** The voice for a story beat: a character's line, or the narrator's caption. Titles, texts and effects stay silent. */
export function beatVoice(caseFile: Pick<CaseFile, "suspects">, beat: Beat): { speaker: string; text: string } | null {
  if (beat.kind === "line") return { speaker: speakerOf(caseFile, beat.who), text: beat.text };
  if (beat.kind === "narration") return { speaker: NARRATOR, text: beat.text };
  return null;
}

/** Every line a case speaks, once each. The briefing beats only count for a case without an opening film. */
export function voiceLinesOf(caseFile: CaseFile): VoiceLine[] {
  const lines = new Map<string, VoiceLine>();
  const add = (speaker: string, text: string, where: string) => {
    const key = voiceKey(speaker, text);
    if (!lines.has(key)) lines.set(key, { key, speaker, text: text.trim(), where });
  };
  const beats = (list: Beat[], where: string) =>
    list.forEach((beat) => {
      const voice = beatVoice(caseFile, beat);
      if (voice) add(voice.speaker, voice.text, where);
    });

  if (!caseFile.cinematic) beats(caseFile.story, "the briefing");
  caseFile.chapters.forEach((chapter, i) => {
    if (i > 0) beats(chapter.story, `chapter ${i + 1} opening`);
    if (chapter.checkpoint?.replay?.say) add(NARRATOR, chapter.checkpoint.replay.say, `chapter ${i + 1} proved`);
  });
  const interviewed = new Set<string>();
  for (const e of caseFile.evidence) {
    if (e.body.type !== "statement" || (e.access.kind !== "interview" && e.access.kind !== "press")) continue;
    const speaker = speakerOf(caseFile, e.body.speaker);
    interviewed.add(speaker);
    add(speaker, e.body.text, e.access.kind === "interview" ? `asked: ${e.access.question}` : "cracking");
  }
  const room = caseFile.interrogation;
  if (room) {
    add(room.suspect, room.opening, "the confrontation");
    for (const claim of room.claims) {
      add(room.suspect, claim.text, "the confrontation");
      if (claim.lie) add(room.suspect, claim.lie.crack, "the confrontation, caught");
    }
    add(room.suspect, room.walkout, "the confrontation, walking out");
  }
  add(caseFile.solution.culprit, CONFESSES, "the confession");
  beats(caseFile.solution.confession, "the confession");
  for (const speaker of interviewed) for (const shrug of SHRUGS) add(speaker, shrug, "shrugging off evidence");
  return [...lines.values()];
}
