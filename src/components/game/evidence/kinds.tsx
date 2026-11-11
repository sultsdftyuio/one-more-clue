import type { VisibleEvidence } from "@/lib/game/engine";
import type { CaseSuspect } from "@/lib/game/types";
import { cx } from "@/lib/cx";
import { SuspectPortrait } from "../parts";
import type { IconName } from "../ui/Icon";

/** What a piece is, in a word, so nobody has to work it out from its paper. */
export function kindOf(e: VisibleEvidence): { label: string; icon: IconName } {
  switch (e.body.type) {
    case "statement":
      return e.source === "press" ? { label: "Cracked", icon: "mic" } : e.source === "interview" ? { label: "Interview", icon: "mic" } : { label: "Statement", icon: "mic" };
    case "chat":
      return { label: "Chat", icon: "chat" };
    case "log":
      return { label: "Log", icon: "clock" };
    case "document":
      return { label: "Document", icon: "file" };
    case "scene":
      return { label: "Photo", icon: "camera" };
    case "footage":
      return { label: "Camera footage", icon: "camera" };
    case "recording":
      return { label: "Recording", icon: "speaker" };
    case "finding":
      return e.source === "crosscheck" ? { label: "Contradiction", icon: "scale" } : e.source === "inspect" ? { label: "Spotted detail", icon: "eye" } : { label: "Note", icon: "note" };
  }
}

/**
 * A suspect's face in a square frame. The characters are drawn full length on a
 * 5:7 sheet with their feet at the bottom, so this shows the middle of the
 * sheet, where every one of them has their face.
 */
export function Face({ suspect, mood, className }: { suspect: CaseSuspect; mood?: "idle" | "nervous" | "cracked"; className?: string }) {
  return (
    <span className={cx("relative block shrink-0 overflow-hidden", className)}>
      <SuspectPortrait suspect={suspect} mood={mood} className="absolute top-[-41.67%] left-[-16.67%] w-[133.34%] max-w-none" />
    </span>
  );
}

const TITLES = new Set(["prof", "prof.", "dr", "dr.", "mr", "mr.", "mrs", "mrs.", "ms", "ms.", "chef", "sir", "lady"]);

/** The parts of a suspect's name people actually use: "Prof. Edmund Squires" is "Edmund" and "Squires". */
const nameWords = (suspect: CaseSuspect) => suspect.name.split(/\s+/).filter((w) => w.length >= 3 && !TITLES.has(w.toLowerCase()));

/** What to call a suspect on a small chip: the professor is "Squires", Priya Tran is "Priya". */
export function shortName(suspect: CaseSuspect) {
  const words = nameWords(suspect);
  const titled = TITLES.has(suspect.name.split(/\s+/)[0].toLowerCase());
  return (titled ? words.at(-1) : words[0]) ?? suspect.name;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Suspects a text names, by any part of their name. */
export const namedIn = (text: string, suspects: CaseSuspect[]) =>
  suspects.filter((s) => nameWords(s).some((w) => new RegExp(`(?<!\\p{L})${escape(w)}(?!\\p{L})`, "iu").test(text)));
