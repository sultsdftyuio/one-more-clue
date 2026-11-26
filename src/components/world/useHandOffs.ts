"use client";

import { useEffect, useRef } from "react";
import { play } from "@/components/game/audio/sound";
import { nameOf } from "@/components/game/context";
import type { PlayerView } from "@/lib/game/engine";
import type { WorldStore } from "@/lib/world/store";

/**
 * Hand-offs made physical (W5.5): when a teammate's find opens something new for one of your roles at a spot (the
 * laptop's log once Priya has been asked about it), that spot gets a ping on your phone saying whose find it was,
 * besides the "New" badge it now wears. The first view after loading only remembers what's already fresh.
 */
export function useHandOffs(store: WorldStore, view: PlayerView | null) {
  const known = useRef<Set<string> | null>(null);
  const fresh = view?.spots.filter((s) => s.fresh).map((s) => s.id).join("|") ?? "";
  useEffect(() => {
    if (!view || view.phase !== "investigation") return;
    const now = new Set(fresh ? fresh.split("|") : []);
    if (!known.current) {
      known.current = now;
      return;
    }
    const opened = [...now].filter((id) => !known.current!.has(id));
    known.current = now;
    if (!opened.length) return;
    const lead = view.leads.at(-1);
    const from = lead && lead.by !== view.me.id ? `${nameOf(view, lead.by)}'s find` : "A find";
    play("message");
    for (const id of opened) {
      const spot = view.spots.find((s) => s.id === id);
      if (spot) store.getState().addPing({ by: `lead-${id}`, spot: id, x: spot.x, z: spot.z, at: Date.now(), note: `${from}: new at ${spot.name}` });
    }
    // `fresh` stands in for the spots this reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fresh, store]);
}
