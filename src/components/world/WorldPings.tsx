"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { nameOf } from "@/components/game/context";
import type { PlayerView } from "@/lib/game/engine";
import { plateToScreen } from "@/lib/world/camera";
import { roomAt, toPlate } from "@/lib/world/geometry";
import type { WorldPlate } from "@/lib/world/plates";
import { PING_MS } from "@/lib/world/presence";
import type { Ping, WorldState } from "@/lib/world/store";
import { useWorld, useWorldStore } from "./useWorld";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** How close to the screen's side an off-screen ping is held, in CSS px. */
const EDGE = 48;

/**
 * Pings (W3.1): someone held a spot to say "look here". A ring pulses on it for a few seconds with their name, on
 * every phone, and the minimap shows it too. DOM placed from world coordinates, like the spots.
 */
export function WorldPings({ plate, view }: { plate: WorldPlate; view: PlayerView | null }) {
  const store = useWorldStore();
  const look = useWorld((s) => s.look);
  const pings = useWorld((s) => s.pings);
  const [now, setNow] = useState(() => Date.now());
  const nodes = useRef(new Map<string, HTMLDivElement>());
  const live = pings.filter((p) => now - p.at < PING_MS);
  const key = (p: Ping) => `${p.by}:${p.spot}:${p.at}`;

  // Re-render as pings run out.
  useEffect(() => {
    if (!live.length) return;
    const timer = window.setTimeout(() => setNow(Date.now()), 500);
    return () => window.clearTimeout(timer);
  }, [live.length, now]);
  useEffect(() => setNow(Date.now()), [pings]);

  useLayoutEffect(() => {
    const place = (s: WorldState) => {
      for (const p of s.pings) {
        const node = nodes.current.get(key(p));
        if (!node) continue;
        const at = toPlate(plate, p.x, p.z);
        const screen = plateToScreen(s.camera, s.viewport, at.x, at.y);
        // Off screen: held at the edge, pointing the way, so nobody misses it.
        const x = clamp(screen.x, EDGE, s.viewport.w - EDGE);
        const y = clamp(screen.y, 150, s.viewport.h - 200);
        const off = x !== screen.x || y !== screen.y;
        node.dataset.off = String(off);
        node.dataset.side = x < screen.x ? "right" : x > screen.x ? "left" : "mid";
        node.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
        const arrow = node.querySelector<HTMLElement>("[data-arrow]");
        if (arrow) arrow.style.transform = `rotate(${Math.atan2(screen.y - y, screen.x - x)}rad)`;
      }
    };
    place(store.getState());
    return store.subscribe((s, prev) => {
      if (s.camera !== prev.camera || s.viewport !== prev.viewport || s.pings !== prev.pings) place(s);
    });
  }, [store, plate, live.length]);

  if (!view || !live.length) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-live="polite">
      {live.map((p) => (
        <div
          key={key(p)}
          ref={(node) => {
            if (node) nodes.current.set(key(p), node);
            else nodes.current.delete(key(p));
          }}
          className="group absolute top-0 left-0 grid size-20 place-items-center will-change-transform"
        >
          <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full border-4 border-coral [animation-duration:1.2s] group-data-[off=true]:inset-5" />
          <span aria-hidden="true" className="absolute inset-4 rounded-full border-4 border-coral group-data-[off=true]:inset-6 group-data-[off=true]:bg-coral" />
          <span data-arrow aria-hidden="true" className="absolute inset-0 hidden items-center justify-end group-data-[off=true]:flex">
            <span className="mr-1 size-0 border-y-8 border-l-[12px] border-y-transparent border-l-coral" />
          </span>
          <button
            type="button"
            onClick={() => {
              const room = roomAt(plate, p.x, p.z);
              if (room) look({ kind: "room", id: room });
            }}
            className="pointer-events-auto absolute top-full left-1/2 mt-1 -translate-x-1/2 rounded-full group-data-[side=left]:left-0 group-data-[side=left]:translate-x-0 group-data-[side=right]:right-0 group-data-[side=right]:left-auto group-data-[side=right]:translate-x-0 border-2 border-ink bg-coral px-2 py-0.5 text-xs font-extrabold whitespace-nowrap text-cream shadow-pop-sm"
          >
            {p.note ?? (p.by === view.me.id ? "You pinged this" : `${nameOf(view, p.by)}: look here`)}
          </button>
        </div>
      ))}
    </div>
  );
}
