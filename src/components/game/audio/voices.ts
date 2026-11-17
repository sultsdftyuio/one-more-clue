"use client";

import { useEffect } from "react";
import { voiceKey } from "@/lib/game/voice";
import { VOICE_LINES } from "@/lib/voice-lines";
import { playVoice, stopVoice } from "./sound";

/** A line's recording: where it is and how long it runs. */
export type Recording = { src: string; ms: number };

/** The recording of a line, if it has one (see art/voices.py). Without one the game falls back to its blips. */
export function recordingOf(caseId: string, speaker: string, text: string): Recording | null {
  const key = voiceKey(speaker, text);
  const ms = VOICE_LINES[caseId]?.[key];
  return ms ? { src: `/voices/${caseId}/${key}.mp3`, ms } : null;
}

/** Milliseconds a letter, so the words finish typing as the recording does. */
export const paceOf = (recording: Recording, text: string) => Math.min(90, Math.max(14, recording.ms / Math.max(1, text.length)));

/** A typed line that may be spoken: the letter pace and the blip to use, with a recording or without. */
export function voiced(recording: Recording | null, text: string, blip?: () => void) {
  return recording ? { pace: paceOf(recording, text), onLetter: silent } : { pace: undefined, onLetter: blip };
}
const silent = () => undefined;

/**
 * Plays a line's recording while it's on screen, if this phone is the one that speaks (`loud`), and
 * stops it when it goes. A new `take` plays the same recording again, say when a suspect repeats themselves.
 */
export function useVoice(recording: Recording | null, loud: boolean, take?: string | number) {
  const src = recording?.src;
  useEffect(() => {
    if (!src || !loud) return;
    let current = true;
    void playVoice(src, () => current);
    return () => {
      current = false;
      stopVoice(src);
    };
  }, [src, loud, take]);
}
