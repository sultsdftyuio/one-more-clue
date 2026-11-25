"use client";

import { useLayoutEffect, useRef } from "react";
import { plateToScreen } from "@/lib/world/camera";
import { toPlate } from "@/lib/world/geometry";
import type { WorldPlate } from "@/lib/world/plates";
import type { WorldState } from "@/lib/world/store";
import { useWorldStore } from "./useWorld";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Room names (W2.5), small labels at the top of each room. They show as the camera pulls back, just as the people's
 * name tags fade, so the whole building reads like a map; close up, the painted signs do the job. DOM text, moved
 * by a store subscription like the name tags.
 */
export function WorldRoomTags({ plate }: { plate: WorldPlate }) {
  const store = useWorldStore();
  const nodes = useRef(new Map<string, HTMLSpanElement>());

  useLayoutEffect(() => {
    const place = (s: WorldState) => {
      // The opposite of the name tags: full when zoomed out, gone by the close-up.
      const shown = s.viewport.w > 0 ? 1 - clamp((s.camera.zoom / s.range.closeUp - 0.45) / 0.2, 0, 1) : 0;
      for (const room of plate.rooms) {
        const node = nodes.current.get(room.id);
        if (!node) continue;
        const p = toPlate(plate, (room.x0 + room.x1) / 2, room.z1 - 12);
        const at = plateToScreen(s.camera, s.viewport, p.x, p.y);
        node.style.transform = `translate3d(${at.x.toFixed(1)}px, ${at.y.toFixed(1)}px, 0) translate(-50%, 0)`;
        node.style.opacity = String(shown);
      }
    };
    place(store.getState());
    return store.subscribe((s, prev) => {
      if (s.camera !== prev.camera || s.viewport !== prev.viewport || s.range !== prev.range) place(s);
    });
  }, [store, plate]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {plate.rooms.map((room) => (
        <span
          key={room.id}
          ref={(node) => {
            if (node) nodes.current.set(room.id, node);
            else nodes.current.delete(room.id);
          }}
          style={{ opacity: 0 }}
          className="absolute top-0 left-0 rounded-md bg-night/75 px-1.5 py-0.5 text-[11px] font-extrabold tracking-wider whitespace-nowrap text-cream uppercase will-change-transform"
        >
          {room.name}
        </span>
      ))}
    </div>
  );
}
