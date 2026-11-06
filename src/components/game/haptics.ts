"use client";

/**
 * A short buzz in the hand for the big moments: a shot landing, a story
 * cracking, a string snapping tight. Android phones vibrate; iPhones don't let
 * web pages, so there the feel comes from sound and animation. Nothing buzzes
 * for anyone who has asked their phone for less motion.
 */
export function buzz(pattern: number | readonly number[]) {
  try {
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    navigator.vibrate(typeof pattern === "number" ? pattern : [...pattern]);
  } catch {}
}

/** The patterns, so every role's moments feel like the same game. */
export const BUZZ = {
  tap: 8,
  hit: [12, 40, 24],
  miss: 30,
  crack: [20, 30, 60],
  snap: [6, 20, 40],
  granted: [10, 30, 10, 30, 40],
} as const;
