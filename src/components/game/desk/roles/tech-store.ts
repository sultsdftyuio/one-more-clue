"use client";

import { useSyncExternalStore } from "react";

/**
 * What the Tech's computer is doing, shared with the rest of the room: the
 * search being typed, and whether words in evidence can be tapped into it.
 * Words are tapped on cards and pop-ups far from the computer itself, so this
 * lives outside any one component.
 */
type TechDesk = { tapping: boolean; query: string };

let desk: TechDesk = { tapping: false, query: "" };
const listeners = new Set<() => void>();

function set(next: Partial<TechDesk>) {
  desk = { ...desk, ...next };
  listeners.forEach((l) => l());
}

export const setTapping = (tapping: boolean) => set({ tapping });
export const setQuery = (query: string) => set({ query: query.slice(0, 40) });

/** Adds a tapped word to the end of the search, unless it's already the last word. */
export function addWord(word: string) {
  const words = desk.query.trim().split(/\s+/).filter(Boolean);
  if (words.at(-1)?.toLowerCase() === word.toLowerCase()) return;
  setQuery([...words, word].join(" "));
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useTechDesk() {
  return useSyncExternalStore(
    subscribe,
    () => desk,
    () => desk,
  );
}
