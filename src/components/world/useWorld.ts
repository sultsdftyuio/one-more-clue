"use client";

import { createContext, useContext } from "react";
import { useStore } from "zustand";
import type { WorldActions, WorldState, WorldStore } from "@/lib/world/store";

/** The world screen's store (src/lib/world/store.ts), one per screen. */
export const WorldContext = createContext<WorldStore | null>(null);

export function useWorldStore(): WorldStore {
  const store = useContext(WorldContext);
  if (!store) throw new Error("useWorld must be used inside the world screen.");
  return store;
}

/**
 * Reads one thing from the world store and re-renders when it changes. Pick small values (a
 * number, a flag, an id): the camera changes every frame while the picture moves, so components
 * that follow it should subscribe with `useWorldStore().subscribe` and move DOM nodes directly.
 */
export function useWorld<T>(selector: (state: WorldState & WorldActions) => T): T {
  return useStore(useWorldStore(), selector);
}
