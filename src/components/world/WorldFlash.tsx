"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { play } from "@/components/game/audio/sound";
import type { WorldPlate } from "@/lib/world/plates";
import { coverRoom } from "./overRoom";
import { useWorld, useWorldStore } from "./useWorld";

/** How long a flash lights its room. */
export const FLASH_MS = 1400;

/**
 * The Photographer's flash (W5.1), on every phone: the room it went off in floods white and fades, so even the dark
 * maker space shows for a moment. It's light, not a clue: nothing new is found by it, and with reduced motion it's a
 * short, soft glow instead of a burst.
 */
export function WorldFlash({ plate }: { plate: WorldPlate }) {
  const store = useWorldStore();
  const flash = useWorld((s) => s.flash);
  const node = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!flash || Date.now() - flash.at > FLASH_MS) return;
    setLive(true);
    play("shutter");
    const timer = window.setTimeout(() => setLive(false), FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [flash]);

  useLayoutEffect(() => {
    if (!live || !flash || !node.current) return;
    const el = node.current;
    coverRoom(el, plate, store.getState(), flash.room);
    return store.subscribe((s, prev) => {
      if (s.camera !== prev.camera || s.viewport !== prev.viewport) coverRoom(el, plate, s, flash.room);
    });
  }, [live, flash, plate, store]);

  if (!live || !flash) return null;
  return (
    <div
      ref={node}
      key={flash.at}
      aria-hidden="true"
      className="world-flash pointer-events-none absolute top-0 left-0 rounded-sm mix-blend-screen will-change-transform"
      style={{ visibility: "hidden" }}
    />
  );
}
