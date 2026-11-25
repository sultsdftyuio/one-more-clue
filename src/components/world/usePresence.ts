"use client";

import { useEffect, useRef } from "react";
import type { PlayerView } from "@/lib/game/engine";
import { LiveKitTransport } from "@/lib/presence/livekit-transport";
import { roomAt } from "@/lib/world/geometry";
import type { WorldPlate } from "@/lib/world/plates";
import { retryDelay, WorldPresence } from "@/lib/world/presence";
import type { WorldStore } from "@/lib/world/store";

/**
 * Keeps this phone on the world's live presence channel (W3.1, W3.2) while the world screen is open, and starts again
 * after a lost connection, waiting longer each time. LiveKit handles short drops itself ("reconnecting"); this is for
 * when it gives up. Returns a ref to the live connection, for status changes and pings.
 */
export function usePresence({
  code,
  store,
  plate,
  view,
  stickers,
}: {
  code: string;
  store: WorldStore;
  plate: WorldPlate | null;
  view: PlayerView | null;
  /** The detective each player wears, by player id. */
  stickers: Record<string, string>;
}) {
  const presence = useRef<WorldPresence | null>(null);
  const stickersRef = useRef(stickers);
  stickersRef.current = stickers;
  const me = view ? { id: view.me.id, name: view.me.name } : null;
  const meKey = me ? `${me.id}:${me.name}` : null;

  useEffect(() => {
    if (!me || !plate) return;
    let stopped = false;
    let attempt = 0;
    let timer = 0;
    const startOnce = () => {
      if (stopped) return;
      const live = new WorldPresence({
        transport: new LiveKitTransport({ passUrl: `/api/rooms/${code}/presence` }),
        store,
        me,
        stickerOf: (playerId) => stickersRef.current[playerId] ?? null,
        roomAt: (x, z) => roomAt(plate, x, z) ?? "outside",
        now: () => performance.now(),
        whereAmI: () => {
          const s = store.getState();
          const sticker = s.me;
          const person = plate.people.find((p) => p.id === sticker);
          return (sticker && s.positions[sticker]) || (person ? { x: person.x, z: person.z } : { x: 0, z: 0 });
        },
      });
      presence.current = live;
      void live.start();
    };
    // Lost for good (not just reconnecting): try again later, a little longer each time.
    const unsubscribe = store.subscribe((s, prev) => {
      if (s.presence === prev.presence) return;
      if (s.presence === "live") attempt = 0;
      if (s.presence !== "lost" || stopped) return;
      const dead = presence.current;
      presence.current = null;
      void dead?.stop();
      window.clearTimeout(timer);
      timer = window.setTimeout(startOnce, retryDelay(attempt++));
    });
    startOnce();
    return () => {
      stopped = true;
      unsubscribe();
      window.clearTimeout(timer);
      void presence.current?.stop();
      presence.current = null;
      store.getState().setPresence("off");
    };
    // `me` changes identity every render; its key doesn't.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, store, plate, meKey]);

  return presence;
}
